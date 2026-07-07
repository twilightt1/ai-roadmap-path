# Supabase User Data Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Supabase Auth + PostgreSQL persistence for production user data while preserving the current anonymous `localStorage` experience and static MDX/JSON content model.

**Architecture:** Keep content static and keep existing UI components calling `useProgress()` synchronously. Add Supabase as an authenticated remote persistence layer: anonymous users use local storage; authenticated users hydrate from Supabase, merge local data, then persist progress/attempt state to Postgres. MongoDB remains a planned future content/draft/generated-data layer and is not part of this runtime implementation.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict mode, Supabase Auth/PostgreSQL/RLS, `@supabase/ssr`, `@supabase/supabase-js`, Vitest for pure merge/config tests, existing Tailwind v4 UI.

---

## Scope Check

The approved design covers auth, database schema, progress sync, attempts, bookmarks, notes, snippets, production env, and future MongoDB. To keep the first implementation shippable, this plan implements the production foundation plus the existing app's active user-data surfaces:

- Supabase env/config and site URL production fix.
- Supabase SQL migration with RLS for all Phase 1 user-data tables.
- Auth UI and session refresh baseline.
- Existing progress, project-feature, quiz-result, and challenge-result flows backed by Supabase for authenticated users.
- Quiz/challenge attempts written to normalized attempt tables.
- Bookmark/note/snippet tables are created with RLS in this plan; UI wiring for new bookmark/note/snippet product surfaces should be a follow-up plan because those features do not currently exist as established UI flows in the repo.

MongoDB is documented/configured as future only. Do not install a Mongo client in this plan.

---

## File Structure

### Files to create

| File | Responsibility |
|---|---|
| `.env.example` | Documents production/local env vars for site URL, Supabase, future Mongo. |
| `vitest.config.ts` | Pure TypeScript test runner config. |
| `lib/site-url.ts` | Normalizes `NEXT_PUBLIC_SITE_URL` and builds absolute URLs. |
| `lib/site-url.test.ts` | Tests site URL normalization. |
| `supabase/migrations/202607060001_user_data.sql` | Supabase schema, triggers, indexes, and RLS policies. |
| `lib/supabase/client.ts` | Browser Supabase client factory with safe unconfigured fallback. |
| `lib/supabase/server.ts` | Server Supabase client factory for server actions/components/route handlers. |
| `lib/supabase/middleware.ts` | Session refresh helper for Next middleware. |
| `middleware.ts` | Next middleware invoking Supabase session refresh. |
| `components/auth/auth-button.tsx` | Navbar auth status/sign-in/sign-out control. |
| `components/auth/login-form.tsx` | Email/password sign-in/sign-up form. |
| `app/login/page.tsx` | Login route wrapping the login form. |
| `lib/progress-types.ts` | Shared progress state/result/input types and empty/clone helpers. |
| `lib/progress-local-storage.ts` | Existing localStorage persistence extracted from `lib/progress.ts`. |
| `lib/progress-sync.ts` | Deterministic local/remote merge rules. |
| `lib/progress-sync.test.ts` | Tests for merge rules. |
| `lib/progress-remote.ts` | Supabase progress snapshot + normalized attempt writers. |

### Files to modify

| File | Responsibility |
|---|---|
| `package.json` | Add Supabase deps, Vitest, `typecheck`, and test scripts. |
| `pnpm-lock.yaml` | Updated by pnpm. |
| `app/layout.tsx` | Use `siteUrl` helper for `metadataBase`. |
| `app/sitemap.ts` | Use `absoluteUrl()` instead of hardcoded local domain. |
| `app/robots.ts` | Use `absoluteUrl()` instead of hardcoded local domain. |
| `components/layout/navbar.tsx` | Add auth button to desktop/mobile nav. |
| `lib/progress.ts` | Keep public `useProgress()` API but switch persistence to local/Supabase hybrid. |
| `components/quiz/quiz-card.tsx` | Pass selected answers to `setQuizResult()` for attempt persistence. |
| `components/challenge/challenge-view.tsx` | Record challenge attempt payloads through progress store. |
| `components/challenge/challenge-editor.tsx` | Pass code and submit result to the solved callback. |
| `README.md` | Update production database/auth notes away from Prisma/NextAuth-first wording. |

### Files not to touch

- Do not touch the existing deleted `taste-skill-temp` working-tree change unless the user explicitly asks.
- Do not move MDX/JSON content into a database.
- Do not install or use MongoDB packages in this phase.

---

## Task 1: Add dependencies, scripts, env example, and production site URL helper

**Files:**
- Modify: `package.json`
- Create: `.env.example`
- Create: `vitest.config.ts`
- Create: `lib/site-url.ts`
- Create: `lib/site-url.test.ts`
- Modify: `app/layout.tsx`
- Modify: `app/sitemap.ts`
- Modify: `app/robots.ts`

- [ ] **Step 1: Install dependencies**

Run from repo root:

```bash
cd "D:\ZCode Data\AI_learining_platform"
pnpm add @supabase/supabase-js @supabase/ssr
pnpm add -D vitest
```

Expected: `package.json` and `pnpm-lock.yaml` update. No source files change yet.

- [ ] **Step 2: Add scripts to `package.json`**

Replace the existing scripts block with:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "postbuild": "pagefind --site .next/server/app --output-path public/pagefind",
  "start": "next start",
  "lint": "eslint",
  "typecheck": "tsc --noEmit",
  "test": "vitest",
  "test:run": "vitest run"
}
```

- [ ] **Step 3: Create `.env.example`**

Create `.env.example` with exactly:

```env
# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Server-only. Never expose this to browser code.
SUPABASE_SERVICE_ROLE_KEY=

# Future optional MongoDB integration. Not used by Phase 1 runtime.
MONGODB_URI=
MONGODB_DB_NAME=ai_learning_platform
```

- [ ] **Step 4: Create Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["**/*.test.ts"],
  },
});
```

- [ ] **Step 5: Write failing tests for site URL normalization**

Create `lib/site-url.test.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest";
import { absoluteUrl, getSiteUrl } from "./site-url";

const original = process.env.NEXT_PUBLIC_SITE_URL;

afterEach(() => {
  if (original === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = original;
});

describe("site-url", () => {
  it("defaults to localhost when NEXT_PUBLIC_SITE_URL is missing", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(getSiteUrl()).toBe("http://localhost:3000");
  });

  it("normalizes a configured URL by removing trailing slashes", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com///";
    expect(getSiteUrl()).toBe("https://example.com");
  });

  it("builds absolute URLs for root and nested paths", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://learn.example.com";
    expect(absoluteUrl("/")).toBe("https://learn.example.com/");
    expect(absoluteUrl("/sitemap.xml")).toBe("https://learn.example.com/sitemap.xml");
    expect(absoluteUrl("roadmap")).toBe("https://learn.example.com/roadmap");
  });

  it("falls back to localhost for invalid configured URLs", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "not a url";
    expect(getSiteUrl()).toBe("http://localhost:3000");
  });
});
```

