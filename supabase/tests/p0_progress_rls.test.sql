-- P0 Phase 3 Task 6: local Supabase ownership, RLS, and migration assertions.
--
-- The runner invokes this file twice:
--   1. -v legacy_fixture=1 after migration 202607060001 to stage a legacy row.
--   2. normally after the remaining migrations have been applied.
-- This keeps the backfill assertion faithful to the migration order.

\set ON_ERROR_STOP on

\if :{?legacy_fixture}
  insert into auth.users (
    id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data
  ) values (
    '11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated',
    'p0-rls-user-a@example.test', crypt('not-used-in-db-tests', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}', '{}'
  );

  update public.user_progress_state
  set completed = array['legacy-lesson'], project_features = array['legacy-feature']
  where user_id = '11111111-1111-4111-8111-111111111111';

  \echo 'PASS legacy fixture staged before progress migrations'
  \quit
\endif

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

-- Create User B after the auth-user trigger and progress migrations are installed.
insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data
) values (
  '22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated',
  'p0-rls-user-b@example.test', crypt('not-used-in-db-tests', gen_salt('bf')),
  now(), '{"provider":"email","providers":["email"]}', '{}'
);

-- The migration must have projected the legacy snapshot into canonical rows.
select pg_temp.assert_true(
  exists (
    select 1 from public.user_progress_items
    where user_id = '11111111-1111-4111-8111-111111111111'
      and scope = 'lesson' and item_key = 'legacy-lesson' and completed
  ) and exists (
    select 1 from public.user_progress_items
    where user_id = '11111111-1111-4111-8111-111111111111'
      and scope = 'project_feature' and item_key = 'legacy-feature' and completed
  ),
  'legacy snapshot rows are backfilled into canonical items'
);

-- User A writes a mutation and event. auth.uid() is supplied exactly as Supabase
-- PostgREST does: through the request JWT claim setting.
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select public.apply_progress_item_mutations(0, $$[
  {
    "scope":"lesson", "item_key":"a-only", "completed":true,
    "client_updated_at":"2026-07-12T10:00:00Z",
    "mutation_id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1"
  }
]$$::jsonb);
select public.append_practice_events(0, $$[
  {
    "event_id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
    "challenge_id":"a-challenge", "origin":"authenticated",
    "event_type":"challenge_started", "occurred_at":"2026-07-12T10:00:00Z"
  }
]$$::jsonb);

-- A sees only A-owned sync, item, and event rows.
select pg_temp.assert_true(
  (select count(*) from public.user_progress_sync) = 1
  and (select count(*) from public.user_progress_items) = 3
  and (select count(*) from public.practice_events) = 1,
  'User A sees only User A sync items and events'
);
reset role;

-- User B attempts direct table mutation/deletion against A. RLS policies permit
-- reads only and leave A's data unchanged (the expected result is zero rows).
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
update public.user_progress_items
set completed = false
where user_id = '11111111-1111-4111-8111-111111111111' and item_key = 'a-only';
delete from public.practice_events
where user_id = '11111111-1111-4111-8111-111111111111';
reset role;
select pg_temp.assert_true(
  (select completed from public.user_progress_items
   where user_id = '11111111-1111-4111-8111-111111111111' and item_key = 'a-only')
  and (select count(*) from public.practice_events
       where user_id = '11111111-1111-4111-8111-111111111111') = 1,
  'User B cannot update or delete User A rows through tables'
);

-- Execute rights are the database's definitive anon boundary; direct execution
-- would return permission denied under the anon role.
select pg_temp.assert_true(
  not has_function_privilege('anon', 'public.apply_progress_item_mutations(bigint, jsonb)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.append_practice_events(bigint, jsonb)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.reset_learning_progress(bigint)', 'EXECUTE'),
  'anon is denied all progress mutation reset and event RPCs'
);

