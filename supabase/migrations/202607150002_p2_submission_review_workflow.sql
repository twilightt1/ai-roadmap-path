-- P2.1: immutable project submissions and an explicitly provisioned reviewer workflow.

create table if not exists public.project_review_requirements (
  project_id text primary key check (
    project_id ~ '^(p([1-9]|1[0-7])-(easy|medium|hard)|capstone-main)$'
  ),
  required_feature_count smallint not null check (required_feature_count between 1 and 20)
);

insert into public.project_review_requirements (project_id, required_feature_count) values
  ('p1-easy', 3), ('p1-medium', 3), ('p1-hard', 3),
  ('p2-easy', 2), ('p2-medium', 2), ('p2-hard', 3),
  ('p3-easy', 1), ('p3-medium', 2), ('p3-hard', 2),
  ('p4-easy', 2), ('p4-medium', 1), ('p4-hard', 2),
  ('p5-easy', 1), ('p5-medium', 1), ('p5-hard', 2),
  ('p6-easy', 2), ('p6-medium', 2), ('p6-hard', 2),
  ('p7-easy', 1), ('p7-medium', 1), ('p7-hard', 2),
  ('p8-easy', 1), ('p8-medium', 2), ('p8-hard', 3),
  ('p9-easy', 1), ('p9-medium', 2), ('p9-hard', 2),
  ('p10-easy', 1), ('p10-medium', 1), ('p10-hard', 1),
  ('p11-easy', 1), ('p11-medium', 2), ('p11-hard', 2),
  ('p12-easy', 2), ('p12-medium', 2), ('p12-hard', 3),
  ('p13-easy', 1), ('p13-medium', 2), ('p13-hard', 2),
  ('p14-easy', 1), ('p14-medium', 2), ('p14-hard', 2),
  ('p15-easy', 2), ('p15-medium', 1), ('p15-hard', 1),
  ('p16-easy', 1), ('p16-medium', 1), ('p16-hard', 1),
  ('p17-easy', 1), ('p17-medium', 1), ('p17-hard', 4),
  ('capstone-main', 4)
on conflict (project_id) do update
set required_feature_count = excluded.required_feature_count;

create table if not exists public.project_reviewer_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_project_reviewer()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.project_reviewer_memberships membership
    where membership.user_id = auth.uid()
  );
$$;

create table if not exists public.project_submissions (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references auth.users(id) on delete cascade,
  project_id text not null references public.project_review_requirements(project_id),
  supersedes_submission_id uuid references public.project_submissions(id) on delete restrict,
  repository_url text not null check (
    char_length(repository_url) between 1 and 500
    and repository_url !~ '[[:space:]]'
    and repository_url ~ '^https://[^/?#[:space:]@]+([/?#]|$)'
    and repository_url !~ '^https://[^/]*@'
  ),
  repository_url_updated_at timestamptz not null check (isfinite(repository_url_updated_at)),
  demo_url text not null default '' check (
    char_length(demo_url) <= 500
    and demo_url !~ '[[:space:]]'
    and (demo_url = '' or demo_url ~ '^https://[^/?#[:space:]@]+([/?#]|$)')
    and demo_url !~ '^https://[^/]*@'
  ),
  demo_url_updated_at timestamptz not null check (isfinite(demo_url_updated_at)),
  reflection text not null check (
    char_length(reflection) <= 2000
    and char_length(regexp_replace(reflection, '[[:space:]]', '', 'g')) >= 80
  ),
  reflection_updated_at timestamptz not null check (isfinite(reflection_updated_at)),
  completed_feature_count smallint not null check (completed_feature_count between 1 and 20),
  required_feature_count smallint not null check (
    required_feature_count between 1 and 20
    and completed_feature_count = required_feature_count
  ),
  rubric_version smallint not null default 1 check (rubric_version = 1),
  submitted_at timestamptz not null default now()
);

create index if not exists project_submissions_learner_project_submitted_idx
  on public.project_submissions (learner_id, project_id, submitted_at desc);

create or replace function public.reject_project_submission_update()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'project submission snapshots are immutable';
end;
$$;

drop trigger if exists project_submissions_reject_update on public.project_submissions;
create trigger project_submissions_reject_update
before update on public.project_submissions
for each row execute function public.reject_project_submission_update();

