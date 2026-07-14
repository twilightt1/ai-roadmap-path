-- Staging-safe P0/P1 ownership and RLS proof.
-- All fixture writes are enclosed in this transaction and rolled back.

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
) values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'authenticated', 'authenticated',
    'staging-proof-user-a@example.test', crypt('transaction-only', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}', '{}'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'authenticated', 'authenticated',
    'staging-proof-user-b@example.test', crypt('transaction-only', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}', '{}'
  )
on conflict (id) do nothing;

select pg_temp.assert_true(
  not has_function_privilege('anon', 'public.apply_progress_item_mutations(bigint, jsonb)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.append_practice_events(bigint, jsonb)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.reset_learning_progress(bigint)', 'EXECUTE')
  and not has_function_privilege(
    'anon',
    'public.merge_learning_profile(smallint, timestamptz, jsonb, timestamptz)',
    'EXECUTE'
  ),
  'anonymous callers cannot execute P0 or P1 mutation RPCs'
);

select pg_temp.assert_true(
  not has_table_privilege('authenticated', 'public.learning_profiles', 'INSERT')
  and not has_table_privilege('authenticated', 'public.learning_profiles', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.learning_profiles', 'DELETE'),
  'authenticated clients cannot bypass the learning profile RPC'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', true);
select public.apply_progress_item_mutations(0, $$[
  {
    "scope":"lesson", "item_key":"staging-owner-a", "completed":true,
    "client_updated_at":"2026-07-15T00:00:00Z",
    "mutation_id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3"
  }
]$$::jsonb);
select public.append_practice_events(0, $$[
  {
    "event_id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4",
    "challenge_id":"staging-proof", "origin":"authenticated",
    "event_type":"challenge_started", "occurred_at":"2026-07-15T00:00:00Z"
  }
]$$::jsonb);
select public.merge_learning_profile(
  5::smallint,
  '2026-07-15T00:00:00Z'::timestamptz,
  '{
    "assessmentVersion":"foundation-v1",
    "completedAt":"2026-07-15T00:05:00Z",
    "score":1,
    "total":2,
    "topicScores":{"phase-1-programming/python-fundamentals":{"correct":1,"total":2}}
  }'::jsonb,
  '2026-07-15T00:05:00Z'::timestamptz
);
select pg_temp.assert_true(
  (select count(*) from public.user_progress_items where item_key = 'staging-owner-a') = 1
  and (select count(*) from public.practice_events where challenge_id = 'staging-proof') = 1
  and (select count(*) from public.learning_profiles) = 1,
  'User A can read only the rows created through User A RPC calls'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', true);
select pg_temp.assert_true(
  (select count(*) from public.user_progress_items where item_key = 'staging-owner-a') = 0
  and (select count(*) from public.practice_events where challenge_id = 'staging-proof') = 0
  and (select count(*) from public.learning_profiles) = 0,
  'User B cannot read User A progress events or learning profile'
);
update public.user_progress_items
set completed = false
where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
  and item_key = 'staging-owner-a';
delete from public.practice_events
where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
  and challenge_id = 'staging-proof';
select public.apply_progress_item_mutations(0, $$[
  {
    "scope":"lesson", "item_key":"staging-owned-by-b", "completed":true,
    "client_updated_at":"2026-07-15T00:01:00Z",
    "mutation_id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3"
  }
]$$::jsonb);
reset role;

select pg_temp.assert_true(
  (select completed from public.user_progress_items
   where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
     and item_key = 'staging-owner-a')
  and (select count(*) from public.practice_events
       where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
         and challenge_id = 'staging-proof') = 1,
  'User B cannot update or delete User A rows'
);

select pg_temp.assert_true(
  exists (
    select 1 from public.user_progress_items
    where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'
      and item_key = 'staging-owned-by-b'
  )
  and not exists (
    select 1 from public.user_progress_items
    where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
      and item_key = 'staging-owned-by-b'
  ),
  'progress RPC ownership derives exclusively from auth.uid()'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', true);
update public.profiles
set role = 'admin'
where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
select public.merge_learning_profile(
  3::smallint,
  '2026-07-14T23:00:00Z'::timestamptz,
  null::jsonb,
  '2026-07-14T23:00:00Z'::timestamptz
);
do $$
begin
  perform public.merge_learning_profile(
    7::smallint,
    '2026-07-15T01:00:00Z'::timestamptz,
    '{
      "assessmentVersion":"foundation-v1",
      "completedAt":"2026-07-15T01:00:00Z",
      "score":1,
      "total":2,
      "topicScores":{"topic":{"correct":1,"total":2}},
      "selectedAnswers":[0,1]
    }'::jsonb,
    '2026-07-15T01:00:00Z'::timestamptz
  );
  raise exception 'FAIL: answer-bearing diagnostic payload was accepted';
exception
  when others then
    if sqlerrm = 'FAIL: answer-bearing diagnostic payload was accepted' then
      raise;
    end if;
end;
$$;
reset role;

select pg_temp.assert_true(
  (select role = 'learner' from public.profiles
   where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),
  'learner profile role cannot be elevated to admin'
);

select pg_temp.assert_true(
  (select weekly_target from public.learning_profiles
   where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1') = 5
  and (select diagnostic is not null from public.learning_profiles
       where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),
  'stale fields and answer-bearing diagnostics cannot overwrite valid P1 data'
);

select pg_temp.assert_true(true, 'staging P0/P1 transaction proof completed');

rollback;
