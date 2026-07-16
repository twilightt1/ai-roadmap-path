-- P2.2: bounded reviewer queue pagination and trusted reviewer lifecycle operations.

alter table public.project_reviewer_memberships
  add column if not exists operator_alias text,
  add column if not exists revoked_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

update public.project_reviewer_memberships
set operator_alias = 'reviewer-' || substr(
  encode(extensions.digest(user_id::text, 'sha256'), 'hex'),
  1,
  16
)
where operator_alias is null;

alter table public.project_reviewer_memberships
  alter column operator_alias set default (
    'reviewer-' || substr(
      encode(
        extensions.digest(gen_random_uuid()::text, 'sha256'),
        'hex'
      ),
      1,
      16
    )
  ),
  alter column operator_alias set not null;

create unique index if not exists project_reviewer_memberships_alias_idx
  on public.project_reviewer_memberships (operator_alias);

alter table public.project_reviewer_memberships
  drop constraint if exists project_reviewer_memberships_alias_check;
alter table public.project_reviewer_memberships
  add constraint project_reviewer_memberships_alias_check check (
    operator_alias ~ '^reviewer-[0-9a-f]{16}$'
  );

drop trigger if exists project_reviewer_memberships_set_updated_at
  on public.project_reviewer_memberships;
create trigger project_reviewer_memberships_set_updated_at
before update on public.project_reviewer_memberships
for each row execute function public.set_updated_at();

create table if not exists public.project_reviewer_operations (
  id uuid primary key,
  operation text not null check (operation in ('add', 'revoke', 'restore')),
  reviewer_user_id uuid references auth.users(id) on delete set null,
  result jsonb not null check (jsonb_typeof(result) = 'object'),
  created_at timestamptz not null default now()
);

alter table public.project_reviewer_operations enable row level security;

alter table public.project_submission_events
  drop constraint if exists project_submission_events_event_type_check;
alter table public.project_submission_events
  add constraint project_submission_events_event_type_check check (
    event_type in (
      'submitted',
      'claimed',
      'changes_requested',
      'approved',
      'reviewer_released'
    )
  );

create index if not exists project_submissions_queue_order_idx
  on public.project_submissions (submitted_at, id);

create or replace function public.is_project_reviewer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.project_reviewer_memberships membership
    where membership.user_id = auth.uid()
      and membership.revoked_at is null
  );
$$;

create or replace function public.manage_project_reviewer(
  operation_id_input uuid,
  operation_input text,
  reviewer_user_id_input uuid,
  allow_last_reviewer_input boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_operation text;
  existing_reviewer_user_id uuid;
  existing_result jsonb;
  reviewer_alias_value text;
  reviewer_revoked_at timestamptz;
  operation_status text;
  released_claim_count integer := 0;
  active_reviewer_count integer := 0;
  active_queue_count integer := 0;
  result_value jsonb;
begin
  if operation_id_input is null
    or reviewer_user_id_input is null
    or operation_input is null
    or operation_input not in ('add', 'revoke', 'restore')
  then
    raise exception 'invalid reviewer operation';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('project-reviewer-lifecycle', 0)
  );

  select operation.operation,
         operation.reviewer_user_id,
         operation.result
  into existing_operation,
       existing_reviewer_user_id,
       existing_result
  from public.project_reviewer_operations operation
  where operation.id = operation_id_input;

  if found then
    if existing_operation is distinct from operation_input
      or existing_reviewer_user_id is distinct from reviewer_user_id_input
    then
      raise exception 'reviewer operation id was already used for a different request';
    end if;
    return existing_result;
  end if;

  if operation_input in ('add', 'restore')
    and not exists (
      select 1 from auth.users auth_user
      where auth_user.id = reviewer_user_id_input
    )
  then
    raise exception 'reviewer auth user not found';
  end if;

  select membership.operator_alias,
         membership.revoked_at
  into reviewer_alias_value,
       reviewer_revoked_at
  from public.project_reviewer_memberships membership
  where membership.user_id = reviewer_user_id_input
  for update;

  if operation_input = 'add' then
    if reviewer_alias_value is null then
      reviewer_alias_value := 'reviewer-' || substr(
        encode(
          extensions.digest(
            reviewer_user_id_input::text || gen_random_uuid()::text,
            'sha256'
          ),
          'hex'
        ),
        1,
        16
      );
      insert into public.project_reviewer_memberships (
        user_id,
        operator_alias
      ) values (
        reviewer_user_id_input,
        reviewer_alias_value
      );
      operation_status := 'added';
    elsif reviewer_revoked_at is null then
      operation_status := 'unchanged';
    else
      raise exception 'reviewer is revoked; use restore';
    end if;
  elsif operation_input = 'restore' then
    if reviewer_alias_value is null then
      raise exception 'reviewer membership not found; use add';
    elsif reviewer_revoked_at is null then
      operation_status := 'unchanged';
    else
      update public.project_reviewer_memberships
      set revoked_at = null
      where user_id = reviewer_user_id_input;
      operation_status := 'restored';
    end if;
  else
    if reviewer_alias_value is null then
      raise exception 'reviewer membership not found';
    elsif reviewer_revoked_at is not null then
      operation_status := 'unchanged';
    else
      select count(*)
      into active_reviewer_count
      from public.project_reviewer_memberships membership
      where membership.revoked_at is null
        and membership.user_id <> reviewer_user_id_input;

      select count(*)
      into active_queue_count
      from public.project_submission_workflow workflow
      where workflow.state in ('pending', 'in_review');

      if active_reviewer_count = 0
        and active_queue_count > 0
        and not coalesce(allow_last_reviewer_input, false)
      then
        raise exception 'cannot revoke the last active reviewer while active work exists';
      end if;

      update public.project_reviewer_memberships
      set revoked_at = clock_timestamp()
      where user_id = reviewer_user_id_input;

      with released as (
        update public.project_submission_workflow workflow
        set state = 'pending',
            assigned_reviewer_id = null
        where workflow.state = 'in_review'
          and workflow.assigned_reviewer_id = reviewer_user_id_input
        returning workflow.submission_id
      )
      insert into public.project_submission_events (
        submission_id,
        actor_id,
        event_type
      )
      select released.submission_id,
             null,
             'reviewer_released'
      from released;

      get diagnostics released_claim_count = row_count;
      operation_status := 'revoked';
    end if;
  end if;

  select count(*)
  into active_reviewer_count
  from public.project_reviewer_memberships membership
  where membership.revoked_at is null;

  select count(*)
  into active_queue_count
  from public.project_submission_workflow workflow
  where workflow.state in ('pending', 'in_review');

  result_value := jsonb_build_object(
    'operation_id', operation_id_input,
    'operation', operation_input,
    'reviewer_alias', reviewer_alias_value,
    'status', operation_status,
    'released_claim_count', released_claim_count,
    'active_reviewer_count', active_reviewer_count,
    'active_queue_count', active_queue_count
  );

  insert into public.project_reviewer_operations (
    id,
    operation,
    reviewer_user_id,
    result
  ) values (
    operation_id_input,
    operation_input,
    reviewer_user_id_input,
    result_value
  );

  return result_value;
