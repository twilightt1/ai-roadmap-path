# Personal Learning Workspace Phase 1 Design

Status: Approved for implementation planning
Date: 2026-07-07

## Summary

Personal Learning Workspace Phase 1 adds login-only personal study tools to the AI Engineer Roadmap platform: bookmarks, lesson notes, saved code snippets, and a `/library` page that gathers those saved items in one place.

The feature builds on the existing Supabase Phase 1 user-data foundation. The database tables and RLS policies for `bookmarks`, `notes`, and `saved_snippets` already exist in `supabase/migrations/202607060001_user_data.sql`; this phase connects them to runtime UI and client-side data helpers.

## Goals

- Let authenticated learners save lessons, projects, and challenges for later.
- Let authenticated learners write, edit, and delete notes tied to a lesson.
- Let authenticated learners save code snippets from playground and challenge contexts.
- Provide a single Library surface where learners can revisit bookmarks, notes, and snippets.
- Keep the MVP simple by requiring login for all personal-library writes and reads.

## Non-goals

- Anonymous localStorage fallback for bookmarks, notes, or snippets.
- Login-time merge of anonymous personal-library data.
- Rich text editing, markdown preview, tagging, or folders.
- AI summaries, AI recommendations, or generated study plans.
- Public sharing of notes/snippets.
- Server-side challenge grading or execution sandbox hardening.
- Full-text search inside the personal library.

## Existing Context

The repo is a Next.js 16 App Router application with static learning content, quiz/challenge practice, browser playgrounds, progress tracking, Supabase Auth, and Supabase-backed user progress sync.

Relevant existing pieces:

- `app/phase/[slug]/[topic]/page.tsx` renders lesson/topic pages.
- `app/projects/[id]/page.tsx` renders project detail pages.
- `app/practice/[id]/page.tsx` renders challenge detail pages.
- `app/playground/page.tsx` and `components/playground/*` render the standalone playground.
- `components/challenge/*` renders challenge editor/results UI.
- `lib/supabase/client.ts` exposes the browser Supabase client.
- `supabase/migrations/202607060001_user_data.sql` defines the personal-library tables and RLS policies.

## Product Behavior

### Authentication model

All Phase 1 personal-library features are login-only.

When Supabase is not configured or no user session exists:

- Save actions do not write to localStorage.
- Components show a concise login CTA.
- The CTA links to `/login`.
- The rest of the page remains usable.

When an authenticated session exists:

- Components read and write the authenticated user's rows through the browser Supabase client.
- RLS remains the security boundary: users can only read or mutate their own records.
- UI shows loading, empty, and inline error states without crashing the page.

### Bookmarks

Authenticated users can bookmark supported targets:

- Lessons/topics: `target_type = 'lesson'`, `target_slug = '<phase-slug>/<topic-slug>'`.
- Projects: `target_type = 'project'`, `target_slug = '<project-id>'`.
- Challenges: `target_type = 'challenge'`, `target_slug = '<challenge-id>'`.

The bookmark button is a toggle:

- If no bookmark exists, insert a row.
- If a bookmark exists, delete that row.
- The unique constraint on `(user_id, target_type, target_slug)` prevents duplicates.

Suggested placements:

- Lesson page: near the lesson title/progress actions.
- Project detail page: near the project title/header.
- Challenge detail page: near the challenge title/header.

### Lesson notes

Authenticated users can manage notes on lesson pages.

Behavior:

- Notes are scoped by `lesson_slug`.
- The lesson slug uses the same normalized format as bookmark lesson targets: `<phase-slug>/<topic-slug>`.
- A lesson can have multiple notes.
- Notes list sorts by `updated_at` descending.
- Users can create, edit, and delete notes.
- Empty note content is not saved.
- Note content respects the existing database limit of 20,000 characters.

### Saved snippets

Authenticated users can save code snippets from coding contexts.

Supported contexts:

- Standalone playground.
- Challenge editor.

Saved snippet fields:

- `title`: required, trimmed, maximum 120 characters.
- `language`: required, taken from the editor/playground language.
- `code`: required, maximum 100,000 characters.
- `lesson_slug`: optional for future MDX/playground usage.
- `challenge_slug`: optional when saving from a challenge.

Behavior:

- Save action opens a small dialog asking for a title.
- The default title can be derived from the context, for example `Python snippet` or the challenge title.
- Empty code is not saved.
- After successful save, show a confirmation state and keep the editor content unchanged.

### Library page

Add a new route:

```txt
/library
```

The Library page is authenticated-user focused and contains three sections or tabs:

1. Bookmarks
2. Notes
3. Snippets

Behavior:

- If the user is not logged in, show a login CTA.
- If logged in and there is no saved data, show useful empty states.
- Each item links back to its source context when possible.

Destination rules:

- Lesson bookmark or note with `lesson_slug = '<phase>/<topic>'` links to `/phase/<phase>/<topic>`.
- Project bookmark links to `/projects/<project-id>`.
- Challenge bookmark links to `/practice/<challenge-id>`.
- Snippet with `challenge_slug` links to `/practice/<challenge-id>`.
- Snippet with `lesson_slug` links to `/phase/<phase>/<topic>`.
- Snippet without context links to `/playground`.

## Architecture

### New bounded context

Add a personal-library module that owns types, validation helpers, destination helpers, and Supabase operations.

Preferred file:

```txt
lib/personal-library.ts
```

This keeps bookmarks, notes, and snippets together because they share the same product area, auth assumptions, and Library page.

### Suggested exported types

