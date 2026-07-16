-- P2.2 reviewer lifecycle, bounded queue pagination, and reclaim assertions.

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
    '77777777-7777-4777-8777-777777777777', 'authenticated', 'authenticated',
    'p2-ops-reviewer-a@example.test', crypt('not-used-in-db-tests', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}', '{}'
  ),
  (
    '88888888-8888-4888-8888-888888888888', 'authenticated', 'authenticated',
    'p2-ops-reviewer-b@example.test', crypt('not-used-in-db-tests', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}', '{}'
  ),
  (
    '99999999-9999-4999-8999-999999999999', 'authenticated', 'authenticated',
    'p2-ops-outsider@example.test', crypt('not-used-in-db-tests', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}', '{}'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'authenticated', 'authenticated',
    'p2-ops-learner@example.test', crypt('not-used-in-db-tests', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}', '{}'
  )
on conflict (id) do nothing;

insert into public.project_reviewer_memberships (
  user_id, operator_alias
) values
  ('77777777-7777-4777-8777-777777777777', 'reviewer-7777777777777777'),
  ('88888888-8888-4888-8888-888888888888', 'reviewer-8888888888888888')
on conflict (user_id) do update
set revoked_at = null;

insert into public.project_submissions (
  id,
  learner_id,
  project_id,
  repository_url,
  repository_url_updated_at,
  demo_url,
  demo_url_updated_at,
  reflection,
  reflection_updated_at,
  completed_feature_count,
  required_feature_count,
  submitted_at
) values
  (
    '10000000-0000-4000-8000-000000000001',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'p2-easy',
    'https://github.com/learner/p2-ops-one',
    '2026-07-16T01:00:00Z', '', '1970-01-01T00:00:00Z',
    'This immutable reviewer operations fixture has enough deterministic reflection content to pass the bounded project rubric safely.',
    '2026-07-16T01:00:00Z', 2, 2, '2026-07-16T01:00:00Z'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'p2-medium',
    'https://github.com/learner/p2-ops-two',
    '2026-07-16T02:00:00Z', '', '1970-01-01T00:00:00Z',
    'This immutable reviewer operations fixture has enough deterministic reflection content to pass the bounded project rubric safely.',
    '2026-07-16T02:00:00Z', 2, 2, '2026-07-16T02:00:00Z'
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'p2-hard',
    'https://github.com/learner/p2-ops-three',
    '2026-07-16T03:00:00Z', '', '1970-01-01T00:00:00Z',
    'This immutable reviewer operations fixture has enough deterministic reflection content to pass the bounded project rubric safely.',
    '2026-07-16T03:00:00Z', 3, 3, '2026-07-16T03:00:00Z'
  ),
  (
    '10000000-0000-4000-8000-000000000004',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'p3-easy',
    'https://github.com/learner/p2-ops-closed',
    '2026-07-16T04:00:00Z', '', '1970-01-01T00:00:00Z',
    'This immutable reviewer operations fixture has enough deterministic reflection content to pass the bounded project rubric safely.',
    '2026-07-16T04:00:00Z', 1, 1, '2026-07-16T04:00:00Z'
  );

insert into public.project_submission_workflow (
  submission_id, state, assigned_reviewer_id
) values
  ('10000000-0000-4000-8000-000000000001', 'pending', null),
  (
    '10000000-0000-4000-8000-000000000002',
    'in_review',
    '77777777-7777-4777-8777-777777777777'
  ),
  ('10000000-0000-4000-8000-000000000003', 'pending', null),
  (
    '10000000-0000-4000-8000-000000000004',
    'approved',
    '77777777-7777-4777-8777-777777777777'
  );

select pg_temp.assert_true(
  not has_function_privilege(
    'anon',
    'public.list_project_review_queue_page(integer,timestamptz,uuid)',
    'EXECUTE'
  )
  and has_function_privilege(
    'authenticated',
    'public.list_project_review_queue_page(integer,timestamptz,uuid)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'authenticated',
    'public.manage_project_reviewer(uuid,text,uuid,boolean)',
    'EXECUTE'
  )
  and has_function_privilege(
    'service_role',
    'public.manage_project_reviewer(uuid,text,uuid,boolean)',
    'EXECUTE'
  ),
  'queue and lifecycle RPC grants are least privilege'
);

select pg_temp.assert_true(
  has_table_privilege('service_role', 'public.project_reviewer_memberships', 'SELECT')
  and not has_table_privilege('service_role', 'public.project_reviewer_memberships', 'INSERT')
  and not has_table_privilege('service_role', 'public.project_reviewer_memberships', 'UPDATE')
  and not has_table_privilege('service_role', 'public.project_reviewer_memberships', 'DELETE')
  and not has_table_privilege('service_role', 'public.project_reviewer_memberships', 'TRUNCATE')
  and has_table_privilege('service_role', 'public.project_reviewer_operations', 'SELECT')
  and not has_table_privilege('service_role', 'public.project_reviewer_operations', 'INSERT')
  and not has_table_privilege('service_role', 'public.project_reviewer_operations', 'UPDATE')
  and not has_table_privilege('service_role', 'public.project_reviewer_operations', 'DELETE')
  and not has_table_privilege('service_role', 'public.project_reviewer_operations', 'TRUNCATE')
  and not has_table_privilege('authenticated', 'public.project_reviewer_operations', 'SELECT'),
  'operators cannot bypass lifecycle RPCs and browsers cannot read the journal'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '77777777-7777-4777-8777-777777777777', true);

