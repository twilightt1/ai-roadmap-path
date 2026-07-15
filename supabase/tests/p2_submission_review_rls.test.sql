-- P2.1 immutable submission, reviewer allow-list, RLS, and transition assertions.
-- The transaction is compatible with local psql and `supabase db query --linked`.

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
    '33333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated',
    'p2-submission-learner@example.test', crypt('not-used-in-db-tests', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}', '{}'
  ),
  (
    '44444444-4444-4444-8444-444444444444', 'authenticated', 'authenticated',
    'p2-submission-reviewer-a@example.test', crypt('not-used-in-db-tests', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}', '{}'
  ),
  (
    '55555555-5555-4555-8555-555555555555', 'authenticated', 'authenticated',
    'p2-submission-reviewer-b@example.test', crypt('not-used-in-db-tests', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}', '{}'
  ),
  (
    '66666666-6666-4666-8666-666666666666', 'authenticated', 'authenticated',
    'p2-submission-outsider@example.test', crypt('not-used-in-db-tests', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}', '{}'
  )
on conflict (id) do nothing;

insert into public.project_reviewer_memberships (user_id) values
  ('44444444-4444-4444-8444-444444444444'),
  ('55555555-5555-4555-8555-555555555555')
on conflict (user_id) do nothing;

select pg_temp.assert_true(
  (select count(*) from public.project_review_requirements) = 52
  and (
    select required_feature_count from public.project_review_requirements
    where project_id = 'p1-easy'
  ) = 3,
  'review requirements match the bounded 52-project catalog'
);

select pg_temp.assert_true(
  not has_function_privilege('anon', 'public.submit_project_evidence(text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.claim_project_submission(uuid)', 'EXECUTE')
  and not has_function_privilege(
    'anon', 'public.review_project_submission(uuid, text, text)', 'EXECUTE'
  )
  and not has_function_privilege('anon', 'public.is_project_reviewer()', 'EXECUTE'),
  'anonymous users cannot call submission or reviewer RPCs'
);