- [ ] **Step 6: Run the site URL test and verify it fails**

Run:

```bash
pnpm test:run lib/site-url.test.ts
```

Expected: FAIL because `lib/site-url.ts` does not exist.

- [ ] **Step 7: Implement `lib/site-url.ts`**

Create `lib/site-url.ts`:

```ts
const DEFAULT_SITE_URL = "http://localhost:3000";

function normalizeSiteUrl(raw: string | undefined): string {
  const value = raw?.trim() || DEFAULT_SITE_URL;

  try {
    const parsed = new URL(value);
    return parsed.origin.replace(/\/+$/, "");
  } catch {
    return DEFAULT_SITE_URL;
  }
}

export function getSiteUrl(): string {
  return normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
}

export function absoluteUrl(path = "/"): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, `${getSiteUrl()}/`).toString();
}

export const siteUrl = getSiteUrl();
```

- [ ] **Step 8: Replace hardcoded local site URL usage**

In `app/layout.tsx`, remove:

```ts
const siteUrl = "https://ai-roadmap.local";
```

Add this import near the existing imports:

```ts
import { siteUrl } from "@/lib/site-url";
```

Keep metadata using the imported value:

```ts
metadataBase: new URL(siteUrl),
```

In `app/sitemap.ts`, replace:

```ts
const siteUrl = "https://ai-roadmap.local";
```

with:

```ts
import { absoluteUrl } from "@/lib/site-url";
```

Then replace:

```ts
url: `${siteUrl}${r.url}`,
```

with:

```ts
url: absoluteUrl(r.url),
```

In `app/robots.ts`, replace the whole file with:

```ts
import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
```

- [ ] **Step 9: Verify tests and checks**

Run:

```bash
pnpm test:run lib/site-url.test.ts
pnpm typecheck
pnpm lint
```

Expected: all pass.

- [ ] **Step 10: Commit checkpoint if commits are authorized**

```bash
git add package.json pnpm-lock.yaml .env.example vitest.config.ts lib/site-url.ts lib/site-url.test.ts app/layout.tsx app/sitemap.ts app/robots.ts
git commit -m "feat: add production env and site url config"
```

---

## Task 2: Add Supabase SQL schema and RLS policies

**Files:**
- Create: `supabase/migrations/202607060001_user_data.sql`

- [ ] **Step 1: Create migration directory**

Run:

```bash
mkdir -p supabase/migrations
```

- [ ] **Step 2: Create the SQL migration**

Create `supabase/migrations/202607060001_user_data.sql`:

```sql
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
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

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.user_progress_state (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

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

create trigger user_progress_state_set_updated_at
before update on public.user_progress_state
for each row execute function public.set_updated_at();

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
  unique (user_id, topic_slug)
);

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
  unique (user_id, project_id, feature_index),
  unique (user_id, feature_key)
);

create index if not exists project_feature_progress_user_project_idx on public.project_feature_progress (user_id, project_id);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_slug text not null,
  score integer not null check (score >= 0),
  total integer not null check (total >= 0),
  answers jsonb not null default '{}'::jsonb,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists quiz_attempts_user_quiz_idx on public.quiz_attempts (user_id, quiz_slug, completed_at desc);

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
  created_at timestamptz not null default now()
);

create index if not exists challenge_attempts_user_challenge_idx on public.challenge_attempts (user_id, challenge_slug, submitted_at desc);

create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('lesson', 'topic', 'quiz', 'challenge', 'project')),
  target_slug text not null,
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_slug)
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_slug text not null,
  content text not null check (char_length(content) <= 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_user_lesson_idx on public.notes (user_id, lesson_slug, updated_at desc);
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
create trigger saved_snippets_set_updated_at
before update on public.saved_snippets
for each row execute function public.set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

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

create policy "Users can read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

create policy "Users can read own progress state" on public.user_progress_state for select using (auth.uid() = user_id);
create policy "Users can insert own progress state" on public.user_progress_state for insert with check (auth.uid() = user_id);
create policy "Users can update own progress state" on public.user_progress_state for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own progress state" on public.user_progress_state for delete using (auth.uid() = user_id);

create policy "Users can read own lesson progress" on public.lesson_progress for select using (auth.uid() = user_id);
create policy "Users can insert own lesson progress" on public.lesson_progress for insert with check (auth.uid() = user_id);
create policy "Users can update own lesson progress" on public.lesson_progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own lesson progress" on public.lesson_progress for delete using (auth.uid() = user_id);

create policy "Users can read own topic progress" on public.topic_progress for select using (auth.uid() = user_id);
create policy "Users can insert own topic progress" on public.topic_progress for insert with check (auth.uid() = user_id);
create policy "Users can update own topic progress" on public.topic_progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own topic progress" on public.topic_progress for delete using (auth.uid() = user_id);

create policy "Users can read own project feature progress" on public.project_feature_progress for select using (auth.uid() = user_id);
create policy "Users can insert own project feature progress" on public.project_feature_progress for insert with check (auth.uid() = user_id);
create policy "Users can update own project feature progress" on public.project_feature_progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own project feature progress" on public.project_feature_progress for delete using (auth.uid() = user_id);

create policy "Users can read own quiz attempts" on public.quiz_attempts for select using (auth.uid() = user_id);
create policy "Users can insert own quiz attempts" on public.quiz_attempts for insert with check (auth.uid() = user_id);
create policy "Users can delete own quiz attempts" on public.quiz_attempts for delete using (auth.uid() = user_id);

create policy "Users can read own challenge attempts" on public.challenge_attempts for select using (auth.uid() = user_id);
create policy "Users can insert own challenge attempts" on public.challenge_attempts for insert with check (auth.uid() = user_id);
create policy "Users can delete own challenge attempts" on public.challenge_attempts for delete using (auth.uid() = user_id);

create policy "Users can read own bookmarks" on public.bookmarks for select using (auth.uid() = user_id);
create policy "Users can insert own bookmarks" on public.bookmarks for insert with check (auth.uid() = user_id);
create policy "Users can delete own bookmarks" on public.bookmarks for delete using (auth.uid() = user_id);

create policy "Users can read own notes" on public.notes for select using (auth.uid() = user_id);
create policy "Users can insert own notes" on public.notes for insert with check (auth.uid() = user_id);
create policy "Users can update own notes" on public.notes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own notes" on public.notes for delete using (auth.uid() = user_id);

create policy "Users can read own saved snippets" on public.saved_snippets for select using (auth.uid() = user_id);
create policy "Users can insert own saved snippets" on public.saved_snippets for insert with check (auth.uid() = user_id);
create policy "Users can update own saved snippets" on public.saved_snippets for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own saved snippets" on public.saved_snippets for delete using (auth.uid() = user_id);
```