select pg_temp.assert_true(
  (
    select array_agg(page.id order by page.submitted_at, page.id)
    from public.list_project_review_queue_page(2, null, null) page
  ) = array[
    '10000000-0000-4000-8000-000000000001'::uuid,
    '10000000-0000-4000-8000-000000000002'::uuid,
    '10000000-0000-4000-8000-000000000003'::uuid
  ]
  and (
    select bool_and(
      case
        when page.id = '10000000-0000-4000-8000-000000000002'::uuid
          then page.assigned_reviewer_active
        else not page.assigned_reviewer_active
      end
    )
    from public.list_project_review_queue_page(2, null, null) page
  ),
  'reviewer page returns N plus one in immutable order with assignee activity'
);

select pg_temp.assert_true(
  (
    select array_agg(page.id order by page.submitted_at, page.id)
    from public.list_project_review_queue_page(
      2,
      '2026-07-16T02:00:00Z',
      '10000000-0000-4000-8000-000000000002'
    ) page
  ) = array['10000000-0000-4000-8000-000000000003'::uuid],
  'cursor page has no overlap and excludes terminal workflow rows'
);

do $$
begin
  perform * from public.list_project_review_queue_page(0, null, null);
  raise exception 'FAIL: invalid queue page size was accepted';
exception
  when others then
    if sqlerrm = 'FAIL: invalid queue page size was accepted' then raise; end if;
end;
$$;

do $$
begin
  perform * from public.list_project_review_queue_page(
    2, '2026-07-16T02:00:00Z', null
  );
  raise exception 'FAIL: partial queue cursor was accepted';
exception
  when others then
    if sqlerrm = 'FAIL: partial queue cursor was accepted' then raise; end if;
end;
$$;

select set_config('request.jwt.claim.sub', '99999999-9999-4999-8999-999999999999', true);
do $$
begin
  perform * from public.list_project_review_queue_page(2, null, null);
  raise exception 'FAIL: non-reviewer loaded the queue';
exception
  when others then
    if sqlerrm = 'FAIL: non-reviewer loaded the queue' then raise; end if;
end;
$$;
reset role;

set local role service_role;
select public.manage_project_reviewer(
  '20000000-0000-4000-8000-000000000001',
  'revoke',
  '77777777-7777-4777-8777-777777777777',
  false
);
reset role;

select pg_temp.assert_true(
  (
    select membership.revoked_at is not null
    from public.project_reviewer_memberships membership
    where membership.user_id = '77777777-7777-4777-8777-777777777777'
  )
  and (
    select workflow.state = 'pending'
      and workflow.assigned_reviewer_id is null
    from public.project_submission_workflow workflow
    where workflow.submission_id = '10000000-0000-4000-8000-000000000002'
  )
  and (
    select count(*) from public.project_submission_events event
    where event.submission_id = '10000000-0000-4000-8000-000000000002'
      and event.event_type = 'reviewer_released'
  ) = 1,
  'revocation atomically releases claims and appends one audit event'
);

set local role service_role;
select public.manage_project_reviewer(
  '20000000-0000-4000-8000-000000000001',
  'revoke',
  '77777777-7777-4777-8777-777777777777',
  false
);
reset role;

select pg_temp.assert_true(
  (
    select count(*) from public.project_submission_events event
    where event.submission_id = '10000000-0000-4000-8000-000000000002'
      and event.event_type = 'reviewer_released'
  ) = 1
  and (
    select count(*) from public.project_reviewer_operations operation
    where operation.id = '20000000-0000-4000-8000-000000000001'
  ) = 1,
  'repeating an operation id does not duplicate release state or events'
);

set local role service_role;
do $$
begin
  perform public.manage_project_reviewer(
    '20000000-0000-4000-8000-000000000002',
    'revoke',
    '88888888-8888-4888-8888-888888888888',
    false
  );
  raise exception 'FAIL: last reviewer guard allowed active work to be stranded';
exception
  when others then
    if sqlerrm = 'FAIL: last reviewer guard allowed active work to be stranded' then raise; end if;
end;
$$;

select public.manage_project_reviewer(
  '20000000-0000-4000-8000-000000000003',
  'restore',
  '77777777-7777-4777-8777-777777777777',
  false
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '88888888-8888-4888-8888-888888888888', true);
select public.claim_project_submission(
  '10000000-0000-4000-8000-000000000002'
);

select pg_temp.assert_true(
  (
    select workflow.assigned_reviewer_id
    from public.project_submission_workflow workflow
    where workflow.submission_id = '10000000-0000-4000-8000-000000000002'
  ) = '88888888-8888-4888-8888-888888888888'::uuid,
  'another active reviewer can claim released work'
);
reset role;

rollback;
