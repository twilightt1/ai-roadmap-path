-- P0 Phase 3 Task 5: validate untrusted RPC payloads before casts, keep the
-- legacy snapshot projected from canonical rows, and retain it after a reset.
-- This migration is intentionally additive; P3-T6 runs it against disposable
-- local Supabase services and exercises ownership/RLS behavior there.

-- Keep the sync row's timestamp consistent with the rest of the legacy tables.
drop trigger if exists user_progress_sync_set_updated_at on public.user_progress_sync;
create trigger user_progress_sync_set_updated_at
before update on public.user_progress_sync
for each row execute function public.set_updated_at();

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
  if jsonb_typeof(mutations) <> 'array' or jsonb_array_length(mutations) > 100 then
    raise exception 'mutations must be an array of at most 100 entries';
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
    -- Validate all values while they are JSON/text. Do not cast attacker input
    -- until required fields, enum values, and bounded textual forms are known.
    if jsonb_typeof(mutation) <> 'object'
      or jsonb_typeof(mutation -> 'scope') <> 'string'
      or mutation ->> 'scope' not in ('lesson', 'project_feature')
      or jsonb_typeof(mutation -> 'item_key') <> 'string'
      or char_length(mutation ->> 'item_key') not between 1 and 500
      or jsonb_typeof(mutation -> 'completed') <> 'boolean'
      or jsonb_typeof(mutation -> 'client_updated_at') <> 'string'
      or mutation ->> 'client_updated_at' !~ '^\d{4}-\d{2}-\d{2}T'
      or jsonb_typeof(mutation -> 'mutation_id') <> 'string'
      or mutation ->> 'mutation_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then
      raise exception 'invalid progress mutation';
    end if;

    begin
      mutation_updated_at := (mutation ->> 'client_updated_at')::timestamptz;
      mutation_id := (mutation ->> 'mutation_id')::uuid;
    exception when invalid_datetime_format or datetime_field_overflow or invalid_text_representation then
      raise exception 'invalid progress mutation';
    end;
    if mutation_updated_at > now() + interval '24 hours' then
      raise exception 'invalid progress mutation';
    end if;

    mutation_scope := mutation ->> 'scope';
    mutation_item_key := mutation ->> 'item_key';
    mutation_completed := (mutation ->> 'completed')::boolean;

    insert into public.user_progress_items (
      user_id, scope, item_key, completed, client_updated_at, mutation_id, sync_epoch
    ) values (
      current_user_id, mutation_scope, mutation_item_key, mutation_completed,
      mutation_updated_at, mutation_id, current_epoch
    )
    on conflict (user_id, scope, item_key) do update
    set completed = excluded.completed,
        client_updated_at = excluded.client_updated_at,
        mutation_id = excluded.mutation_id,
        sync_epoch = excluded.sync_epoch,
        server_updated_at = now()
    where (excluded.client_updated_at, excluded.mutation_id) >
      (public.user_progress_items.client_updated_at, public.user_progress_items.mutation_id);

    acknowledged_ids := acknowledged_ids || jsonb_build_array(mutation ->> 'mutation_id');
  end loop;

  -- Compatibility readers still use user_progress_state. Its completion arrays
  -- are always regenerated from canonical item rows rather than browser input.
  insert into public.user_progress_state (user_id, completed, project_features)
  values (current_user_id, '{}'::text[], '{}'::text[])
  on conflict (user_id) do nothing;

  update public.user_progress_state state
  set completed = coalesce((
        select array_agg(item_key order by item_key)
        from public.user_progress_items
        where user_id = current_user_id and scope = 'lesson' and completed
      ), '{}'::text[]),
      project_features = coalesce((
        select array_agg(item_key order by item_key)
        from public.user_progress_items
        where user_id = current_user_id and scope = 'project_feature' and completed
      ), '{}'::text[])
  where state.user_id = current_user_id;

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
  event_id uuid;
  occurred_at timestamptz;
  acknowledged_ids jsonb := '[]'::jsonb;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  if jsonb_typeof(events) <> 'array' or jsonb_array_length(events) > 100 then
    raise exception 'events must be an array of at most 100 entries';
  end if;

  insert into public.user_progress_sync (user_id)
  values (current_user_id)
  on conflict (user_id) do nothing;
  select sync_epoch into current_epoch from public.user_progress_sync
  where user_id = current_user_id for update;
  if expected_epoch <> current_epoch then
    raise exception 'progress epoch mismatch' using errcode = 'P0001';
  end if;

  for event in select value from jsonb_array_elements(events)
  loop
    if jsonb_typeof(event) <> 'object'
      or jsonb_typeof(event -> 'event_id') <> 'string'
      or event ->> 'event_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or jsonb_typeof(event -> 'challenge_id') <> 'string'
      or char_length(event ->> 'challenge_id') not between 1 and 500
      or jsonb_typeof(event -> 'origin') <> 'string'
      or event ->> 'origin' not in ('anonymous', 'authenticated')
      or jsonb_typeof(event -> 'event_type') <> 'string'
      or event ->> 'event_type' not in ('challenge_started', 'step_viewed', 'step_completed', 'run', 'submit', 'hint_opened', 'walkthrough_opened', 'challenge_passed', 'transfer_passed')
      or jsonb_typeof(event -> 'occurred_at') <> 'string'
      or event ->> 'occurred_at' !~ '^\d{4}-\d{2}-\d{2}T'
      or (event ? 'content_version' and jsonb_typeof(event -> 'content_version') not in ('string', 'null'))
      or (event ? 'step' and (jsonb_typeof(event -> 'step') not in ('string', 'null') or (event ->> 'step') not in ('recall', 'worked_example', 'scaffold', 'independent_challenge', 'transfer')))
      or (event ? 'hint_level' and (jsonb_typeof(event -> 'hint_level') <> 'number' or event ->> 'hint_level' !~ '^[0-3]$'))
      or (event ? 'passed' and jsonb_typeof(event -> 'passed') not in ('boolean', 'null'))
    then
      raise exception 'invalid practice event';
    end if;

    begin
      event_id := (event ->> 'event_id')::uuid;
      occurred_at := (event ->> 'occurred_at')::timestamptz;
    exception when invalid_datetime_format or datetime_field_overflow or invalid_text_representation then
      raise exception 'invalid practice event';
    end;
    if occurred_at > now() + interval '24 hours' then
      raise exception 'invalid practice event';
    end if;

    insert into public.practice_events (
      user_id, event_id, challenge_id, content_version, origin, event_type,
      step, hint_level, passed, occurred_at, sync_epoch
    ) values (
      current_user_id, event_id, event ->> 'challenge_id',
      nullif(event ->> 'content_version', ''), event ->> 'origin', event ->> 'event_type',
      nullif(event ->> 'step', ''), nullif(event ->> 'hint_level', '')::smallint,
      nullif(event ->> 'passed', '')::boolean, occurred_at, current_epoch
    ) on conflict on constraint practice_events_pkey do nothing;
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
  insert into public.user_progress_sync (user_id) values (current_user_id)
  on conflict (user_id) do nothing;
  update public.user_progress_sync
  set sync_epoch = sync_epoch + 1
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

  -- A reset intentionally retains a blank compatibility snapshot for legacy readers.
  insert into public.user_progress_state (user_id, completed, project_features, quiz_results, challenge_results, started_at, last_visit)
  values (current_user_id, '{}'::text[], '{}'::text[], '{}'::jsonb, '{}'::jsonb, null, null)
  on conflict (user_id) do update
  set completed = excluded.completed,
      project_features = excluded.project_features,
      quiz_results = excluded.quiz_results,
      challenge_results = excluded.challenge_results,
      started_at = null,
      last_visit = null;

  return jsonb_build_object('epoch', next_epoch);
