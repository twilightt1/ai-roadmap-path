-- Authoritative, explicit completion state for local-first progress.
-- Legacy snapshot tables remain in place during the rollout window.

create table if not exists public.user_progress_sync (
  user_id uuid primary key references auth.users(id) on delete cascade,
  sync_epoch bigint not null default 0 check (sync_epoch >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_progress_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null check (scope in ('lesson', 'project_feature')),
  item_key text not null check (char_length(item_key) > 0),
  completed boolean not null,
  client_updated_at timestamptz not null,
  mutation_id uuid not null,
  sync_epoch bigint not null check (sync_epoch >= 0),
  server_updated_at timestamptz not null default now(),
  primary key (user_id, scope, item_key)
);

create index if not exists user_progress_items_user_completed_idx
  on public.user_progress_items (user_id, completed);

create table if not exists public.practice_events (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null,
  challenge_id text not null check (char_length(challenge_id) > 0),
  content_version text,
  origin text not null check (origin in ('anonymous', 'authenticated')),
  event_type text not null check (event_type in (
    'challenge_started', 'step_viewed', 'step_completed', 'run', 'submit',
    'hint_opened', 'walkthrough_opened', 'challenge_passed', 'transfer_passed'
  )),
  step text,
  hint_level smallint check (hint_level is null or hint_level between 0 and 3),
  passed boolean,
  occurred_at timestamptz not null,
  sync_epoch bigint not null check (sync_epoch >= 0),
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

create index if not exists practice_events_user_challenge_occurred_idx
  on public.practice_events (user_id, challenge_id, occurred_at desc);

-- Existing users need a sync row before browser clients begin calling the RPCs.
insert into public.user_progress_sync (user_id)
select user_id from public.user_progress_state
on conflict (user_id) do nothing;

-- Backfill only positive historical states. Legacy snapshots could not represent
-- explicit false values, so no synthetic unchecks are created.
insert into public.user_progress_items (
  user_id, scope, item_key, completed, client_updated_at, mutation_id, sync_epoch
)
select
  state.user_id,
  'lesson',
  lesson.item_key,
  true,
  coalesce(state.last_visit, state.updated_at, now()),
  ('00000000-0000-4000-8000-' || substr(md5(state.user_id::text || ':lesson:' || lesson.item_key), 1, 12))::uuid,
  0
from public.user_progress_state state
cross join lateral unnest(state.completed) as lesson(item_key)
on conflict (user_id, scope, item_key) do nothing;

insert into public.user_progress_items (
  user_id, scope, item_key, completed, client_updated_at, mutation_id, sync_epoch
)
select
  state.user_id,
  'project_feature',
  feature.item_key,
  true,
  coalesce(state.last_visit, state.updated_at, now()),
  ('00000000-0000-4000-8000-' || substr(md5(state.user_id::text || ':project_feature:' || feature.item_key), 1, 12))::uuid,
  0
from public.user_progress_state state
cross join lateral unnest(state.project_features) as feature(item_key)
on conflict (user_id, scope, item_key) do nothing;

create or replace function public.apply_progress_item_mutations(
  expected_epoch bigint,
  mutations jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  current_epoch bigint;
  acknowledged_ids jsonb := '[]'::jsonb;
  mutation jsonb;
  mutation_scope text;
  mutation_item_key text;
  mutation_completed boolean;
  mutation_updated_at timestamptz;
  mutation_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  if jsonb_typeof(mutations) <> 'array' then
    raise exception 'mutations must be an array';
  end if;

  insert into public.user_progress_sync (user_id)
  values (current_user_id)
  on conflict (user_id) do nothing;

  select sync_epoch into current_epoch
  from public.user_progress_sync
  where user_id = current_user_id
  for update;

  if expected_epoch <> current_epoch then
    raise exception 'progress epoch mismatch' using errcode = 'P0001';
  end if;

  for mutation in select value from jsonb_array_elements(mutations)
  loop
    mutation_scope := mutation ->> 'scope';
    mutation_item_key := mutation ->> 'item_key';
    mutation_completed := (mutation ->> 'completed')::boolean;
    mutation_updated_at := (mutation ->> 'client_updated_at')::timestamptz;
    mutation_id := (mutation ->> 'mutation_id')::uuid;

    if mutation_scope not in ('lesson', 'project_feature')
      or mutation_item_key is null or char_length(mutation_item_key) = 0
      or mutation_completed is null or mutation_updated_at is null or mutation_id is null then
      raise exception 'invalid progress mutation';
    end if;

    insert into public.user_progress_items (
      user_id, scope, item_key, completed, client_updated_at, mutation_id, sync_epoch
    ) values (
      current_user_id, mutation_scope, mutation_item_key, mutation_completed,
      mutation_updated_at, mutation_id, current_epoch
    )
    on conflict (user_id, scope, item_key) do update
    set
      completed = excluded.completed,
      client_updated_at = excluded.client_updated_at,
      mutation_id = excluded.mutation_id,
      sync_epoch = excluded.sync_epoch,
      server_updated_at = now()
    where (excluded.client_updated_at, excluded.mutation_id) >
      (public.user_progress_items.client_updated_at, public.user_progress_items.mutation_id);

    acknowledged_ids := acknowledged_ids || jsonb_build_array(mutation ->> 'mutation_id');
  end loop;

  update public.user_progress_sync set updated_at = now() where user_id = current_user_id;
  return jsonb_build_object('epoch', current_epoch, 'acknowledgedMutationIds', acknowledged_ids);
end;
$$;

create or replace function public.append_practice_events(
  expected_epoch bigint,
  events jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  current_epoch bigint;
  event jsonb;
  acknowledged_ids jsonb := '[]'::jsonb;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  if jsonb_typeof(events) <> 'array' then
    raise exception 'events must be an array';
  end if;

  insert into public.user_progress_sync (user_id)
  values (current_user_id)
  on conflict (user_id) do nothing;

  select sync_epoch into current_epoch
  from public.user_progress_sync
  where user_id = current_user_id
  for update;

  if expected_epoch <> current_epoch then
    raise exception 'progress epoch mismatch' using errcode = 'P0001';
  end if;

  for event in select value from jsonb_array_elements(events)
  loop
    insert into public.practice_events (
      user_id, event_id, challenge_id, content_version, origin, event_type,
      step, hint_level, passed, occurred_at, sync_epoch
    ) values (
      current_user_id,
      (event ->> 'event_id')::uuid,
      event ->> 'challenge_id',
      nullif(event ->> 'content_version', ''),
      event ->> 'origin',
      event ->> 'event_type',
      nullif(event ->> 'step', ''),
      nullif(event ->> 'hint_level', '')::smallint,
      nullif(event ->> 'passed', '')::boolean,
      (event ->> 'occurred_at')::timestamptz,
      current_epoch
    ) on conflict (user_id, event_id) do nothing;

    acknowledged_ids := acknowledged_ids || jsonb_build_array(event ->> 'event_id');
  end loop;

  return jsonb_build_object('epoch', current_epoch, 'acknowledgedEventIds', acknowledged_ids);
end;
$$;

create or replace function public.reset_learning_progress(expected_epoch bigint)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  next_epoch bigint;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  insert into public.user_progress_sync (user_id)
  values (current_user_id)
  on conflict (user_id) do nothing;

  update public.user_progress_sync
  set sync_epoch = sync_epoch + 1, updated_at = now()
  where user_id = current_user_id and sync_epoch = expected_epoch
  returning sync_epoch into next_epoch;

  if next_epoch is null then
    raise exception 'progress epoch mismatch' using errcode = 'P0001';
  end if;

  delete from public.user_progress_items where user_id = current_user_id;
  delete from public.practice_events where user_id = current_user_id;
  delete from public.lesson_progress where user_id = current_user_id;
  delete from public.topic_progress where user_id = current_user_id;
  delete from public.project_feature_progress where user_id = current_user_id;
  delete from public.quiz_attempts where user_id = current_user_id;
  delete from public.challenge_attempts where user_id = current_user_id;
  delete from public.user_progress_state where user_id = current_user_id;

  return jsonb_build_object('epoch', next_epoch);
end;
$$;

alter table public.user_progress_sync enable row level security;
alter table public.user_progress_items enable row level security;
alter table public.practice_events enable row level security;

create policy "Users can read own progress sync" on public.user_progress_sync
  for select using (auth.uid() = user_id);
create policy "Users can read own progress items" on public.user_progress_items
  for select using (auth.uid() = user_id);
create policy "Users can read own practice events" on public.practice_events
  for select using (auth.uid() = user_id);

revoke all on function public.apply_progress_item_mutations(bigint, jsonb) from public, anon;
revoke all on function public.append_practice_events(bigint, jsonb) from public, anon;
revoke all on function public.reset_learning_progress(bigint) from public, anon;
grant execute on function public.apply_progress_item_mutations(bigint, jsonb) to authenticated;
grant execute on function public.append_practice_events(bigint, jsonb) to authenticated;
grant execute on function public.reset_learning_progress(bigint) to authenticated;