```ts
export type BookmarkTargetType = "lesson" | "project" | "challenge";

export type BookmarkRecord = {
  id: string;
  targetType: BookmarkTargetType;
  targetSlug: string;
  createdAt: string;
  updatedAt: string;
};

export type NoteRecord = {
  id: string;
  lessonSlug: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type SavedSnippetRecord = {
  id: string;
  title: string;
  language: string;
  code: string;
  lessonSlug: string | null;
  challengeSlug: string | null;
  createdAt: string;
  updatedAt: string;
};
```

The UI should use camelCase records even though Supabase rows use snake_case.

### Suggested data helpers

```ts
listBookmarks(supabase, userId)
isBookmarked(supabase, userId, target)
toggleBookmark(supabase, userId, target)
listNotesForLesson(supabase, userId, lessonSlug)
createNote(supabase, userId, lessonSlug, content)
updateNote(supabase, userId, noteId, content)
deleteNote(supabase, userId, noteId)
listSnippets(supabase, userId)
createSnippet(supabase, userId, input)
updateSnippet(supabase, userId, snippetId, input)
deleteSnippet(supabase, userId, snippetId)
buildLibraryDestination(item)
```

Helpers should validate inputs before writing:

- Supported bookmark target types only.
- Non-empty target slugs.
- Non-empty note content.
- Non-empty snippet title/language/code.
- Respect database length limits for notes, snippet title, and snippet code.

### Components

Suggested components:

```txt
components/library/bookmark-button.tsx
components/library/lesson-notes-panel.tsx
components/library/save-snippet-button.tsx
components/library/library-page-client.tsx
components/library/note-card.tsx
components/library/snippet-card.tsx
```

The exact split can be adjusted during implementation, but the UI should keep each component focused:

- `BookmarkButton`: session-aware bookmark toggle for one target.
- `LessonNotesPanel`: note CRUD for one lesson slug.
- `SaveSnippetButton`: opens title dialog and creates a snippet from current code.
- `LibraryPageClient`: loads user library data and renders sections/tabs.
- `NoteCard` and `SnippetCard`: display and action components for library items.

## Data Flow

### Bookmark toggle

1. Component gets Supabase browser client.
2. Component checks the current session.
3. If not logged in, render login CTA.
4. If logged in, call `isBookmarked` for initial state.
5. User clicks toggle.
6. Call `toggleBookmark`.
7. Update optimistic or post-response UI state.
8. On error, restore previous state and show inline error.

### Note CRUD

1. Lesson page passes `lessonSlug` into `LessonNotesPanel`.
2. Component checks session.
3. If logged in, load notes with `listNotesForLesson`.
4. Create/edit/delete actions call the matching helper.
5. Refresh local component state after successful writes.
6. Show empty state when no notes exist.

### Snippet save

1. Playground/challenge editor passes current `language`, `code`, and optional context to `SaveSnippetButton`.
2. Component checks session.
3. User opens save dialog and enters title.
4. Validate title and code.
5. Call `createSnippet`.
6. Show success/error state without changing editor code.

### Library page

1. Page renders a client component.
2. Client component checks session.
3. If not logged in, show login CTA.
4. If logged in, load bookmarks, notes, and snippets.
5. Render tabs/sections with empty states.
6. Item actions update/delete rows and refresh local state.

## Error Handling

- Missing Supabase config: show login/sync-unavailable CTA instead of throwing.
- Missing session: show login CTA.
- RLS or network error: show inline error message and keep existing page usable.
- Duplicate bookmark insert: treat as already bookmarked where possible.
- Delete missing bookmark/note/snippet: treat as successful no-op where possible.
- Invalid user input: block submit and show a short validation message.

## Testing Strategy

Add unit tests for pure personal-library helpers where possible:

- Bookmark target validation.
- Lesson slug and destination URL building.
- Snippet input normalization and validation.
- Note input validation.
- Record mapping from Supabase snake_case rows to camelCase UI records.

Manual validation should cover:

- Logged-out lesson/project/challenge shows login CTA.
- Logged-in bookmark toggle works and persists refresh.
- Logged-in lesson notes can create/edit/delete.
- Logged-in playground snippet save appears in `/library`.
- Logged-in challenge snippet save appears in `/library` and links back to challenge.
- RLS prevents one user from seeing another user's records, verified through existing Supabase manual RLS checklist when a live project is available.

Run before completion:

```bash
pnpm lint
pnpm typecheck
pnpm test:run
```

## Rollout Plan

1. Add personal-library types, validation helpers, mappers, and destination helpers.
2. Add Supabase CRUD helpers.
3. Add `BookmarkButton` and wire it into lesson, project, and challenge pages.
4. Add `LessonNotesPanel` and wire it into lesson pages.
5. Add `SaveSnippetButton` and wire it into playground/challenge editor flows.
6. Add `/library` page and library client UI.
7. Add unit tests for helper logic.
8. Run lint, typecheck, and tests.

## Acceptance Criteria

- Authenticated users can bookmark and unbookmark lessons, projects, and challenges.
- Authenticated users can create, edit, and delete multiple notes on a lesson page.
- Authenticated users can save snippets from the standalone playground.
- Authenticated users can save snippets from challenge pages with the challenge context attached.
- `/library` shows bookmarks, notes, and snippets for the current user only.
- Logged-out users see login CTAs and no local personal-library writes occur.
- The feature uses existing Supabase RLS policies rather than service-role access from the browser.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test:run` pass.

## Open Decisions Resolved

- Anonymous support: login-only for Phase 1.
- Notes model: multiple notes per lesson.
- Library organization: three sections/tabs for bookmarks, notes, and snippets.
- Data source: existing Supabase `bookmarks`, `notes`, and `saved_snippets` tables.
