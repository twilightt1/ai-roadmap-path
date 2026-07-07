create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.preserve_profile_role()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.role = old.role;
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  role text not null default 'learner' check (role in ('learner', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  alter column role set default 'learner';

drop trigger if exists profiles_preserve_role on public.profiles;
create trigger profiles_preserve_role
before update on public.profiles
for each row execute function public.preserve_profile_role();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create table if not exists public.user_progress_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  completed text[] not null default '{}',
  project_features text[] not null default '{}',
  quiz_results jsonb not null default '{}'::jsonb,
  challenge_results jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  last_visit timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists user_progress_state_set_updated_at on public.user_progress_state;
create trigger user_progress_state_set_updated_at
before update on public.user_progress_state
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, display_name, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url',
    'learner'
  )
  on conflict (id) do nothing;

  insert into public.user_progress_state (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_slug text not null,
  status text not null default 'completed' check (status in ('not_started', 'in_progress', 'completed')),
  progress_percent integer not null default 100 check (progress_percent between 0 and 100),
  last_seen_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_slug)
);

create index if not exists lesson_progress_user_status_idx on public.lesson_progress (user_id, status);
drop trigger if exists lesson_progress_set_updated_at on public.lesson_progress;
create trigger lesson_progress_set_updated_at
before update on public.lesson_progress
for each row execute function public.set_updated_at();

create table if not exists public.topic_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_slug text not null,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'completed')),
  completed_lessons integer not null default 0 check (completed_lessons >= 0),
  total_lessons integer not null default 0 check (total_lessons >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, topic_slug),
  constraint topic_progress_lessons_consistent check (completed_lessons <= total_lessons)
);

do $$
begin
  alter table public.topic_progress
    add constraint topic_progress_lessons_consistent check (completed_lessons <= total_lessons);
exception
  when duplicate_object then null;
end;
$$;

create index if not exists topic_progress_user_status_idx on public.topic_progress (user_id, status);
drop trigger if exists topic_progress_set_updated_at on public.topic_progress;
create trigger topic_progress_set_updated_at
before update on public.topic_progress
for each row execute function public.set_updated_at();

create table if not exists public.project_feature_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id text not null,
  feature_index integer not null check (feature_index >= 0),
  feature_key text not null,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, project_id, feature_index),
  unique (user_id, feature_key)
);

alter table public.project_feature_progress
  add column if not exists updated_at timestamptz not null default now();

create index if not exists project_feature_progress_user_project_idx on public.project_feature_progress (user_id, project_id);
drop trigger if exists project_feature_progress_set_updated_at on public.project_feature_progress;
create trigger project_feature_progress_set_updated_at
before update on public.project_feature_progress
for each row execute function public.set_updated_at();

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_slug text not null,
  score integer not null check (score >= 0),
  total integer not null check (total > 0),
  answers jsonb not null default '{}'::jsonb,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quiz_attempts_score_total_consistent check (score between 0 and total)
);

alter table public.quiz_attempts
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  alter table public.quiz_attempts
    add constraint quiz_attempts_total_positive check (total > 0);
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter table public.quiz_attempts
    add constraint quiz_attempts_score_total_consistent check (score between 0 and total);
exception
  when duplicate_object then null;
end;
$$;

create index if not exists quiz_attempts_user_quiz_idx on public.quiz_attempts (user_id, quiz_slug, completed_at desc);
drop trigger if exists quiz_attempts_set_updated_at on public.quiz_attempts;
create trigger quiz_attempts_set_updated_at
before update on public.quiz_attempts
for each row execute function public.set_updated_at();

create table if not exists public.challenge_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_slug text not null,
  status text not null check (status in ('started', 'passed', 'failed')),
  language text not null default 'python',
  code text,
  test_results jsonb not null default '{}'::jsonb,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.challenge_attempts
  add column if not exists updated_at timestamptz not null default now();

create index if not exists challenge_attempts_user_challenge_idx on public.challenge_attempts (user_id, challenge_slug, submitted_at desc);
drop trigger if exists challenge_attempts_set_updated_at on public.challenge_attempts;
create trigger challenge_attempts_set_updated_at
before update on public.challenge_attempts
for each row execute function public.set_updated_at();

create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('lesson', 'topic', 'quiz', 'challenge', 'project')),
  target_slug text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, target_type, target_slug)
);

alter table public.bookmarks
  add column if not exists updated_at timestamptz not null default now();

create index if not exists bookmarks_user_created_idx on public.bookmarks (user_id, created_at desc);
drop trigger if exists bookmarks_set_updated_at on public.bookmarks;
create trigger bookmarks_set_updated_at
before update on public.bookmarks
for each row execute function public.set_updated_at();

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_slug text not null,
  content text not null check (char_length(content) <= 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_user_lesson_idx on public.notes (user_id, lesson_slug, updated_at desc);
drop trigger if exists notes_set_updated_at on public.notes;
create trigger notes_set_updated_at
before update on public.notes
for each row execute function public.set_updated_at();

create table if not exists public.saved_snippets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) <= 120),
  language text not null,
  code text not null check (char_length(code) <= 100000),
  lesson_slug text,
  challenge_slug text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists saved_snippets_user_updated_idx on public.saved_snippets (user_id, updated_at desc);
