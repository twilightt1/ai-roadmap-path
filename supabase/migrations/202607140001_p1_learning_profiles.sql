-- P1 learning loop: privacy-minimal, field-level LWW learner profile.

create table if not exists public.learning_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  weekly_target smallint not null default 3 check (weekly_target in (3, 5, 7)),
  weekly_goal_updated_at timestamptz not null default '1970-01-01T00:00:00Z',
  diagnostic jsonb,
  diagnostic_updated_at timestamptz not null default '1970-01-01T00:00:00Z',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists learning_profiles_set_updated_at on public.learning_profiles;
create trigger learning_profiles_set_updated_at
before update on public.learning_profiles
for each row execute function public.set_updated_at();

alter table public.learning_profiles enable row level security;

drop policy if exists "Users can read own learning profile" on public.learning_profiles;
create policy "Users can read own learning profile"
on public.learning_profiles for select
using (auth.uid() = user_id);

create or replace function public.merge_learning_profile(
  weekly_target_input smallint,
  weekly_goal_updated_at_input timestamptz,
  diagnostic_input jsonb,
  diagnostic_updated_at_input timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  topic_entry record;
  diagnostic_topic_count integer := 0;
  diagnostic_score integer := 0;
  diagnostic_total integer := 0;
  result_row public.learning_profiles%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  if weekly_target_input is null or weekly_target_input not in (3, 5, 7) then
    raise exception 'invalid weekly target';
  end if;
  if weekly_goal_updated_at_input is null
    or diagnostic_updated_at_input is null
    or weekly_goal_updated_at_input > now() + interval '24 hours'
    or diagnostic_updated_at_input > now() + interval '24 hours'
  then
    raise exception 'invalid learning profile timestamp';
  end if;

  if diagnostic_input is not null then
    if jsonb_typeof(diagnostic_input) <> 'object'
      or octet_length(diagnostic_input::text) > 10000
      or jsonb_typeof(diagnostic_input -> 'assessmentVersion') <> 'string'
      or char_length(diagnostic_input ->> 'assessmentVersion') not between 1 and 80
      or jsonb_typeof(diagnostic_input -> 'completedAt') <> 'string'
      or diagnostic_input ->> 'completedAt' !~ '^\d{4}-\d{2}-\d{2}T'
      or jsonb_typeof(diagnostic_input -> 'score') <> 'number'
      or diagnostic_input ->> 'score' !~ '^\d+$'
      or jsonb_typeof(diagnostic_input -> 'total') <> 'number'
      or diagnostic_input ->> 'total' !~ '^\d+$'
      or jsonb_typeof(diagnostic_input -> 'topicScores') <> 'object'
    then
      raise exception 'invalid diagnostic result';
    end if;
    if exists (
      select 1 from jsonb_object_keys(diagnostic_input) as keys(key)
      where key not in (
        'assessmentVersion', 'completedAt', 'score', 'total', 'topicScores'
      )
    ) then
      raise exception 'invalid diagnostic result';
    end if;

    select count(*) into diagnostic_topic_count
    from jsonb_object_keys(diagnostic_input -> 'topicScores');
    if diagnostic_topic_count not between 1 and 20
      or (diagnostic_input ->> 'score')::integer not between 0 and 100
      or (diagnostic_input ->> 'total')::integer not between 1 and 100
      or (diagnostic_input ->> 'score')::integer > (diagnostic_input ->> 'total')::integer
    then
      raise exception 'invalid diagnostic result';
    end if;

    begin
      if (diagnostic_input ->> 'completedAt')::timestamptz > now() + interval '24 hours' then
        raise exception 'invalid diagnostic result';
      end if;
    exception when invalid_datetime_format or datetime_field_overflow then
      raise exception 'invalid diagnostic result';
    end;

    for topic_entry in select key, value from jsonb_each(diagnostic_input -> 'topicScores')
    loop
      if char_length(topic_entry.key) not between 1 and 500
        or jsonb_typeof(topic_entry.value) <> 'object'
        or jsonb_typeof(topic_entry.value -> 'correct') <> 'number'
        or topic_entry.value ->> 'correct' !~ '^\d+$'
        or jsonb_typeof(topic_entry.value -> 'total') <> 'number'
        or topic_entry.value ->> 'total' !~ '^\d+$'
      then
        raise exception 'invalid diagnostic result';
      end if;
      if exists (
        select 1 from jsonb_object_keys(topic_entry.value) as keys(key)
        where key not in ('correct', 'total')
      ) then
        raise exception 'invalid diagnostic result';
      end if;
      if (topic_entry.value ->> 'correct')::integer not between 0 and 20
        or (topic_entry.value ->> 'total')::integer not between 1 and 20
        or (topic_entry.value ->> 'correct')::integer > (topic_entry.value ->> 'total')::integer
      then
        raise exception 'invalid diagnostic result';
      end if;
      diagnostic_score := diagnostic_score + (topic_entry.value ->> 'correct')::integer;
      diagnostic_total := diagnostic_total + (topic_entry.value ->> 'total')::integer;
    end loop;

    if diagnostic_score <> (diagnostic_input ->> 'score')::integer
      or diagnostic_total <> (diagnostic_input ->> 'total')::integer
    then
      raise exception 'invalid diagnostic result';
    end if;
  end if;

  insert into public.learning_profiles (
    user_id,
    weekly_target,
    weekly_goal_updated_at,
    diagnostic,
    diagnostic_updated_at
  ) values (
    current_user_id,
    weekly_target_input,
    weekly_goal_updated_at_input,
    diagnostic_input,
    diagnostic_updated_at_input
  )
  on conflict (user_id) do update
  set weekly_target = case
        when (excluded.weekly_goal_updated_at, excluded.weekly_target) >
             (public.learning_profiles.weekly_goal_updated_at, public.learning_profiles.weekly_target)
        then excluded.weekly_target else public.learning_profiles.weekly_target end,
      weekly_goal_updated_at = greatest(
        public.learning_profiles.weekly_goal_updated_at,
        excluded.weekly_goal_updated_at
      ),
      diagnostic = case
        when (excluded.diagnostic_updated_at, coalesce(excluded.diagnostic::text, '')) >
             (public.learning_profiles.diagnostic_updated_at, coalesce(public.learning_profiles.diagnostic::text, ''))
        then excluded.diagnostic else public.learning_profiles.diagnostic end,
      diagnostic_updated_at = greatest(
        public.learning_profiles.diagnostic_updated_at,
        excluded.diagnostic_updated_at
      )
  returning * into result_row;

  return jsonb_build_object(
    'weekly_target', result_row.weekly_target,
    'weekly_goal_updated_at', result_row.weekly_goal_updated_at,
    'diagnostic', result_row.diagnostic,
    'diagnostic_updated_at', result_row.diagnostic_updated_at
  );
end;
$$;

revoke all on table public.learning_profiles from public, anon, authenticated;
grant select on table public.learning_profiles to authenticated;

revoke all on function public.merge_learning_profile(smallint, timestamptz, jsonb, timestamptz)
from public, anon;
grant execute on function public.merge_learning_profile(smallint, timestamptz, jsonb, timestamptz)
to authenticated;