- [ ] **Step 3: Apply migration to Supabase**

Use one of these paths:

```bash
# If Supabase CLI is linked to the project:
supabase db push
```

or paste the migration SQL into the Supabase SQL Editor and run it once.

Expected: all tables exist under `public`, RLS is enabled, and policies are visible in Supabase Table Editor.

- [ ] **Step 4: Verify RLS manually in Supabase**

In Supabase SQL Editor, run:

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'profiles',
    'user_progress_state',
    'lesson_progress',
    'topic_progress',
    'project_feature_progress',
    'quiz_attempts',
    'challenge_attempts',
    'bookmarks',
    'notes',
    'saved_snippets'
  )
order by tablename;
```

Expected: every `rowsecurity` value is `true`.

- [ ] **Step 5: Commit checkpoint if commits are authorized**

```bash
git add supabase/migrations/202607060001_user_data.sql
git commit -m "feat: add supabase user data schema"
```

---

## Task 3: Add Supabase clients, middleware, login form, and navbar auth button

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/middleware.ts`
- Create: `middleware.ts`
- Create: `components/auth/auth-button.tsx`
- Create: `components/auth/login-form.tsx`
- Create: `app/login/page.tsx`
- Modify: `components/layout/navbar.tsx`

- [ ] **Step 1: Create browser client helper**

Create `lib/supabase/client.ts`:

```ts
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (browserClient) return browserClient;

  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return browserClient;
}
```

- [ ] **Step 2: Create server client helper**

Create `lib/supabase/server.ts`:

```ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "./client";

export async function getSupabaseServerClient(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) return null;

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot always set cookies. Middleware handles refresh.
          }
        },
      },
    }
  );
}
```

- [ ] **Step 3: Create middleware session refresh helper**

Create `lib/supabase/middleware.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSupabaseSession(request: NextRequest) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  await supabase.auth.getUser();

  return response;
}
```

Create root `middleware.ts`:

```ts
import type { NextRequest } from "next/server";
import { updateSupabaseSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSupabaseSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|pagefind|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 4: Create auth button**

Create `components/auth/auth-button.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { LogOut, UserCircle } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function AuthButton() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [supabase]);

  if (loading) {
    return (
      <span className="hidden h-9 w-20 animate-pulse rounded-lg bg-foreground/10 sm:inline-flex" />
    );
  }

  if (!session) {
    return (
      <Link
        href="/login"
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-foreground/5 px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
      >
        <UserCircle className="h-4 w-4" />
        Đăng nhập
      </Link>
    );
  }

  const email = session.user.email ?? "Account";

  return (
    <button
      type="button"
      onClick={() => void supabase?.auth.signOut()}
      title={email}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-foreground/5 px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
    >
      <LogOut className="h-4 w-4" />
      <span className="hidden max-w-28 truncate lg:inline">{email}</span>
      <span className="lg:hidden">Thoát</span>
    </button>
  );
}
```

- [ ] **Step 5: Create login form**

Create `components/auth/login-form.tsx`:

```tsx
"use client";

import { FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm() {
  const supabase = getSupabaseBrowserClient();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!supabase) {
      setError("Supabase chưa được cấu hình. Hãy điền NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "sign-in") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        setMessage("Đã đăng nhập. Tiến độ local sẽ được đồng bộ nếu có.");
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName || email.split("@")[0],
            },
          },
        });
        if (signUpError) throw signUpError;
        setMessage("Tài khoản đã được tạo. Nếu Supabase bật email confirmation, hãy kiểm tra email.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-card/40 p-5">
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight">
          {mode === "sign-in" ? "Đăng nhập" : "Tạo tài khoản"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Đăng nhập để lưu tiến độ, quiz và challenge lên Supabase PostgreSQL.
        </p>
      </div>

      {mode === "sign-up" && (
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">Tên hiển thị</span>
          <Input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="AI learner"
            autoComplete="name"
          />
        </label>
      )}

      <label className="block space-y-1.5 text-sm">
        <span className="font-medium">Email</span>
        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
          autoComplete="email"
        />
      </label>

      <label className="block space-y-1.5 text-sm">
        <span className="font-medium">Mật khẩu</span>
        <Input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={6}
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
        />
      </label>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}

      {message && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
          {message}
        </p>
      )}

      <Button type="submit" disabled={loading} className="w-full">
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {mode === "sign-in" ? "Đăng nhập" : "Tạo tài khoản"}
      </Button>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "sign-in" ? "sign-up" : "sign-in");
          setError(null);
          setMessage(null);
        }}
        className="w-full text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        {mode === "sign-in"
          ? "Chưa có tài khoản? Tạo tài khoản"
          : "Đã có tài khoản? Đăng nhập"}
      </button>
    </form>
  );
}
```

- [ ] **Step 6: Create login page**

Create `app/login/page.tsx`:

```tsx
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Đăng nhập",
  description: "Đăng nhập để đồng bộ tiến độ học AI Engineer Roadmap.",
};

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-12rem)] w-full max-w-md items-center px-4 py-12 sm:px-6">
      <LoginForm />
    </div>
  );
}
```

- [ ] **Step 7: Add auth button to navbar**

In `components/layout/navbar.tsx`, add this import:

```ts
import { AuthButton } from "@/components/auth/auth-button";
```

In the right-side desktop controls, insert `<AuthButton />` between `<ThemeToggle />` and the existing `Bắt đầu` link:

```tsx
<SearchTrigger className="hidden sm:inline-flex" />
<ThemeToggle />
<AuthButton />
<Link
  href="/roadmap"
```

In the mobile nav list, add a login link after the mapped nav items:

```tsx
<motion.div
  variants={{
    hidden: { opacity: 0, x: -8 },
    visible: { opacity: 1, x: 0 },
  }}
>
  <Link
    href="/login"
    onClick={() => setMobileOpen(false)}
    className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
  >
    Đăng nhập / tài khoản
  </Link>
