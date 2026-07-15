-- P2 project evidence: private, owner-scoped drafts with field-level LWW merge.

create table if not exists public.project_evidence (
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id text not null check (
    project_id ~ '^(p([1-9]|1[0-7])-(easy|medium|hard)|capstone-main)$'
  ),
  repository_url text not null default '' check (
    char_length(repository_url) <= 500
    and repository_url !~ '[[:space:]]'
    and (repository_url = '' or repository_url ~ '^https://[^/?#[:space:]@]+([/?#]|$)')
    and repository_url !~ '^https://[^/]*@'
  ),
  repository_url_updated_at timestamptz not null default '1970-01-01T00:00:00Z'
    check (isfinite(repository_url_updated_at)),
  demo_url text not null default '' check (
    char_length(demo_url) <= 500
    and demo_url !~ '[[:space:]]'
    and (demo_url = '' or demo_url ~ '^https://[^/?#[:space:]@]+([/?#]|$)')
    and demo_url !~ '^https://[^/]*@'
  ),
  demo_url_updated_at timestamptz not null default '1970-01-01T00:00:00Z'
    check (isfinite(demo_url_updated_at)),
  reflection text not null default '' check (char_length(reflection) <= 2000),
  reflection_updated_at timestamptz not null default '1970-01-01T00:00:00Z'
    check (isfinite(reflection_updated_at)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, project_id)
);

drop trigger if exists project_evidence_set_updated_at on public.project_evidence;
create trigger project_evidence_set_updated_at
before update on public.project_evidence
for each row execute function public.set_updated_at();

alter table public.project_evidence enable row level security;

drop policy if exists "Users can read own project evidence" on public.project_evidence;
create policy "Users can read own project evidence"
on public.project_evidence for select
using (auth.uid() = user_id);

create or replace function public.merge_project_evidence(
  project_id_input text,
  repository_url_input text,
  repository_url_updated_at_input timestamptz,
  demo_url_input text,
  demo_url_updated_at_input timestamptz,
  reflection_input text,
  reflection_updated_at_input timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  result_row public.project_evidence%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  if project_id_input is null
    or project_id_input !~ '^(p([1-9]|1[0-7])-(easy|medium|hard)|capstone-main)$'
  then
    raise exception 'invalid project evidence project id';
  end if;
  if repository_url_input is null
    or char_length(repository_url_input) > 500
    or repository_url_input ~ '[[:space:]]'
    or (
      repository_url_input <> ''
      and repository_url_input !~ '^https://[^/?#[:space:]@]+([/?#]|$)'
    )
    or repository_url_input ~ '^https://[^/]*@'
  then
    raise exception 'invalid project evidence repository URL';
  end if;
  if demo_url_input is null
    or char_length(demo_url_input) > 500
    or demo_url_input ~ '[[:space:]]'
    or (
      demo_url_input <> ''
      and demo_url_input !~ '^https://[^/?#[:space:]@]+([/?#]|$)'
    )
    or demo_url_input ~ '^https://[^/]*@'
  then
    raise exception 'invalid project evidence demo URL';
  end if;
  if reflection_input is null or char_length(reflection_input) > 2000 then
    raise exception 'invalid project evidence reflection';
  end if;
  if repository_url_updated_at_input is null
    or demo_url_updated_at_input is null
    or reflection_updated_at_input is null
    or not isfinite(repository_url_updated_at_input)
    or not isfinite(demo_url_updated_at_input)
    or not isfinite(reflection_updated_at_input)
    or repository_url_updated_at_input > now() + interval '24 hours'
    or demo_url_updated_at_input > now() + interval '24 hours'
    or reflection_updated_at_input > now() + interval '24 hours'
  then
    raise exception 'invalid project evidence timestamp';
  end if;

  insert into public.project_evidence (
    user_id,
    project_id,
    repository_url,
    repository_url_updated_at,
    demo_url,
    demo_url_updated_at,
    reflection,
    reflection_updated_at
  ) values (
    current_user_id,
    project_id_input,
    repository_url_input,
    repository_url_updated_at_input,
    demo_url_input,
    demo_url_updated_at_input,
    reflection_input,
    reflection_updated_at_input
  )
  on conflict (user_id, project_id) do update
  set repository_url = case
        when (excluded.repository_url_updated_at, excluded.repository_url) >
             (public.project_evidence.repository_url_updated_at, public.project_evidence.repository_url)
        then excluded.repository_url else public.project_evidence.repository_url end,
      repository_url_updated_at = greatest(
        public.project_evidence.repository_url_updated_at,
        excluded.repository_url_updated_at
      ),
      demo_url = case
        when (excluded.demo_url_updated_at, excluded.demo_url) >
             (public.project_evidence.demo_url_updated_at, public.project_evidence.demo_url)
        then excluded.demo_url else public.project_evidence.demo_url end,
      demo_url_updated_at = greatest(
        public.project_evidence.demo_url_updated_at,
        excluded.demo_url_updated_at
      ),
      reflection = case
        when (excluded.reflection_updated_at, excluded.reflection) >
             (public.project_evidence.reflection_updated_at, public.project_evidence.reflection)
        then excluded.reflection else public.project_evidence.reflection end,
      reflection_updated_at = greatest(
        public.project_evidence.reflection_updated_at,
        excluded.reflection_updated_at
      )
  returning * into result_row;

  return jsonb_build_object(
    'project_id', result_row.project_id,
    'repository_url', result_row.repository_url,
    'repository_url_updated_at', result_row.repository_url_updated_at,
    'demo_url', result_row.demo_url,
    'demo_url_updated_at', result_row.demo_url_updated_at,
    'reflection', result_row.reflection,
    'reflection_updated_at', result_row.reflection_updated_at
  );
end;
$$;

revoke all on table public.project_evidence from public, anon, authenticated;
grant select on table public.project_evidence to authenticated;

revoke all on function public.merge_project_evidence(
  text, text, timestamptz, text, timestamptz, text, timestamptz
) from public, anon;
grant execute on function public.merge_project_evidence(
  text, text, timestamptz, text, timestamptz, text, timestamptz
) to authenticated;