drop trigger if exists saved_snippets_set_updated_at on public.saved_snippets;
create trigger saved_snippets_set_updated_at
before update on public.saved_snippets
for each row execute function public.set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.preserve_profile_role() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

alter table public.profiles enable row level security;
alter table public.user_progress_state enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.topic_progress enable row level security;
alter table public.project_feature_progress enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.challenge_attempts enable row level security;
alter table public.bookmarks enable row level security;
alter table public.notes enable row level security;
alter table public.saved_snippets enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile" on public.profiles for select using (auth.uid() = id);
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id and role = 'learner');

drop policy if exists "Users can read own progress state" on public.user_progress_state;
create policy "Users can read own progress state" on public.user_progress_state for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own progress state" on public.user_progress_state;
create policy "Users can insert own progress state" on public.user_progress_state for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own progress state" on public.user_progress_state;
create policy "Users can update own progress state" on public.user_progress_state for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete own progress state" on public.user_progress_state;
create policy "Users can delete own progress state" on public.user_progress_state for delete using (auth.uid() = user_id);

drop policy if exists "Users can read own lesson progress" on public.lesson_progress;
create policy "Users can read own lesson progress" on public.lesson_progress for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own lesson progress" on public.lesson_progress;
create policy "Users can insert own lesson progress" on public.lesson_progress for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own lesson progress" on public.lesson_progress;
create policy "Users can update own lesson progress" on public.lesson_progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete own lesson progress" on public.lesson_progress;
create policy "Users can delete own lesson progress" on public.lesson_progress for delete using (auth.uid() = user_id);

drop policy if exists "Users can read own topic progress" on public.topic_progress;
create policy "Users can read own topic progress" on public.topic_progress for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own topic progress" on public.topic_progress;
create policy "Users can insert own topic progress" on public.topic_progress for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own topic progress" on public.topic_progress;
create policy "Users can update own topic progress" on public.topic_progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete own topic progress" on public.topic_progress;
create policy "Users can delete own topic progress" on public.topic_progress for delete using (auth.uid() = user_id);

drop policy if exists "Users can read own project feature progress" on public.project_feature_progress;
create policy "Users can read own project feature progress" on public.project_feature_progress for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own project feature progress" on public.project_feature_progress;
create policy "Users can insert own project feature progress" on public.project_feature_progress for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own project feature progress" on public.project_feature_progress;
create policy "Users can update own project feature progress" on public.project_feature_progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete own project feature progress" on public.project_feature_progress;
create policy "Users can delete own project feature progress" on public.project_feature_progress for delete using (auth.uid() = user_id);

drop policy if exists "Users can read own quiz attempts" on public.quiz_attempts;
create policy "Users can read own quiz attempts" on public.quiz_attempts for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own quiz attempts" on public.quiz_attempts;
create policy "Users can insert own quiz attempts" on public.quiz_attempts for insert with check (auth.uid() = user_id);
drop policy if exists "Users can delete own quiz attempts" on public.quiz_attempts;
create policy "Users can delete own quiz attempts" on public.quiz_attempts for delete using (auth.uid() = user_id);

drop policy if exists "Users can read own challenge attempts" on public.challenge_attempts;
create policy "Users can read own challenge attempts" on public.challenge_attempts for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own challenge attempts" on public.challenge_attempts;
create policy "Users can insert own challenge attempts" on public.challenge_attempts for insert with check (auth.uid() = user_id);
drop policy if exists "Users can delete own challenge attempts" on public.challenge_attempts;
create policy "Users can delete own challenge attempts" on public.challenge_attempts for delete using (auth.uid() = user_id);

drop policy if exists "Users can read own bookmarks" on public.bookmarks;
create policy "Users can read own bookmarks" on public.bookmarks for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own bookmarks" on public.bookmarks;
create policy "Users can insert own bookmarks" on public.bookmarks for insert with check (auth.uid() = user_id);
drop policy if exists "Users can delete own bookmarks" on public.bookmarks;
create policy "Users can delete own bookmarks" on public.bookmarks for delete using (auth.uid() = user_id);

drop policy if exists "Users can read own notes" on public.notes;
create policy "Users can read own notes" on public.notes for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own notes" on public.notes;
create policy "Users can insert own notes" on public.notes for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own notes" on public.notes;
create policy "Users can update own notes" on public.notes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete own notes" on public.notes;
create policy "Users can delete own notes" on public.notes for delete using (auth.uid() = user_id);

drop policy if exists "Users can read own saved snippets" on public.saved_snippets;
create policy "Users can read own saved snippets" on public.saved_snippets for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own saved snippets" on public.saved_snippets;
create policy "Users can insert own saved snippets" on public.saved_snippets for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own saved snippets" on public.saved_snippets;
create policy "Users can update own saved snippets" on public.saved_snippets for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete own saved snippets" on public.saved_snippets;
create policy "Users can delete own saved snippets" on public.saved_snippets for delete using (auth.uid() = user_id);