</motion.div>
```

- [ ] **Step 8: Verify auth UI compiles**

Run:

```bash
pnpm typecheck
pnpm lint
```

Expected: both pass. With Supabase env unset, `/login` should show a friendly configuration error when submitted, not crash during build.

- [ ] **Step 9: Commit checkpoint if commits are authorized**

```bash
git add lib/supabase middleware.ts components/auth app/login components/layout/navbar.tsx
git commit -m "feat: add supabase auth shell"
```

---

## Task 4: Extract progress types, local storage, and merge rules with tests

**Files:**
- Create: `lib/progress-types.ts`
- Create: `lib/progress-local-storage.ts`
- Create: `lib/progress-sync.ts`
- Create: `lib/progress-sync.test.ts`
- Modify: `lib/progress.ts`

- [ ] **Step 1: Create progress shared types**

Create `lib/progress-types.ts`:

```ts
import type { ChallengeResult, ChallengeRunResult } from "./challenge-types";

export type ProgressStats = {
  overall: number;
  completedTopics: number;
  totalTopics: number;
  completedPhases: number;
  totalPhases: number;
  phaseProgress: Array<{
    phase: number;
    slug: string;
    title: string;
    completed: number;
    total: number;
    percent: number;
    done: boolean;
  }>;
  completedProjects: number;
  totalProjects: number;
  projectProgress: Array<{
    phase: number;
    slug: string;
    title: string;
    completed: number;
    total: number;
    percent: number;
  }>;
  startedAt: string | null;
  lastVisit: string | null;
  daysSinceStart: number;
};

export type QuizResult = {
  score: number;
  total: number;
  passedAt: string | null;
  attempts: number;
};

export type StoreState = {
  completed: Set<string>;
  projectFeatures: Set<string>;
  quizResults: Map<string, QuizResult>;
  challengeResults: Map<string, ChallengeResult>;
  startedAt: string | null;
  lastVisit: string | null;
};

export type QuizAttemptDetails = {
  answers?: Array<number | null>;
  durationSeconds?: number;
  completedAt?: string;
};

export type ChallengeAttemptDetails = {
  code?: string;
  language?: string;
  testResults?: ChallengeRunResult;
  durationSeconds?: number;
  submittedAt?: string;
};

export function topicKey(phaseSlug: string, topicId: string): string {
  return `${phaseSlug}/${topicId}`;
}

export function featureKey(projectId: string, featureIndex: number): string {
  return `${projectId}/${featureIndex}`;
}

export function createEmptyProgressState(): StoreState {
  return {
    completed: new Set(),
    projectFeatures: new Set(),
    quizResults: new Map(),
    challengeResults: new Map(),
    startedAt: null,
    lastVisit: null,
  };
}

export function cloneProgressState(state: StoreState): StoreState {
  return {
    completed: new Set(state.completed),
    projectFeatures: new Set(state.projectFeatures),
    quizResults: new Map(state.quizResults),
    challengeResults: new Map(state.challengeResults),
    startedAt: state.startedAt,
    lastVisit: state.lastVisit,
  };
}
```

- [ ] **Step 2: Create local storage adapter**

Create `lib/progress-local-storage.ts`:

```ts
import type { ChallengeResult } from "./challenge-types";
import type { QuizResult, StoreState } from "./progress-types";
import { createEmptyProgressState } from "./progress-types";

const STORAGE_KEY = "ai-roadmap:progress:v1";
const COMPLETED_KEY = "ai-roadmap:completed:v1";
const STARTED_KEY = "ai-roadmap:started:v1";
const PROJECT_FEATURES_KEY = "ai-roadmap:project-features:v1";
const QUIZ_RESULTS_KEY = "ai-roadmap:quiz-results:v1";
const CHALLENGE_RESULTS_KEY = "ai-roadmap:challenge-results:v1";

export function loadLocalProgressState(): StoreState {
  if (typeof window === "undefined") return createEmptyProgressState();

  try {
    const raw = localStorage.getItem(COMPLETED_KEY);
    const completed = raw ? new Set<string>(JSON.parse(raw) as string[]) : new Set<string>();

    const featuresRaw = localStorage.getItem(PROJECT_FEATURES_KEY);
    const projectFeatures = featuresRaw
      ? new Set<string>(JSON.parse(featuresRaw) as string[])
      : new Set<string>();

    const quizRaw = localStorage.getItem(QUIZ_RESULTS_KEY);
    const quizResults = quizRaw
      ? new Map<string, QuizResult>(Object.entries(JSON.parse(quizRaw) as Record<string, QuizResult>))
      : new Map<string, QuizResult>();

    const challengeRaw = localStorage.getItem(CHALLENGE_RESULTS_KEY);
    const challengeResults = challengeRaw
      ? new Map<string, ChallengeResult>(
          Object.entries(JSON.parse(challengeRaw) as Record<string, ChallengeResult>)
        )
      : new Map<string, ChallengeResult>();

    return {
      completed,
      projectFeatures,
      quizResults,
      challengeResults,
      lastVisit: localStorage.getItem(STORAGE_KEY),
      startedAt: localStorage.getItem(STARTED_KEY),
    };
  } catch {
    return createEmptyProgressState();
  }
}

export function persistLocalProgressState(state: StoreState): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(COMPLETED_KEY, JSON.stringify([...state.completed]));
    localStorage.setItem(PROJECT_FEATURES_KEY, JSON.stringify([...state.projectFeatures]));
    localStorage.setItem(QUIZ_RESULTS_KEY, JSON.stringify(Object.fromEntries(state.quizResults)));
    localStorage.setItem(
      CHALLENGE_RESULTS_KEY,
      JSON.stringify(Object.fromEntries(state.challengeResults))
    );

    if (state.lastVisit) localStorage.setItem(STORAGE_KEY, state.lastVisit);
    if (state.startedAt) localStorage.setItem(STARTED_KEY, state.startedAt);
  } catch {
    // Ignore browser quota/security errors. The in-memory store remains usable.
  }
}

export function clearLocalProgressState(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem(COMPLETED_KEY);
  localStorage.removeItem(PROJECT_FEATURES_KEY);
  localStorage.removeItem(QUIZ_RESULTS_KEY);
  localStorage.removeItem(CHALLENGE_RESULTS_KEY);
  localStorage.removeItem(STARTED_KEY);
}
```

- [ ] **Step 3: Write failing merge tests**

Create `lib/progress-sync.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createEmptyProgressState } from "./progress-types";
import { mergeProgressStates } from "./progress-sync";

function stateWith(overrides: Partial<ReturnType<typeof createEmptyProgressState>>) {
  return {
    ...createEmptyProgressState(),
    ...overrides,
  };
}