select pg_temp.assert_true(
  not has_table_privilege('authenticated', 'public.project_submissions', 'INSERT')
  and not has_table_privilege('authenticated', 'public.project_submissions', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.project_submissions', 'DELETE')
  and not has_table_privilege('authenticated', 'public.project_submission_workflow', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.project_submission_events', 'INSERT'),
  'browser clients cannot bypass submission and workflow RPCs'
);

select pg_temp.assert_true(
  not has_table_privilege(
    'authenticated', 'public.project_reviewer_memberships', 'SELECT'
  )
  and not has_table_privilege(
    'authenticated', 'public.project_review_requirements', 'SELECT'
  ),
  'reviewer membership and server requirement catalogs are not browser-readable'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
select public.merge_project_evidence(
  'p1-easy',
  'https://github.com/learner/immutable-project',
  '2026-07-15T10:00:00Z'::timestamptz,
  'https://demo.example.test/immutable-project',
  '2026-07-15T10:00:00Z'::timestamptz,
  'I separated the domain model from transport concerns so retries remain deterministic and provider changes do not alter the core behavior.',
  '2026-07-15T10:00:00Z'::timestamptz
);
reset role;

insert into public.user_progress_items (
  user_id, scope, item_key, completed, client_updated_at, mutation_id, sync_epoch
) values
  (
    '33333333-3333-4333-8333-333333333333', 'project_feature', 'p1-easy/0', true,
    '2026-07-15T10:00:00Z', '70000000-0000-4000-8000-000000000001', 0
  ),
  (
    '33333333-3333-4333-8333-333333333333', 'project_feature', 'p1-easy/1', true,
    '2026-07-15T10:00:00Z', '70000000-0000-4000-8000-000000000002', 0
  ),
  (
    '33333333-3333-4333-8333-333333333333', 'project_feature', 'p1-easy/2', true,
    '2026-07-15T10:00:00Z', '70000000-0000-4000-8000-000000000003', 0
  );

set local role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
select public.submit_project_evidence('p1-easy');
select pg_temp.assert_true(
  (select count(*) from public.project_submissions) = 1
  and (select repository_url from public.project_submissions) =
    'https://github.com/learner/immutable-project'
  and (select completed_feature_count from public.project_submissions) = 3
  and (select required_feature_count from public.project_submissions) = 3,
  'learner submission copies server-owned evidence and canonical feature progress'
);
select pg_temp.assert_true(
  (select state from public.project_submission_workflow) = 'pending'
  and (select count(*) from public.project_submission_events) = 1
  and (select event_type from public.project_submission_events) = 'submitted',
  'submission atomically creates pending state and an audit event'
);
reset role;

do $$
begin
  update public.project_submissions
  set repository_url = 'https://example.test/mutated';
  raise exception 'FAIL: immutable snapshot update was accepted';
exception
  when others then
    if sqlerrm = 'FAIL: immutable snapshot update was accepted'
      or position('immutable' in sqlerrm) = 0
    then
      raise;
    end if;
end;
$$;

select pg_temp.assert_true(
  (select repository_url from public.project_submissions) =
    'https://github.com/learner/immutable-project',
  'snapshot update trigger preserves immutable evidence'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '66666666-6666-4666-8666-666666666666', true);
select pg_temp.assert_true(
  (select count(*) from public.project_submissions) = 0
  and (select count(*) from public.project_submission_workflow) = 0
  and (select count(*) from public.project_submission_events) = 0,
  'non-reviewers cannot read another learner submission or workflow'
);
do $$
begin
  perform public.claim_project_submission(
    '77777777-7777-4777-8777-777777777777'::uuid
  );
  raise exception 'FAIL: non-reviewer claimed a project submission';
exception
  when others then
    if sqlerrm = 'FAIL: non-reviewer claimed a project submission' then
      raise;
    end if;
end;
$$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '44444444-4444-4444-8444-444444444444', true);
select pg_temp.assert_true(
  public.is_project_reviewer()
  and (select count(*) from public.project_submissions) = 1,
  'allow-listed reviewers can read the private review queue'
);
select public.claim_project_submission(
  (select id from public.project_submissions order by submitted_at desc limit 1)
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '55555555-5555-4555-8555-555555555555', true);
do $$
begin
  perform public.claim_project_submission(
    (select id from public.project_submissions order by submitted_at desc limit 1)
  );
  raise exception 'FAIL: a second reviewer stole an active claim';
exception
  when others then
    if sqlerrm = 'FAIL: a second reviewer stole an active claim' then
      raise;
    end if;
end;
$$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '44444444-4444-4444-8444-444444444444', true);
do $$
begin
  perform public.review_project_submission(
    (select id from public.project_submissions order by submitted_at desc limit 1),
    'changes_requested',
    '   '
  );
  raise exception 'FAIL: an empty change-request comment was accepted';
exception
  when others then
    if sqlerrm = 'FAIL: an empty change-request comment was accepted' then
      raise;
    end if;
end;
$$;
do $$
begin
  perform public.review_project_submission(
    (select id from public.project_submissions order by submitted_at desc limit 1),
    null,
    ''
  );
  raise exception 'FAIL: a null review decision was accepted';
exception
  when others then
    if sqlerrm = 'FAIL: a null review decision was accepted' then
      raise;
    end if;
end;
$$;
select public.review_project_submission(
  (select id from public.project_submissions order by submitted_at desc limit 1),
  'changes_requested',
  'Please document the retry boundary and add one failure-path test.'
);
reset role;

select pg_temp.assert_true(
  (select state from public.project_submission_workflow) = 'changes_requested'
  and (select count(*) from public.project_submission_events) = 3,
  'assigned reviewer records a bounded change request with an audit event'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
select public.merge_project_evidence(
  'p1-easy',
  'https://github.com/learner/immutable-project-v2',
  now(),
  'https://demo.example.test/immutable-project-v2',
  now(),
  'I added an explicit retry boundary, documented failure ownership, and covered the timeout path without changing the immutable first submission.',
  now()
);
select public.submit_project_evidence('p1-easy');
reset role;

select pg_temp.assert_true(
  (select count(*) from public.project_submissions) = 2
  and (
    select count(*) from public.project_submissions
    where supersedes_submission_id is not null
  ) = 1
  and (
    select repository_url from public.project_submissions
    where supersedes_submission_id is null
  ) = 'https://github.com/learner/immutable-project'
  and (
    select repository_url from public.project_submissions
    where supersedes_submission_id is not null
  ) = 'https://github.com/learner/immutable-project-v2',
  'change request permits a superseding snapshot without mutating the original'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '44444444-4444-4444-8444-444444444444', true);
select public.claim_project_submission(
  (select id from public.project_submissions where supersedes_submission_id is not null)
);
select public.review_project_submission(
  (select id from public.project_submissions where supersedes_submission_id is not null),
  'approved',
  'Evidence is complete for this manual review.'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
do $$
begin
  perform public.submit_project_evidence('p1-easy');
  raise exception 'FAIL: approved project accepted another submission';
exception
  when others then
    if sqlerrm = 'FAIL: approved project accepted another submission' then
      raise;
    end if;
end;
$$;

select public.merge_project_evidence(
  'p3-easy',
  'https://github.com/learner/incomplete-project',
  now(),
  '',
  now(),
  'This evidence has enough reflection content but intentionally lacks canonical feature progress so the database must reject submission.',
  now()
);
do $$
begin
  perform public.submit_project_evidence('p3-easy');
  raise exception 'FAIL: incomplete canonical progress was accepted';
exception
  when others then
    if sqlerrm = 'FAIL: incomplete canonical progress was accepted' then
      raise;
    end if;
end;
$$;
reset role;

select pg_temp.assert_true(
  (select count(*) from public.project_submissions) = 2
  and (select count(*) from public.project_submission_events) = 6
  and (
    select count(*) from public.project_submission_workflow where state = 'approved'
  ) = 1,
  'approval closes the workflow and incomplete submissions remain atomic'
);

rollback;
