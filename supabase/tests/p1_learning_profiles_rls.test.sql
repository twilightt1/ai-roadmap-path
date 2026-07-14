-- P1 learning profile ownership, validation, and field-level LWW assertions.

\set ON_ERROR_STOP on

begin;

create or replace function pg_temp.assert_true(condition boolean, assertion_name text)
returns void
language plpgsql
as $$
begin
  if condition is distinct from true then
    raise exception 'FAIL: %', assertion_name;
  end if;
  raise notice 'PASS: %', assertion_name;
end;
$$;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data
) values (
  '11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated',
  'p1-rls-user-a@example.test', crypt('not-used-in-db-tests', gen_salt('bf')),
  now(), '{"provider":"email","providers":["email"]}', '{}'
) on conflict (id) do nothing;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data
) values (
  '22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated',
  'p1-rls-user-b@example.test', crypt('not-used-in-db-tests', gen_salt('bf')),
  now(), '{"provider":"email","providers":["email"]}', '{}'
) on conflict (id) do nothing;

select pg_temp.assert_true(
  not has_function_privilege(
    'anon',
    'public.merge_learning_profile(smallint, timestamptz, jsonb, timestamptz)',
    'EXECUTE'
  ),
  'anonymous users cannot call the learning profile merge RPC'
);

select pg_temp.assert_true(
  not has_table_privilege('authenticated', 'public.learning_profiles', 'INSERT')
  and not has_table_privilege('authenticated', 'public.learning_profiles', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.learning_profiles', 'DELETE'),
  'authenticated clients cannot bypass the learning profile merge RPC'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select public.merge_learning_profile(
  5::smallint,
  '2026-07-14T10:00:00Z'::timestamptz,
  '{
    "assessmentVersion":"foundation-v1",
    "completedAt":"2026-07-14T10:05:00Z",
    "score":1,
    "total":2,
    "topicScores":{"phase-1-programming/python-fundamentals":{"correct":1,"total":2}}
  }'::jsonb,
  '2026-07-14T10:05:00Z'::timestamptz
);
select pg_temp.assert_true(
  (select count(*) from public.learning_profiles) = 1
  and (select weekly_target from public.learning_profiles) = 5,
  'authenticated merge derives ownership from auth.uid()'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select pg_temp.assert_true(
  (select count(*) from public.learning_profiles) = 0,
  'RLS prevents cross-user learning profile reads'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select public.merge_learning_profile(
  3::smallint,
  '2026-07-14T09:00:00Z'::timestamptz,
  null::jsonb,
  '2026-07-14T09:00:00Z'::timestamptz
);
reset role;
select pg_temp.assert_true(
  (select weekly_target from public.learning_profiles
   where user_id = '11111111-1111-4111-8111-111111111111') = 5
  and (select diagnostic is not null from public.learning_profiles
       where user_id = '11111111-1111-4111-8111-111111111111'),
  'stale field writes cannot overwrite newer learning profile data'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
do $$
begin
  perform public.merge_learning_profile(
    7::smallint,
    '2026-07-14T11:00:00Z'::timestamptz,
    '{"assessmentVersion":"foundation-v1","completedAt":"2026-07-14T11:00:00Z","score":1,"total":2,"topicScores":{"topic":{"correct":1,"total":2}},"selectedAnswers":[0,1]}'::jsonb,
    '2026-07-14T11:00:00Z'::timestamptz
  );
  raise exception 'FAIL: answer-bearing diagnostic payload was accepted';
exception
  when others then
    if sqlerrm = 'FAIL: answer-bearing diagnostic payload was accepted' then
      raise;
    end if;
end;
$$;

do $$
begin
  perform public.merge_learning_profile(
    7::smallint,
    '2026-07-14T11:00:00Z'::timestamptz,
    jsonb_build_object(
      'assessmentVersion', repeat('x', 81),
      'completedAt', '2026-07-14T11:00:00Z',
      'score', 1,
      'total', 2,
      'topicScores', '{"topic":{"correct":1,"total":2}}'::jsonb
    ),
    '2026-07-14T11:00:00Z'::timestamptz
  );
  raise exception 'FAIL: oversized diagnostic metadata was accepted';
exception
  when others then
    if sqlerrm = 'FAIL: oversized diagnostic metadata was accepted' then
      raise;
    end if;
end;
$$;
reset role;
select pg_temp.assert_true(
  (select weekly_target from public.learning_profiles
   where user_id = '11111111-1111-4111-8111-111111111111') = 5,
  'answer-bearing and oversized diagnostic payloads are rejected atomically'
);

rollback;

\echo 'PASS P1 learning profile RLS and merge tests'