describe("mergeProgressStates", () => {
  it("unions completed lessons and project features", () => {
    const local = stateWith({
      completed: new Set(["phase-1/a"]),
      projectFeatures: new Set(["p1/0"]),
    });
    const remote = stateWith({
      completed: new Set(["phase-2/b"]),
      projectFeatures: new Set(["p1/1"]),
    });

    const merged = mergeProgressStates(local, remote);

    expect([...merged.completed].sort()).toEqual(["phase-1/a", "phase-2/b"]);
    expect([...merged.projectFeatures].sort()).toEqual(["p1/0", "p1/1"]);
  });

  it("keeps earliest quiz pass time and highest attempts", () => {
    const local = stateWith({
      quizResults: new Map([
        ["phase-1/a", { score: 7, total: 10, passedAt: "2026-01-02T00:00:00.000Z", attempts: 2 }],
      ]),
    });
    const remote = stateWith({
      quizResults: new Map([
        ["phase-1/a", { score: 9, total: 10, passedAt: "2026-01-01T00:00:00.000Z", attempts: 1 }],
      ]),
    });

    const result = mergeProgressStates(local, remote).quizResults.get("phase-1/a");

    expect(result).toEqual({
      score: 9,
      total: 10,
      passedAt: "2026-01-01T00:00:00.000Z",
      attempts: 2,
    });
  });

  it("keeps earliest challenge solved time and highest attempts", () => {
    const local = stateWith({
      challengeResults: new Map([
        ["numpy-1", { solvedAt: "2026-02-02T00:00:00.000Z", attempts: 4, lastPassed: true }],
      ]),
    });
    const remote = stateWith({
      challengeResults: new Map([
        ["numpy-1", { solvedAt: "2026-02-01T00:00:00.000Z", attempts: 2, lastPassed: false }],
      ]),
    });

    const result = mergeProgressStates(local, remote).challengeResults.get("numpy-1");

    expect(result).toEqual({
      solvedAt: "2026-02-01T00:00:00.000Z",
      attempts: 4,
      lastPassed: true,
    });
  });

  it("keeps earliest startedAt and latest lastVisit", () => {
    const local = stateWith({
      startedAt: "2026-03-01T00:00:00.000Z",
      lastVisit: "2026-03-02T00:00:00.000Z",
    });
    const remote = stateWith({
      startedAt: "2026-02-01T00:00:00.000Z",
      lastVisit: "2026-03-03T00:00:00.000Z",
    });

    const merged = mergeProgressStates(local, remote);

    expect(merged.startedAt).toBe("2026-02-01T00:00:00.000Z");
    expect(merged.lastVisit).toBe("2026-03-03T00:00:00.000Z");
  });
});
```

- [ ] **Step 4: Run merge tests and verify failure**

Run:

```bash
pnpm test:run lib/progress-sync.test.ts
```

Expected: FAIL because `lib/progress-sync.ts` does not exist.

- [ ] **Step 5: Implement merge rules**

Create `lib/progress-sync.ts`:

```ts
import type { ChallengeResult } from "./challenge-types";
import type { QuizResult, StoreState } from "./progress-types";

function earliestIso(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return new Date(a).getTime() <= new Date(b).getTime() ? a : b;
}

function latestIso(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

function quizRatio(result: QuizResult): number {
  return result.total === 0 ? 0 : result.score / result.total;
}

function mergeQuizResult(local: QuizResult, remote: QuizResult): QuizResult {
  const localRatio = quizRatio(local);
  const remoteRatio = quizRatio(remote);
  const best = remoteRatio > localRatio ? remote : local;

  return {
    score: best.score,
    total: best.total,
    passedAt: earliestIso(local.passedAt, remote.passedAt),
    attempts: Math.max(local.attempts, remote.attempts),
  };
}

function mergeChallengeResult(local: ChallengeResult, remote: ChallengeResult): ChallengeResult {
  return {
    solvedAt: earliestIso(local.solvedAt, remote.solvedAt),
    attempts: Math.max(local.attempts, remote.attempts),
    lastPassed: local.lastPassed || remote.lastPassed,
  };
}

export function mergeProgressStates(local: StoreState, remote: StoreState): StoreState {
  const quizResults = new Map(remote.quizResults);
  for (const [key, localResult] of local.quizResults) {
    const remoteResult = quizResults.get(key);
    quizResults.set(key, remoteResult ? mergeQuizResult(localResult, remoteResult) : localResult);
  }

  const challengeResults = new Map(remote.challengeResults);
  for (const [key, localResult] of local.challengeResults) {
    const remoteResult = challengeResults.get(key);
    challengeResults.set(
      key,
      remoteResult ? mergeChallengeResult(localResult, remoteResult) : localResult
    );
  }

  return {
    completed: new Set([...remote.completed, ...local.completed]),
    projectFeatures: new Set([...remote.projectFeatures, ...local.projectFeatures]),
    quizResults,
    challengeResults,
    startedAt: earliestIso(local.startedAt, remote.startedAt),
    lastVisit: latestIso(local.lastVisit, remote.lastVisit),
  };
}
```

- [ ] **Step 6: Run tests**

Run:

```bash
pnpm test:run lib/site-url.test.ts lib/progress-sync.test.ts
pnpm typecheck
```

Expected: all pass before editing `lib/progress.ts`.

- [ ] **Step 7: Modify `lib/progress.ts` imports and type definitions**

In `lib/progress.ts`, remove local `ProgressStats`, `QuizResult`, and `StoreState` type definitions. Replace them with:

```ts
import type {
  ChallengeAttemptDetails,
  ProgressStats,
  QuizAttemptDetails,
  QuizResult,
  StoreState,
} from "./progress-types";
import { createEmptyProgressState } from "./progress-types";
import {
  clearLocalProgressState,
  loadLocalProgressState,
  persistLocalProgressState,
} from "./progress-local-storage";
```

Set empty state with:

```ts
const emptyState = createEmptyProgressState();
let state: StoreState = createEmptyProgressState();
```

Replace `loadState()` with `loadLocalProgressState()`, replace `persistState()` with `persistLocalProgressState()`, and replace reset's direct `localStorage.removeItem(...)` calls with `clearLocalProgressState()`.

Keep the exported `ProgressStats` and `QuizResult` compatibility by adding this re-export near the imports:

```ts
export type { ProgressStats, QuizResult } from "./progress-types";
```

- [ ] **Step 8: Fix `computeStats()` project progress to use the passed state**

In `computeStats()`, replace project completion calls that use the module-level `isProjectDone()` with local checks against `s.projectFeatures`:

```ts
function isProjectDoneFromState(projectId: string, s: StoreState): boolean {
  const project = allProjects.find((p) => p.id === projectId);
  if (!project || project.features.length === 0) return false;
  return project.features.every((_, i) => s.projectFeatures.has(featureKey(projectId, i)));
}
```

Then update the two project stats lines:

```ts
const completed = phase.projects.filter((p) => isProjectDoneFromState(p.id, s)).length;
```

and:

```ts
const completedProjects = allProjects.filter((p) => isProjectDoneFromState(p.id, s)).length;
```

- [ ] **Step 9: Verify local-only behavior still compiles**

Run:

```bash
pnpm test:run lib/site-url.test.ts lib/progress-sync.test.ts
pnpm typecheck
pnpm lint
```

Expected: all pass. At this point behavior should still be local-only.

- [ ] **Step 10: Commit checkpoint if commits are authorized**

```bash
git add lib/progress-types.ts lib/progress-local-storage.ts lib/progress-sync.ts lib/progress-sync.test.ts lib/progress.ts
git commit -m "refactor: split progress storage and merge rules"
```

---

## Task 5: Add Supabase remote progress adapter and integrate it into `useProgress()`

**Files:**
- Create: `lib/progress-remote.ts`
- Modify: `lib/progress.ts`

- [ ] **Step 1: Create remote adapter**

Create `lib/progress-remote.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChallengeResult } from "./challenge-types";
import type {
  ChallengeAttemptDetails,
  QuizAttemptDetails,
  QuizResult,
  StoreState,
} from "./progress-types";
import { createEmptyProgressState, featureKey } from "./progress-types";