end;
$$;

-- RPC ownership comes exclusively from auth.uid(); no caller-provided user ID exists.
revoke all on function public.apply_progress_item_mutations(bigint, jsonb) from public, anon;
revoke all on function public.append_practice_events(bigint, jsonb) from public, anon;
revoke all on function public.reset_learning_progress(bigint) from public, anon;
grant execute on function public.apply_progress_item_mutations(bigint, jsonb) to authenticated;
grant execute on function public.append_practice_events(bigint, jsonb) to authenticated;
grant execute on function public.reset_learning_progress(bigint) to authenticated;

-- Explicit Data API grants keep local, CI, and newly-created hosted projects
-- independent from Supabase's deprecated auto-expose default. RLS remains the
-- ownership boundary; the canonical tables intentionally have no write policy,
-- so browser writes can only succeed through the owner-scoped RPCs above.
revoke all on table
  public.user_progress_sync,
  public.user_progress_items,
  public.practice_events
from public, anon, authenticated;
grant select, insert, update, delete on table
  public.user_progress_sync,
  public.user_progress_items,
  public.practice_events
to authenticated;

revoke all on table
  public.profiles,
  public.user_progress_state,
  public.lesson_progress,
  public.topic_progress,
  public.project_feature_progress,
  public.quiz_attempts,
  public.challenge_attempts,
  public.bookmarks,
  public.notes,
  public.saved_snippets
from public, anon, authenticated;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update, delete on table
  public.user_progress_state,
  public.lesson_progress,
  public.topic_progress,
  public.project_feature_progress,
  public.notes,
  public.saved_snippets
to authenticated;
grant select, insert, delete on table
  public.quiz_attempts,
  public.challenge_attempts,
  public.bookmarks
to authenticated;