end;
$$;

create or replace function public.list_project_review_queue_page(
  page_size_input integer default 10,
  cursor_submitted_at_input timestamptz default null,
  cursor_submission_id_input uuid default null
)
returns table (
  id uuid,
  learner_id uuid,
  project_id text,
  supersedes_submission_id uuid,
  repository_url text,
  repository_url_updated_at timestamptz,
  demo_url text,
  demo_url_updated_at timestamptz,
  reflection text,
  reflection_updated_at timestamptz,
  completed_feature_count smallint,
  required_feature_count smallint,
  rubric_version smallint,
  submitted_at timestamptz,
  state text,
  assigned_reviewer_id uuid,
  updated_at timestamptz,
  assigned_reviewer_active boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null
    or not exists (
      select 1
      from public.project_reviewer_memberships membership
      where membership.user_id = auth.uid()
        and membership.revoked_at is null
    )
  then
    raise exception 'Project reviewer access required';
  end if;

  if page_size_input is null
    or page_size_input < 1
    or page_size_input > 25
  then
    raise exception 'invalid reviewer queue page size';
  end if;

  if (cursor_submitted_at_input is null)
      <> (cursor_submission_id_input is null)
    or (
      cursor_submitted_at_input is not null
      and not isfinite(cursor_submitted_at_input)
    )
  then
    raise exception 'invalid reviewer queue cursor';
  end if;

  return query
  select submission.id,
         submission.learner_id,
         submission.project_id,
         submission.supersedes_submission_id,
         submission.repository_url,
         submission.repository_url_updated_at,
         submission.demo_url,
         submission.demo_url_updated_at,
         submission.reflection,
         submission.reflection_updated_at,
         submission.completed_feature_count,
         submission.required_feature_count,
         submission.rubric_version,
         submission.submitted_at,
         workflow.state,
         workflow.assigned_reviewer_id,
         workflow.updated_at,
         workflow.assigned_reviewer_id is not null
           and exists (
             select 1
             from public.project_reviewer_memberships assignee
             where assignee.user_id = workflow.assigned_reviewer_id
               and assignee.revoked_at is null
           ) as assigned_reviewer_active
  from public.project_submission_workflow workflow
  join public.project_submissions submission
    on submission.id = workflow.submission_id
  where workflow.state in ('pending', 'in_review')
    and (
      cursor_submitted_at_input is null
      or (submission.submitted_at, submission.id)
        > (cursor_submitted_at_input, cursor_submission_id_input)
    )
  order by submission.submitted_at asc,
           submission.id asc
  limit page_size_input + 1;
end;
$$;

create or replace function public.claim_project_submission(submission_id_input uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
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
          and membership.revoked_at is null
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

revoke all on table public.project_reviewer_operations
  from public, anon, authenticated;
revoke all on table public.project_reviewer_operations
  from service_role;
grant select on table public.project_reviewer_operations to service_role;

revoke all on table public.project_reviewer_memberships
  from service_role;
grant select on table public.project_reviewer_memberships to service_role;
grant select on table public.project_submission_workflow to service_role;

revoke all on function public.manage_project_reviewer(uuid, text, uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.manage_project_reviewer(uuid, text, uuid, boolean)
  to service_role;

revoke all on function public.list_project_review_queue_page(integer, timestamptz, uuid)
  from public, anon, authenticated;
grant execute on function public.list_project_review_queue_page(integer, timestamptz, uuid)
  to authenticated;