create table if not exists public.project_submission_workflow (
  submission_id uuid primary key references public.project_submissions(id) on delete cascade,
  state text not null check (state in ('pending', 'in_review', 'changes_requested', 'approved')),
  assigned_reviewer_id uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

drop trigger if exists project_submission_workflow_set_updated_at
  on public.project_submission_workflow;
create trigger project_submission_workflow_set_updated_at
before update on public.project_submission_workflow
for each row execute function public.set_updated_at();

create index if not exists project_submission_workflow_queue_idx
  on public.project_submission_workflow (state, updated_at desc);

create table if not exists public.project_submission_events (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.project_submissions(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null check (
    event_type in ('submitted', 'claimed', 'changes_requested', 'approved')
  ),
  comment text not null default '' check (char_length(comment) <= 2000),
  created_at timestamptz not null default now(),
  check (event_type <> 'changes_requested' or char_length(btrim(comment)) > 0)
);

create index if not exists project_submission_events_submission_created_idx
  on public.project_submission_events (submission_id, created_at, id);

alter table public.project_review_requirements enable row level security;
alter table public.project_reviewer_memberships enable row level security;
alter table public.project_submissions enable row level security;
alter table public.project_submission_workflow enable row level security;
alter table public.project_submission_events enable row level security;

drop policy if exists "Learners and reviewers can read project submissions"
  on public.project_submissions;
create policy "Learners and reviewers can read project submissions"
on public.project_submissions for select
using (auth.uid() = learner_id or public.is_project_reviewer());

drop policy if exists "Learners and reviewers can read submission workflow"
  on public.project_submission_workflow;
create policy "Learners and reviewers can read submission workflow"
on public.project_submission_workflow for select
using (
  public.is_project_reviewer()
  or exists (
    select 1 from public.project_submissions submission
    where submission.id = submission_id and submission.learner_id = auth.uid()
  )
);

drop policy if exists "Learners and reviewers can read submission events"
  on public.project_submission_events;
create policy "Learners and reviewers can read submission events"
on public.project_submission_events for select
using (
  public.is_project_reviewer()
  or exists (
    select 1 from public.project_submissions submission
    where submission.id = submission_id and submission.learner_id = auth.uid()
  )
);

create or replace function public.submit_project_evidence(project_id_input text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  evidence_row public.project_evidence%rowtype;
  required_count smallint;
  completed_count integer;
  latest_submission_id uuid;
  latest_state text;
  supersedes_id uuid;
  new_submission_id uuid;
  submitted_at_value timestamptz := clock_timestamp();
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select requirement.required_feature_count
  into required_count
  from public.project_review_requirements requirement
  where requirement.project_id = project_id_input;

  if required_count is null then
    raise exception 'invalid project submission project id';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(current_user_id::text || ':' || project_id_input, 0)
  );

  select submission.id, workflow.state
  into latest_submission_id, latest_state
  from public.project_submissions submission
  join public.project_submission_workflow workflow
    on workflow.submission_id = submission.id
  where submission.learner_id = current_user_id
    and submission.project_id = project_id_input
  order by submission.submitted_at desc, submission.id desc
  limit 1;

  if latest_state in ('pending', 'in_review') then
    raise exception 'project submission already active';
  end if;
  if latest_state = 'approved' then
    raise exception 'project submission already approved';
  end if;
  if latest_state = 'changes_requested' then
    supersedes_id := latest_submission_id;
  end if;

  select evidence.*
  into evidence_row
  from public.project_evidence evidence
  where evidence.user_id = current_user_id
    and evidence.project_id = project_id_input
  for share;

  if evidence_row.user_id is null
    or evidence_row.repository_url = ''
    or char_length(regexp_replace(evidence_row.reflection, '[[:space:]]', '', 'g')) < 80
  then
    raise exception 'project evidence is not ready for submission';
  end if;

  select count(*)::integer
  into completed_count
  from generate_series(0, required_count - 1) expected(feature_index)
  join public.user_progress_items item
    on item.user_id = current_user_id
   and item.scope = 'project_feature'
   and item.item_key = project_id_input || '/' || expected.feature_index::text
   and item.completed;

  if completed_count <> required_count then
    raise exception 'project feature progress is not ready for submission';
  end if;

  insert into public.project_submissions (
    learner_id,
    project_id,
    supersedes_submission_id,
    repository_url,
    repository_url_updated_at,
    demo_url,
    demo_url_updated_at,
    reflection,
    reflection_updated_at,
    completed_feature_count,
    required_feature_count,
    submitted_at
  ) values (
    current_user_id,
    project_id_input,
    supersedes_id,
    evidence_row.repository_url,
    evidence_row.repository_url_updated_at,
    evidence_row.demo_url,
    evidence_row.demo_url_updated_at,
    evidence_row.reflection,
    evidence_row.reflection_updated_at,
    required_count,
    required_count,
    submitted_at_value
  ) returning id into new_submission_id;

  insert into public.project_submission_workflow (submission_id, state, updated_at)
  values (new_submission_id, 'pending', submitted_at_value);

  insert into public.project_submission_events (
    submission_id, actor_id, event_type, created_at
  ) values (
    new_submission_id, current_user_id, 'submitted', submitted_at_value
  );

  return jsonb_build_object(
    'id', new_submission_id,
    'project_id', project_id_input,
    'supersedes_submission_id', supersedes_id,
    'state', 'pending',
    'assigned_reviewer_id', null,
    'submitted_at', submitted_at_value,
    'updated_at', submitted_at_value
  );
end;
$$;

create or replace function public.claim_project_submission(submission_id_input uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  current_state text;
  assigned_reviewer uuid;
  project_id_value text;
  supersedes_id uuid;
  submitted_at_value timestamptz;
  updated_at_value timestamptz;
begin
  if current_user_id is null or not public.is_project_reviewer() then
    raise exception 'Project reviewer access required';
  end if;

  select workflow.state,
         workflow.assigned_reviewer_id,
         submission.project_id,
         submission.supersedes_submission_id,
         submission.submitted_at
  into current_state,
       assigned_reviewer,
       project_id_value,
       supersedes_id,
       submitted_at_value
  from public.project_submission_workflow workflow
  join public.project_submissions submission
    on submission.id = workflow.submission_id
  where workflow.submission_id = submission_id_input
  for update of workflow;

  if current_state is null then
    raise exception 'project submission not found';
  end if;

  if current_state = 'pending'
    or (
      current_state = 'in_review'
      and assigned_reviewer is not null
      and not exists (
        select 1 from public.project_reviewer_memberships membership
        where membership.user_id = assigned_reviewer
      )
    )
    or (current_state = 'in_review' and assigned_reviewer is null)
  then
    update public.project_submission_workflow
    set state = 'in_review', assigned_reviewer_id = current_user_id
    where submission_id = submission_id_input
    returning updated_at into updated_at_value;

    insert into public.project_submission_events (
      submission_id, actor_id, event_type
    ) values (
      submission_id_input, current_user_id, 'claimed'
    );
  elsif current_state = 'in_review' and assigned_reviewer = current_user_id then
    select workflow.updated_at into updated_at_value
    from public.project_submission_workflow workflow
    where workflow.submission_id = submission_id_input;
  else
    raise exception 'project submission is not available to claim';
  end if;

  return jsonb_build_object(
    'id', submission_id_input,
    'project_id', project_id_value,
    'supersedes_submission_id', supersedes_id,
    'state', 'in_review',
    'assigned_reviewer_id', current_user_id,
    'submitted_at', submitted_at_value,
    'updated_at', updated_at_value
  );
end;
$$;

create or replace function public.review_project_submission(
  submission_id_input uuid,
  decision_input text,
  comment_input text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  current_state text;
  assigned_reviewer uuid;
  project_id_value text;
  supersedes_id uuid;
  submitted_at_value timestamptz;
  updated_at_value timestamptz;
  comment_value text := btrim(coalesce(comment_input, ''));
begin
  if current_user_id is null or not public.is_project_reviewer() then
    raise exception 'Project reviewer access required';
  end if;
  if decision_input is null or decision_input not in ('changes_requested', 'approved') then
    raise exception 'invalid project review decision';
  end if;
  if char_length(comment_value) > 2000
    or (decision_input = 'changes_requested' and comment_value = '')
  then
    raise exception 'invalid project review comment';
  end if;

  select workflow.state,
         workflow.assigned_reviewer_id,
         submission.project_id,
         submission.supersedes_submission_id,
         submission.submitted_at
  into current_state,
       assigned_reviewer,
       project_id_value,
       supersedes_id,
       submitted_at_value
  from public.project_submission_workflow workflow
  join public.project_submissions submission
    on submission.id = workflow.submission_id
  where workflow.submission_id = submission_id_input
  for update of workflow;

  if current_state is null then
    raise exception 'project submission not found';
  end if;
  if current_state <> 'in_review' or assigned_reviewer <> current_user_id then
    raise exception 'project submission is not assigned to this reviewer';
  end if;

  update public.project_submission_workflow
  set state = decision_input
  where submission_id = submission_id_input
  returning updated_at into updated_at_value;

  insert into public.project_submission_events (
    submission_id, actor_id, event_type, comment
  ) values (
    submission_id_input, current_user_id, decision_input, comment_value
  );

  return jsonb_build_object(
    'id', submission_id_input,
    'project_id', project_id_value,
    'supersedes_submission_id', supersedes_id,
    'state', decision_input,
    'assigned_reviewer_id', current_user_id,
    'submitted_at', submitted_at_value,
    'updated_at', updated_at_value
  );
end;
$$;

revoke all on table public.project_review_requirements
  from public, anon, authenticated;
revoke all on table public.project_reviewer_memberships
  from public, anon, authenticated;
grant select, insert, delete on table public.project_reviewer_memberships
  to service_role;
revoke all on table public.project_submissions
  from public, anon, authenticated;
revoke all on table public.project_submission_workflow
  from public, anon, authenticated;
revoke all on table public.project_submission_events
  from public, anon, authenticated;

grant select on table public.project_submissions to authenticated;
grant select on table public.project_submission_workflow to authenticated;
grant select on table public.project_submission_events to authenticated;

revoke all on function public.is_project_reviewer()
  from public, anon, authenticated;
grant execute on function public.is_project_reviewer() to authenticated;

revoke all on function public.submit_project_evidence(text)
  from public, anon, authenticated;
grant execute on function public.submit_project_evidence(text) to authenticated;

revoke all on function public.claim_project_submission(uuid)
  from public, anon, authenticated;
grant execute on function public.claim_project_submission(uuid) to authenticated;

revoke all on function public.review_project_submission(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.review_project_submission(uuid, text, text) to authenticated;