type ProgressStateRow = {
  completed: string[] | null;
  project_features: string[] | null;
  quiz_results: Record<string, QuizResult> | null;
  challenge_results: Record<string, ChallengeResult> | null;
  started_at: string | null;
  last_visit: string | null;
};

function rowToState(row: ProgressStateRow | null): StoreState {
  if (!row) return createEmptyProgressState();

  return {
    completed: new Set(row.completed ?? []),
    projectFeatures: new Set(row.project_features ?? []),
    quizResults: new Map(Object.entries(row.quiz_results ?? {})),
    challengeResults: new Map(Object.entries(row.challenge_results ?? {})),
    startedAt: row.started_at,
    lastVisit: row.last_visit,
  };
}

function stateToSnapshot(userId: string, state: StoreState) {
  return {
    user_id: userId,
    completed: [...state.completed],
    project_features: [...state.projectFeatures],
    quiz_results: Object.fromEntries(state.quizResults),
    challenge_results: Object.fromEntries(state.challengeResults),
    started_at: state.startedAt,
    last_visit: state.lastVisit,
  };
}

function parseFeatureKey(key: string): { projectId: string; featureIndex: number } | null {
  const [projectId, rawIndex] = key.split("/");
  const featureIndex = Number(rawIndex);
  if (!projectId || !Number.isInteger(featureIndex) || featureIndex < 0) return null;
  return { projectId, featureIndex };
}

export async function loadRemoteProgressState(
  supabase: SupabaseClient,
  userId: string
): Promise<StoreState> {
  const { data, error } = await supabase
    .from("user_progress_state")
    .select("completed, project_features, quiz_results, challenge_results, started_at, last_visit")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return rowToState(data as ProgressStateRow | null);
}

