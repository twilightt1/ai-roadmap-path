-- P2 project evidence ownership, validation, and field-level LWW assertions.

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
  'p2-rls-user-a@example.test', crypt('not-used-in-db-tests', gen_salt('bf')),
  now(), '{"provider":"email","providers":["email"]}', '{}'
) on conflict (id) do nothing;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data
) values (
  '22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated',
  'p2-rls-user-b@example.test', crypt('not-used-in-db-tests', gen_salt('bf')),
  now(), '{"provider":"email","providers":["email"]}', '{}'
) on conflict (id) do nothing;

select pg_temp.assert_true(
  not has_function_privilege(
    'anon',
    'public.merge_project_evidence(text, text, timestamptz, text, timestamptz, text, timestamptz)',
    'EXECUTE'
  ),
  'anonymous users cannot call the project evidence merge RPC'
);

select pg_temp.assert_true(
  not has_table_privilege('authenticated', 'public.project_evidence', 'INSERT')
  and not has_table_privilege('authenticated', 'public.project_evidence', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.project_evidence', 'DELETE'),
  'authenticated clients cannot bypass the project evidence merge RPC'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select public.merge_project_evidence(
  'p1-easy',
  'https://github.com/learner/project',
  '2026-07-15T10:00:00Z'::timestamptz,
  '',
  '1970-01-01T00:00:00Z'::timestamptz,
  'Initial reflection',
  '2026-07-15T10:00:00Z'::timestamptz
);
select pg_temp.assert_true(
  (select count(*) from public.project_evidence) = 1
  and (select project_id from public.project_evidence) = 'p1-easy',
  'authenticated merge derives project evidence ownership from auth.uid()'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select pg_temp.assert_true(
  (select count(*) from public.project_evidence) = 0,
  'RLS prevents cross-user project evidence reads'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select public.merge_project_evidence(
  'p1-easy',
  'https://codeberg.org/learner/stale',
  '2026-07-15T09:00:00Z'::timestamptz,
  'https://demo.example.test/project',
  '2026-07-15T11:00:00Z'::timestamptz,
  'A newer reflection from another context',
  '2026-07-15T11:00:00Z'::timestamptz
);
reset role;

select pg_temp.assert_true(
  (select repository_url from public.project_evidence
   where user_id = '11111111-1111-4111-8111-111111111111') =
    'https://github.com/learner/project'
  and (select demo_url from public.project_evidence
       where user_id = '11111111-1111-4111-8111-111111111111') =
    'https://demo.example.test/project'
  and (select reflection from public.project_evidence
       where user_id = '11111111-1111-4111-8111-111111111111') =
    'A newer reflection from another context',
  'stale fields cannot overwrite newer project evidence while newer fields still merge'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
do $$
begin
  perform public.merge_project_evidence(
    'p1-easy',
    'https://',
    '2026-07-15T12:00:00Z'::timestamptz,
    '',
    '2026-07-15T12:00:00Z'::timestamptz,
    'Unsafe URL attempt',
    '2026-07-15T12:00:00Z'::timestamptz
  );
  raise exception 'FAIL: unsafe project evidence URL was accepted';
exception
  when others then
    if sqlerrm = 'FAIL: unsafe project evidence URL was accepted' then
      raise;
    end if;
end;
$$;

do $$
begin
  perform public.merge_project_evidence(
    'p1-easy',
    'https://github.com/learner/project',
    '2026-07-15T12:00:00Z'::timestamptz,
    '',
    '2026-07-15T12:00:00Z'::timestamptz,
    repeat('x', 2001),
    '2026-07-15T12:00:00Z'::timestamptz
  );
  raise exception 'FAIL: oversized project evidence reflection was accepted';
exception
  when others then
    if sqlerrm = 'FAIL: oversized project evidence reflection was accepted' then
      raise;
    end if;
end;
$$;
reset role;

select pg_temp.assert_true(
  (select repository_url from public.project_evidence
   where user_id = '11111111-1111-4111-8111-111111111111') =
    'https://github.com/learner/project',
  'invalid project evidence payloads are rejected atomically'
);

rollback;

\echo 'PASS P2 project evidence RLS and merge tests'