-- User B invokes the RPC but has no way to supply User A's id. Its canonical row
-- must be owned by auth.uid(), not a browser-controlled field.
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select public.apply_progress_item_mutations(0, $$[
  {
    "scope":"lesson", "item_key":"rpc-owned-by-b", "completed":true,
    "client_updated_at":"2026-07-12T10:01:00Z",
    "mutation_id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1"
  }
]$$::jsonb);
reset role;
select pg_temp.assert_true(
  exists (select 1 from public.user_progress_items
          where user_id = '22222222-2222-4222-8222-222222222222' and item_key = 'rpc-owned-by-b')
  and not exists (select 1 from public.user_progress_items
                  where user_id = '11111111-1111-4111-8111-111111111111' and item_key = 'rpc-owned-by-b'),
  'authenticated RPC derives ownership exclusively from auth.uid()'
);

-- The profile update policy allows a learner to edit their profile, but the
-- trigger must preserve the stored role even if a client supplies admin.
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
update public.profiles set role = 'admin'
where id = '11111111-1111-4111-8111-111111111111';
reset role;
select pg_temp.assert_true(
  (select role = 'learner' from public.profiles where id = '11111111-1111-4111-8111-111111111111'),
  'learner profile role cannot be elevated to admin'
);

-- Identical retries acknowledge safely without duplicating canonical data.
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select public.apply_progress_item_mutations(0, $$[
  {
    "scope":"lesson", "item_key":"retry-item", "completed":true,
    "client_updated_at":"2026-07-12T10:02:00Z",
    "mutation_id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2"
  }
]$$::jsonb);
select public.apply_progress_item_mutations(0, $$[
  {
    "scope":"lesson", "item_key":"retry-item", "completed":true,
    "client_updated_at":"2026-07-12T10:02:00Z",
    "mutation_id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2"
  }
]$$::jsonb);
select public.append_practice_events(0, $$[
  {
    "event_id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3",
    "challenge_id":"retry-challenge", "origin":"authenticated",
    "event_type":"run", "occurred_at":"2026-07-12T10:02:00Z"
  }
]$$::jsonb);
select public.append_practice_events(0, $$[
  {
    "event_id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3",
    "challenge_id":"retry-challenge", "origin":"authenticated",
    "event_type":"run", "occurred_at":"2026-07-12T10:02:00Z"
  }
]$$::jsonb);
reset role;
select pg_temp.assert_true(
  (select count(*) from public.user_progress_items
   where user_id = '22222222-2222-4222-8222-222222222222' and item_key = 'retry-item') = 1
  and (select count(*) from public.practice_events
       where user_id = '22222222-2222-4222-8222-222222222222'
         and event_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3') = 1,
  'retrying identical mutation and event IDs is idempotent'
);

-- LWW must retain an explicit newer uncomplete, rather than treating false as
-- absence from the legacy completed arrays.
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select public.apply_progress_item_mutations(0, $$[
  {
    "scope":"lesson", "item_key":"retry-item", "completed":false,
    "client_updated_at":"2026-07-12T10:03:00Z",
    "mutation_id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4"
  }
]$$::jsonb);
reset role;
select pg_temp.assert_true(
  not (select completed from public.user_progress_items
       where user_id = '22222222-2222-4222-8222-222222222222' and item_key = 'retry-item')
  and not exists (
    select 1 from public.user_progress_state
    where user_id = '22222222-2222-4222-8222-222222222222'
      and 'retry-item' = any(completed)
  ),
  'newer explicit uncomplete wins and updates compatibility projection'
);

-- Reset advances B's epoch. A stale mutation at the old epoch must raise P0001.
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select public.reset_learning_progress(0);
do $$
begin
  begin
    perform public.apply_progress_item_mutations(0, $stale_mutation$[
      {
        "scope":"lesson", "item_key":"stale-after-reset", "completed":true,
        "client_updated_at":"2026-07-12T10:04:00Z",
        "mutation_id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb5"
      }
    ]$stale_mutation$::jsonb);
    raise exception 'stale mutation unexpectedly succeeded';
  exception when sqlstate 'P0001' then
    null;
  end;
end;
$$;
reset role;
select pg_temp.assert_true(
  (select sync_epoch = 1 from public.user_progress_sync
   where user_id = '22222222-2222-4222-8222-222222222222')
  and not exists (select 1 from public.user_progress_items
                  where user_id = '22222222-2222-4222-8222-222222222222'
                    and item_key = 'stale-after-reset'),
  'reset increments epoch and blocks old-epoch mutation'
);

rollback;
\echo 'PASS P0 progress RLS and migration tests'