export async function saveRemoteProgressSnapshot(
  supabase: SupabaseClient,
  userId: string,
  state: StoreState
): Promise<void> {
  const { error: snapshotError } = await supabase
    .from("user_progress_state")
    .upsert(stateToSnapshot(userId, state), { onConflict: "user_id" });

  if (snapshotError) throw snapshotError;

  const { error: deleteLessonsError } = await supabase
    .from("lesson_progress")
    .delete()
    .eq("user_id", userId);

  if (deleteLessonsError) throw deleteLessonsError;

  const lessonRows = [...state.completed].map((lessonSlug) => ({
    user_id: userId,
    lesson_slug: lessonSlug,
    status: "completed",
    progress_percent: 100,
    last_seen_at: state.lastVisit,
    completed_at: state.lastVisit,
  }));

  if (lessonRows.length > 0) {
    const { error } = await supabase.from("lesson_progress").insert(lessonRows);
    if (error) throw error;
  }

  const { error: deleteFeaturesError } = await supabase
    .from("project_feature_progress")
    .delete()
    .eq("user_id", userId);

  if (deleteFeaturesError) throw deleteFeaturesError;

  const featureRows = [...state.projectFeatures]
    .map((key) => {
      const parsed = parseFeatureKey(key);
      if (!parsed) return null;
      return {
        user_id: userId,
        project_id: parsed.projectId,
        feature_index: parsed.featureIndex,
        feature_key: featureKey(parsed.projectId, parsed.featureIndex),
        completed_at: state.lastVisit ?? new Date().toISOString(),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (featureRows.length > 0) {
    const { error } = await supabase.from("project_feature_progress").insert(featureRows);
    if (error) throw error;
  }
}

export async function recordRemoteQuizAttempt(
  supabase: SupabaseClient,
  userId: string,
  input: {
    quizSlug: string;
    score: number;
    total: number;
    details?: QuizAttemptDetails;
  }
): Promise<void> {
  const { error } = await supabase.from("quiz_attempts").insert({
    user_id: userId,
    quiz_slug: input.quizSlug,
    score: input.score,
    total: input.total,
    answers: { selected: input.details?.answers ?? [] },
    duration_seconds: input.details?.durationSeconds ?? null,
    completed_at: input.details?.completedAt ?? new Date().toISOString(),
  });

  if (error) throw error;
}

export async function recordRemoteChallengeAttempt(
  supabase: SupabaseClient,
  userId: string,
  input: {
    challengeSlug: string;
    passed: boolean;
    details?: ChallengeAttemptDetails;
  }
): Promise<void> {
  const { error } = await supabase.from("challenge_attempts").insert({
    user_id: userId,
    challenge_slug: input.challengeSlug,
    status: input.passed ? "passed" : "failed",
    language: input.details?.language ?? "python",
    code: input.details?.code ?? null,
    test_results: input.details?.testResults ?? {},
    duration_seconds: input.details?.durationSeconds ?? null,
    submitted_at: input.details?.submittedAt ?? new Date().toISOString(),
  });

  if (error) throw error;
}

export async function resetRemoteProgress(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const tables = [
    "lesson_progress",
    "topic_progress",
    "project_feature_progress",
    "quiz_attempts",
    "challenge_attempts",
    "user_progress_state",
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq("user_id", userId);
    if (error) throw error;
  }
}
```

- [ ] **Step 2: Re-export progress key helpers from `lib/progress.ts`**

Task 4 already placed `topicKey()` and `featureKey()` in `lib/progress-types.ts` so `lib/progress-remote.ts` can import helpers without a circular dependency. In `lib/progress.ts`, replace the local `topicKey` and `featureKey` function declarations with:

```ts
export { featureKey, topicKey } from "./progress-types";
import { featureKey, topicKey } from "./progress-types";
```

This preserves the old public exports from `lib/progress.ts` while allowing the remote adapter to import from `lib/progress-types.ts`.

- [ ] **Step 3: Add remote lifecycle state to `lib/progress.ts`**

In `lib/progress.ts`, add imports:

```ts
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "./supabase/client";
import { mergeProgressStates } from "./progress-sync";
import {
  loadRemoteProgressState,
  recordRemoteChallengeAttempt,
  recordRemoteQuizAttempt,
  resetRemoteProgress,
  saveRemoteProgressSnapshot,
} from "./progress-remote";
```

Add module-level remote state below listeners:

```ts
let hydrateStarted = false;
let remoteClient: SupabaseClient | null = null;
let remoteUserId: string | null = null;
let remoteWriteQueue: Promise<void> = Promise.resolve();

function notify() {
  listeners.forEach((listener) => listener());
}

function enqueueRemoteWrite(write: () => Promise<void>) {
  if (!remoteClient || !remoteUserId) return;

  const client = remoteClient;
  const userId = remoteUserId;

  remoteWriteQueue = remoteWriteQueue
    .then(() => write.call(null))
    .catch((error) => {
      console.error("[progress] Supabase sync failed", error);
    })
    .then(async () => {
      if (!client || !userId) return;
    });
}

function withActivityMetadata(next: StoreState): StoreState {
  const now = new Date().toISOString();
  return {
    ...next,
    startedAt: next.startedAt ?? state.startedAt ?? now,
    lastVisit: now,
  };
}
```

- [ ] **Step 4: Replace hydrate logic in `lib/progress.ts`**

Replace the current `hydrate()` and `subscribe()` with:

```ts
async function applySession(session: Session | null) {
  const localState = loadLocalProgressState();

  if (!session || !remoteClient) {
    remoteUserId = null;
    state = localState;
    hydrated = true;
    notify();
    return;
  }

  remoteUserId = session.user.id;

  try {
    const remoteState = await loadRemoteProgressState(remoteClient, remoteUserId);
    const merged = mergeProgressStates(localState, remoteState);
    state = merged;
    hydrated = true;
    persistLocalProgressState(merged);
    notify();
    enqueueRemoteWrite(() => saveRemoteProgressSnapshot(remoteClient!, remoteUserId!, merged));
  } catch (error) {
    console.error("[progress] Failed to load Supabase progress; using local progress", error);
    state = localState;
    hydrated = true;
    notify();
  }
}

function hydrate() {
  if (hydrateStarted) return;
  hydrateStarted = true;

  remoteClient = getSupabaseBrowserClient();

  if (!remoteClient) {
    state = loadLocalProgressState();
    hydrated = true;
    notify();
    return;
  }

  void remoteClient.auth.getSession().then(({ data }) => applySession(data.session));

  remoteClient.auth.onAuthStateChange((_event, session) => {
    void applySession(session);
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  hydrate();
  return () => listeners.delete(listener);
}
```

- [ ] **Step 5: Update `setState()` in `lib/progress.ts`**

Replace current `setState(next)` with:

```ts
function setState(next: StoreState, options: { persistRemote?: boolean } = {}) {
  state = options.persistRemote === false ? next : withActivityMetadata(next);
  persistLocalProgressState(state);
  notify();

  if (options.persistRemote !== false) {
    enqueueRemoteWrite(() => saveRemoteProgressSnapshot(remoteClient!, remoteUserId!, state));
  }
}
```

- [ ] **Step 6: Extend quiz/challenge mutators in `lib/progress.ts`**

Change `setQuizResult` signature to:

```ts
(
  phaseSlug: string,
  topicId: string,
  score: number,
  total: number,
  details?: QuizAttemptDetails
) => {
```

After `setState(...)`, add:

```ts
enqueueRemoteWrite(() =>
  recordRemoteQuizAttempt(remoteClient!, remoteUserId!, {
    quizSlug: key,
    score,
    total,
    details,
  })
);
```

Change `setChallengeResult` signature to:

```ts
(challengeId: string, passed: boolean, details?: ChallengeAttemptDetails) => {
```

After `setState(...)`, add:

```ts
enqueueRemoteWrite(() =>
  recordRemoteChallengeAttempt(remoteClient!, remoteUserId!, {
    challengeSlug: challengeId,
    passed,
    details,
  })
);
```

Existing callers that pass only the old arguments continue to compile because the new details parameter is optional.

- [ ] **Step 7: Update reset in `lib/progress.ts`**

Replace reset body with:

```ts
const reset = useCallback(() => {
  state = { ...createEmptyProgressState(), lastVisit: new Date().toISOString() };
  clearLocalProgressState();
  persistLocalProgressState(state);
  notify();
  enqueueRemoteWrite(() => resetRemoteProgress(remoteClient!, remoteUserId!));
}, []);
```

- [ ] **Step 8: Verify local fallback without Supabase env**

Run with no Supabase env configured:

```bash
pnpm test:run lib/site-url.test.ts lib/progress-sync.test.ts
pnpm typecheck
pnpm lint
pnpm build
```

Expected: all pass. The app must build even without Supabase env values.

- [ ] **Step 9: Verify authenticated sync manually**

With Supabase env configured in `.env.local` and migration applied:

```bash
pnpm dev
```

Manual checklist:

- Visit `/login`, create/sign in a user.
- Mark one lesson complete.
- In Supabase Table Editor, `user_progress_state.completed` includes the lesson key.
- `lesson_progress` has one row for the user.
- Reload page; completed state remains.
- Sign out; anonymous local mode still works.

- [ ] **Step 10: Commit checkpoint if commits are authorized**

```bash
git add lib/progress-remote.ts lib/progress-types.ts lib/progress.ts
git commit -m "feat: sync progress to supabase"
```

---

## Task 6: Persist richer quiz and challenge attempt payloads

**Files:**
- Modify: `components/quiz/quiz-card.tsx`
- Modify: `components/challenge/challenge-editor.tsx`
- Modify: `components/challenge/challenge-view.tsx`

- [ ] **Step 1: Update quiz submit to pass selected answers**

In `components/quiz/quiz-card.tsx`, replace:

```ts
setQuizResult(phaseSlug, topicId, finalScore, total);
```

with:

```ts
setQuizResult(phaseSlug, topicId, finalScore, total, {
  answers,
  completedAt: new Date().toISOString(),
});
```

- [ ] **Step 2: Update challenge editor callback type**

In `components/challenge/challenge-editor.tsx`, change imports:

```ts
import type { TestCase, ChallengeRunResult } from "@/lib/challenge-types";
```

is already present. Change prop type:

```ts
onSolved?: () => void;
```

replace with:

```ts
onSolved?: (payload: { code: string; result: ChallengeRunResult }) => void;
```

Replace:

```ts
if (r.allPassed && onSolved) onSolved();
```

with:

```ts
if (r.allPassed && onSolved) onSolved({ code, result: r });
```

- [ ] **Step 3: Update challenge view to persist attempt payload**

In `components/challenge/challenge-view.tsx`, replace:

```tsx
onSolved={() => setChallengeResult(challenge.id, true)}
```

with:

```tsx
onSolved={({ code, result }) =>
  setChallengeResult(challenge.id, true, {
    code,
    language: "python",
    testResults: result,
    submittedAt: new Date().toISOString(),
    durationSeconds: result.durationMs
      ? Math.max(0, Math.round(result.durationMs / 1000))
      : undefined,
  })
}
```

- [ ] **Step 4: Verify attempt rows manually**

Run:

```bash
pnpm typecheck
pnpm lint
```

Then with Supabase configured:

- Submit a quiz.
- Confirm `quiz_attempts.answers` contains a `selected` array.
- Submit a passing challenge.
- Confirm `challenge_attempts.code` and `challenge_attempts.test_results` are stored.

- [ ] **Step 5: Commit checkpoint if commits are authorized**

```bash
git add components/quiz/quiz-card.tsx components/challenge/challenge-editor.tsx components/challenge/challenge-view.tsx
git commit -m "feat: persist quiz and challenge attempt payloads"
```

---

## Task 7: Update documentation for production database direction

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-07-06-production-db-hybrid-design.md` only if implementation choices changed from the approved spec.

- [ ] **Step 1: Replace Prisma/NextAuth-first v2 note in README**

In `README.md`, find the section that says v2 uses Prisma + NextAuth + PostgreSQL. Replace it with:

````md
## Production DB/Auth direction

Phase 1 production uses **Supabase Auth + Supabase PostgreSQL** for user-owned data while keeping lessons, quizzes, challenges, and Pagefind search static in the repo.

Stored in Supabase:

- profile rows linked to `auth.users`
- lesson completion/progress snapshots
- project feature progress
- quiz attempts
- challenge attempts
- bookmark/note/snippet tables for the next UI layer

Anonymous users continue to use browser `localStorage`. After login, local progress merges into Supabase and remains cached locally as a fallback.

MongoDB is reserved for a future content/draft/generated-data workflow. It is documented in `.env.example` but is not required for Phase 1 runtime.

### Required environment variables

```env
NEXT_PUBLIC_SITE_URL=https://your-production-domain.com
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be exposed to client code.
````

- [ ] **Step 2: Add migration note**

Add this short note after setup commands:

```md
### Supabase migration

Run `supabase/migrations/202607060001_user_data.sql` in Supabase SQL Editor or apply it with Supabase CLI before enabling auth in production. Verify RLS is enabled for every user-owned table.
```

- [ ] **Step 3: Verify docs and checks**

Run:

```bash
pnpm typecheck
pnpm lint
pnpm test:run
```

Expected: all pass.

- [ ] **Step 4: Commit checkpoint if commits are authorized**

```bash
git add README.md docs/superpowers/specs/2026-07-06-production-db-hybrid-design.md
git commit -m "docs: document supabase production direction"
```

---

## Task 8: Production verification checklist

**Files:**
- No planned source modifications unless a check fails.

- [ ] **Step 1: Verify working tree before final checks**

Run:

```bash
git status --short
```

Expected: only intended files are modified. The pre-existing `D taste-skill-temp` may still appear; do not stage it unless the user explicitly asks.

- [ ] **Step 2: Run automated checks**

Run:

```bash
pnpm test:run
pnpm typecheck
pnpm lint
pnpm build
```

Expected:

- Vitest tests pass.
- TypeScript passes.
- ESLint passes.
- Next build passes.
- Pagefind `postbuild` still generates `public/pagefind/`.

- [ ] **Step 3: Verify anonymous behavior**

Run:

```bash
pnpm dev
```

With Supabase env removed or blank:

- `/` loads.
- `/roadmap` loads.
- Marking a lesson complete updates UI and localStorage.
- Quiz submission updates previous result.
- Challenge solved state updates after pass.
- `/login` does not crash and shows config error when submitted.

- [ ] **Step 4: Verify authenticated behavior**

With `.env.local` configured and migration applied:

- Sign up or sign in at `/login`.
- Mark a lesson complete.
- Refresh; completion remains.
- Check Supabase `user_progress_state` and `lesson_progress` rows.
- Submit a quiz; check `quiz_attempts` row.
- Submit a passing challenge; check `challenge_attempts` row.
- Sign out; app remains usable in local mode.
- Sign back in; local and remote progress merge.

- [ ] **Step 5: Verify RLS with two users**

Manual browser/Supabase checklist:

- User A completes a lesson.
- User B signs in in a different browser profile.
- User B cannot see User A progress in UI.
- In Supabase SQL Editor, authenticated client policies only allow rows where `user_id = auth.uid()`.

- [ ] **Step 6: Final status**

Run:

```bash
git status --short
```

Expected: clean except changes intentionally left uncommitted by user preference and the pre-existing `D taste-skill-temp` if not resolved.

---

## Self-Review Notes

Spec coverage:

- Supabase Postgres primary: covered by Tasks 1–6.
- MongoDB future-only: covered by `.env.example`, README, and no runtime Mongo dependency.
- User data first: covered by progress/project features/quiz/challenge persistence and schema for bookmarks/notes/snippets.
- RLS: covered by Task 2 migration and verification.
- Anonymous local mode: preserved in Tasks 4–5 and verified in Task 8.
- Local-to-remote sync: implemented through `mergeProgressStates()` and `applySession()` in Task 5.
- Site URL hardcode removal: covered by Task 1.
- Tests/checks: Vitest, typecheck, lint, build covered by Tasks 1, 4, 8.

Known follow-up plan:

- Build product UI for bookmarks, notes, and saved snippets using the tables created here.
- MongoDB content/draft/generated-data integration after a concrete content workflow is chosen.
- Playground CSP/worker hardening as a separate security plan.
