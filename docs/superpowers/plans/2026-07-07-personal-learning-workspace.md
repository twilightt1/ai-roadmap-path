# Personal Learning Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a login-only Personal Learning Workspace with bookmarks, lesson notes, saved code snippets, and a `/library` page.

**Architecture:** Add a focused `lib/personal-library.ts` bounded context for validation, row mapping, destination URLs, and Supabase CRUD. Add small client components that reuse a shared session hook and call the existing Supabase browser client, with RLS remaining the security boundary. Wire the components into lesson, project, challenge, playground, and navigation surfaces without changing existing progress or challenge execution semantics.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Base UI/shadcn-style local UI components, Supabase browser client, Vitest.

---

## Scope Check

The approved spec covers one coherent subsystem: personal learning data for authenticated users. Bookmarks, notes, snippets, and the Library page share the same Supabase user-data foundation and belong in one plan. Anonymous local fallback, merge logic, rich text, AI features, tags, and personal-library full-text search are excluded.

## File Structure

Create these files:

- `lib/personal-library.ts` — personal-library types, validation helpers, Supabase row mappers, destination URL helpers, and CRUD functions.
- `lib/personal-library.test.ts` — Vitest coverage for validation, mapping, and destination helpers.
- `components/library/use-current-user.ts` — shared client hook for Supabase availability and current authenticated user.
- `components/library/bookmark-button.tsx` — session-aware bookmark toggle.
- `components/library/lesson-notes-panel.tsx` — lesson-scoped note CRUD UI.
- `components/library/save-snippet-button.tsx` — dialog button for saving current editor code.
- `components/library/library-page-client.tsx` — client UI for `/library` tabs/sections.
- `app/library/page.tsx` — server route wrapper and metadata for the Library page.

Modify these files:

- `app/phase/[slug]/[topic]/page.tsx` — add lesson bookmark and notes panel.
- `app/projects/[id]/page.tsx` — add project bookmark.
- `components/challenge/challenge-view.tsx` — add challenge bookmark and pass challenge context to editor.
- `components/challenge/challenge-editor.tsx` — add save-snippet action for challenge code.
- `components/playground/playground.tsx` — add save-snippet action for playground code and optional snippet context.
- `components/layout/navbar.tsx` — add Library nav link.
- `README.md` — document Personal Learning Workspace in the feature list and route tree.

Commit policy for this repo: the agent must not create git commits unless the user explicitly grants commit permission. Each task includes a checkpoint with commit commands for use only after that permission exists; otherwise record the changed files and continue.

---

## Task 1: Personal Library Helpers and Tests

**Files:**
- Create: `lib/personal-library.test.ts`
- Create: `lib/personal-library.ts`

- [ ] **Step 1: Write the failing helper tests**

Create `lib/personal-library.test.ts` with this content:

```ts
import { describe, expect, it } from "vitest";
import {
  BOOKMARK_TARGET_TYPES,
  buildBookmarkHref,
  buildNoteHref,
  buildSnippetHref,
  mapBookmarkRow,
  mapNoteRow,
  mapSavedSnippetRow,
  normalizeBookmarkTarget,
  validateNoteContent,
  validateSnippetInput,
} from "./personal-library";

describe("personal-library helpers", () => {
  it("defines the supported bookmark target types", () => {
    expect(BOOKMARK_TARGET_TYPES).toEqual(["lesson", "project", "challenge"]);
  });

  it("normalizes bookmark targets", () => {
    expect(normalizeBookmarkTarget("lesson", " phase-1/numpy ")).toEqual({
      targetType: "lesson",
      targetSlug: "phase-1/numpy",
    });
    expect(() => normalizeBookmarkTarget("quiz" as never, "phase-1/numpy")).toThrow(
      "Unsupported bookmark target type: quiz"
    );
    expect(() => normalizeBookmarkTarget("lesson", "   ")).toThrow(
      "Bookmark target slug is required"
    );
  });

  it("maps Supabase rows to camelCase records", () => {
    expect(
      mapBookmarkRow({
        id: "bookmark-1",
        target_type: "lesson",
        target_slug: "phase-1/numpy",
        created_at: "2026-07-07T00:00:00.000Z",
        updated_at: "2026-07-07T01:00:00.000Z",
      })
    ).toEqual({
      id: "bookmark-1",
      targetType: "lesson",
      targetSlug: "phase-1/numpy",
      createdAt: "2026-07-07T00:00:00.000Z",
      updatedAt: "2026-07-07T01:00:00.000Z",
    });

    expect(
      mapNoteRow({
        id: "note-1",
        lesson_slug: "phase-1/numpy",
        content: "Remember broadcasting rules",
        created_at: "2026-07-07T00:00:00.000Z",
        updated_at: "2026-07-07T01:00:00.000Z",
      })
    ).toEqual({
      id: "note-1",
      lessonSlug: "phase-1/numpy",
      content: "Remember broadcasting rules",
      createdAt: "2026-07-07T00:00:00.000Z",
      updatedAt: "2026-07-07T01:00:00.000Z",
    });

    expect(
      mapSavedSnippetRow({
        id: "snippet-1",
        title: "Mean helper",
        language: "python",
        code: "print(1)",
        lesson_slug: null,
        challenge_slug: "numpy-mean-array",
        created_at: "2026-07-07T00:00:00.000Z",
        updated_at: "2026-07-07T01:00:00.000Z",
      })
    ).toEqual({
      id: "snippet-1",
      title: "Mean helper",
      language: "python",
      code: "print(1)",
      lessonSlug: null,
      challengeSlug: "numpy-mean-array",
      createdAt: "2026-07-07T00:00:00.000Z",
      updatedAt: "2026-07-07T01:00:00.000Z",
    });
  });

  it("rejects invalid rows", () => {
    expect(() =>
      mapBookmarkRow({
        id: "bookmark-1",
        target_type: "quiz",
        target_slug: "phase-1/numpy",
        created_at: "2026-07-07T00:00:00.000Z",
        updated_at: "2026-07-07T01:00:00.000Z",
      })
    ).toThrow("Unsupported bookmark target type: quiz");

    expect(() => mapNoteRow({ id: "note-1" })).toThrow("Invalid notes row: lesson_slug must be a string");
    expect(() => mapSavedSnippetRow({ id: "snippet-1" })).toThrow(
      "Invalid saved_snippets row: title must be a string"
    );
  });

  it("validates note content", () => {
    expect(validateNoteContent("  Learn axis=0 vs axis=1  ")).toBe("Learn axis=0 vs axis=1");
    expect(() => validateNoteContent("   ")).toThrow("Note content is required");
    expect(() => validateNoteContent("x".repeat(20_001))).toThrow(
      "Note content must be at most 20000 characters"
    );
  });

  it("validates snippet input", () => {
    expect(
      validateSnippetInput({
        title: "  Mean helper  ",
        language: " Python ",
        code: " print(values.mean()) ",
        challengeSlug: " numpy-mean-array ",
      })
    ).toEqual({
      title: "Mean helper",
      language: "python",
      code: " print(values.mean()) ",
      lessonSlug: null,
      challengeSlug: "numpy-mean-array",
    });

    expect(() =>
      validateSnippetInput({ title: "", language: "python", code: "print(1)" })
    ).toThrow("Snippet title is required");
    expect(() =>
      validateSnippetInput({ title: "x".repeat(121), language: "python", code: "print(1)" })
    ).toThrow("Snippet title must be at most 120 characters");
    expect(() =>
      validateSnippetInput({ title: "Example", language: " ", code: "print(1)" })
    ).toThrow("Snippet language is required");
    expect(() =>
      validateSnippetInput({ title: "Example", language: "python", code: "   " })
    ).toThrow("Snippet code is required");
    expect(() =>
      validateSnippetInput({ title: "Example", language: "python", code: "x".repeat(100_001) })
    ).toThrow("Snippet code must be at most 100000 characters");
  });

  it("builds destination URLs", () => {
    expect(buildBookmarkHref({ targetType: "lesson", targetSlug: "phase-1/numpy" })).toBe(
      "/phase/phase-1/numpy"
    );
    expect(buildBookmarkHref({ targetType: "project", targetSlug: "portfolio-rag" })).toBe(
      "/projects/portfolio-rag"
    );
    expect(buildBookmarkHref({ targetType: "challenge", targetSlug: "numpy-mean-array" })).toBe(
      "/practice/numpy-mean-array"
    );
    expect(buildNoteHref({ lessonSlug: "phase-1/numpy" })).toBe("/phase/phase-1/numpy");
    expect(buildSnippetHref({ lessonSlug: "phase-1/numpy", challengeSlug: null })).toBe(
      "/phase/phase-1/numpy"
    );
    expect(buildSnippetHref({ lessonSlug: null, challengeSlug: "numpy-mean-array" })).toBe(
      "/practice/numpy-mean-array"
    );
    expect(buildSnippetHref({ lessonSlug: null, challengeSlug: null })).toBe("/playground");
  });
});
```

- [ ] **Step 2: Run the new test to verify it fails**

Run:

```bash
pnpm test:run lib/personal-library.test.ts
```

Expected: FAIL because `lib/personal-library.ts` does not exist yet.

- [ ] **Step 3: Implement the personal-library module**

Create `lib/personal-library.ts` with this content:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

export const BOOKMARK_TARGET_TYPES = ["lesson", "project", "challenge"] as const;

export type BookmarkTargetType = (typeof BOOKMARK_TARGET_TYPES)[number];

export type BookmarkTarget = {
  targetType: BookmarkTargetType;
  targetSlug: string;
};

export type BookmarkRecord = BookmarkTarget & {
  id: string;
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

export type SavedSnippetInput = {
  title: string;
  language: string;
  code: string;
  lessonSlug?: string | null;
  challengeSlug?: string | null;
};

type Row = Record<string, unknown>;

const BOOKMARK_SELECT = "id, target_type, target_slug, created_at, updated_at";
const NOTE_SELECT = "id, lesson_slug, content, created_at, updated_at";
const SNIPPET_SELECT = "id, title, language, code, lesson_slug, challenge_slug, created_at, updated_at";

export function isBookmarkTargetType(value: string): value is BookmarkTargetType {
  return BOOKMARK_TARGET_TYPES.includes(value as BookmarkTargetType);
}

function assertString(row: Row, table: string, key: string): string {
  const value = row[key];
  if (typeof value !== "string") {
    throw new Error(`Invalid ${table} row: ${key} must be a string`);
  }
  return value;
}

function assertNullableString(row: Row, table: string, key: string): string | null {
  const value = row[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    throw new Error(`Invalid ${table} row: ${key} must be a string or null`);
  }
  return value;
}

function trimmedRequired(value: string, message: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(message);
  return trimmed;
}

function assertMaxLength(value: string, max: number, message: string): string {
  if (value.length > max) throw new Error(message);
  return value;
}

export function normalizeBookmarkTarget(
  targetType: BookmarkTargetType,
  targetSlug: string
): BookmarkTarget {
  if (!isBookmarkTargetType(targetType)) {
    throw new Error(`Unsupported bookmark target type: ${String(targetType)}`);
  }

  return {
    targetType,
    targetSlug: trimmedRequired(targetSlug, "Bookmark target slug is required"),
  };
}

export function validateNoteContent(content: string): string {
  return assertMaxLength(
    trimmedRequired(content, "Note content is required"),
    20_000,
    "Note content must be at most 20000 characters"
  );
}

export function validateSnippetInput(input: SavedSnippetInput): SavedSnippetInput & {
  lessonSlug: string | null;
  challengeSlug: string | null;
} {
  const title = assertMaxLength(
    trimmedRequired(input.title, "Snippet title is required"),
    120,
    "Snippet title must be at most 120 characters"
  );
  const language = trimmedRequired(input.language, "Snippet language is required").toLowerCase();
  const code = assertMaxLength(
    input.code.trim().length > 0 ? input.code : "",
    100_000,
    "Snippet code must be at most 100000 characters"
  );

  if (!code) throw new Error("Snippet code is required");

  return {
    title,
    language,
    code,
    lessonSlug: input.lessonSlug?.trim() || null,
    challengeSlug: input.challengeSlug?.trim() || null,
  };
}

export function mapBookmarkRow(row: Row): BookmarkRecord {
  const targetType = assertString(row, "bookmarks", "target_type");
  return {
    id: assertString(row, "bookmarks", "id"),
    ...normalizeBookmarkTarget(targetType as BookmarkTargetType, assertString(row, "bookmarks", "target_slug")),
    createdAt: assertString(row, "bookmarks", "created_at"),
    updatedAt: assertString(row, "bookmarks", "updated_at"),
  };
}

export function mapNoteRow(row: Row): NoteRecord {
  return {
    id: assertString(row, "notes", "id"),
    lessonSlug: assertString(row, "notes", "lesson_slug"),
    content: assertString(row, "notes", "content"),
    createdAt: assertString(row, "notes", "created_at"),
    updatedAt: assertString(row, "notes", "updated_at"),
  };
}

export function mapSavedSnippetRow(row: Row): SavedSnippetRecord {
  return {
    id: assertString(row, "saved_snippets", "id"),
    title: assertString(row, "saved_snippets", "title"),
    language: assertString(row, "saved_snippets", "language"),
    code: assertString(row, "saved_snippets", "code"),
    lessonSlug: assertNullableString(row, "saved_snippets", "lesson_slug"),
    challengeSlug: assertNullableString(row, "saved_snippets", "challenge_slug"),
    createdAt: assertString(row, "saved_snippets", "created_at"),
    updatedAt: assertString(row, "saved_snippets", "updated_at"),
  };
}

export function buildLessonHref(lessonSlug: string): string {
  const [phaseSlug, topicSlug] = lessonSlug.split("/");
  if (!phaseSlug || !topicSlug) return "/roadmap";
  return `/phase/${phaseSlug}/${topicSlug}`;
}

export function buildBookmarkHref(target: Pick<BookmarkRecord, "targetType" | "targetSlug">): string {
  if (target.targetType === "lesson") return buildLessonHref(target.targetSlug);
  if (target.targetType === "project") return `/projects/${target.targetSlug}`;
  return `/practice/${target.targetSlug}`;
}

export function buildNoteHref(note: Pick<NoteRecord, "lessonSlug">): string {
  return buildLessonHref(note.lessonSlug);
}

export function buildSnippetHref(
  snippet: Pick<SavedSnippetRecord, "lessonSlug" | "challengeSlug">
): string {
  if (snippet.challengeSlug) return `/practice/${snippet.challengeSlug}`;
  if (snippet.lessonSlug) return buildLessonHref(snippet.lessonSlug);
  return "/playground";
}

export async function listBookmarks(
  supabase: SupabaseClient,
  userId: string
): Promise<BookmarkRecord[]> {
  const { data, error } = await supabase
    .from("bookmarks")
    .select(BOOKMARK_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as Row[]).map(mapBookmarkRow);
}

export async function isBookmarked(
  supabase: SupabaseClient,
  userId: string,
  target: BookmarkTarget
): Promise<boolean> {
  const normalized = normalizeBookmarkTarget(target.targetType, target.targetSlug);
  const { data, error } = await supabase
    .from("bookmarks")
    .select("id")
    .eq("user_id", userId)
    .eq("target_type", normalized.targetType)
    .eq("target_slug", normalized.targetSlug)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export async function toggleBookmark(
  supabase: SupabaseClient,
  userId: string,
  target: BookmarkTarget
): Promise<{ bookmarked: boolean; bookmark: BookmarkRecord | null }> {
  const normalized = normalizeBookmarkTarget(target.targetType, target.targetSlug);
  const { data: existing, error: lookupError } = await supabase
    .from("bookmarks")
    .select("id")
    .eq("user_id", userId)
    .eq("target_type", normalized.targetType)
    .eq("target_slug", normalized.targetSlug)
    .maybeSingle();

  if (lookupError) throw lookupError;

  if (existing && typeof (existing as Row).id === "string") {
    const { error: deleteError } = await supabase
      .from("bookmarks")
      .delete()
      .eq("user_id", userId)
      .eq("id", (existing as Row).id);
    if (deleteError) throw deleteError;
    return { bookmarked: false, bookmark: null };
  }

  const { data, error } = await supabase
    .from("bookmarks")
    .insert({
      user_id: userId,
      target_type: normalized.targetType,
      target_slug: normalized.targetSlug,
    })
    .select(BOOKMARK_SELECT)
    .single();

  if (error) throw error;
  return { bookmarked: true, bookmark: mapBookmarkRow(data as Row) };
}

export async function deleteBookmark(
  supabase: SupabaseClient,
  userId: string,
  bookmarkId: string
): Promise<void> {
  const { error } = await supabase
    .from("bookmarks")
    .delete()
    .eq("user_id", userId)
    .eq("id", bookmarkId);
  if (error) throw error;
}

export async function listNotesForLesson(
  supabase: SupabaseClient,
  userId: string,
  lessonSlug: string
): Promise<NoteRecord[]> {
  const { data, error } = await supabase
    .from("notes")
    .select(NOTE_SELECT)
    .eq("user_id", userId)
    .eq("lesson_slug", trimmedRequired(lessonSlug, "Lesson slug is required"))
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as Row[]).map(mapNoteRow);
}

export async function listNotes(
  supabase: SupabaseClient,
  userId: string
): Promise<NoteRecord[]> {
  const { data, error } = await supabase
    .from("notes")
    .select(NOTE_SELECT)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as Row[]).map(mapNoteRow);
}

export async function createNote(
  supabase: SupabaseClient,
  userId: string,
  lessonSlug: string,
  content: string
): Promise<NoteRecord> {
  const { data, error } = await supabase
    .from("notes")
    .insert({
      user_id: userId,
      lesson_slug: trimmedRequired(lessonSlug, "Lesson slug is required"),
      content: validateNoteContent(content),
    })
    .select(NOTE_SELECT)
    .single();

  if (error) throw error;
  return mapNoteRow(data as Row);
}

export async function updateNote(
  supabase: SupabaseClient,
  userId: string,
  noteId: string,
  content: string
): Promise<NoteRecord> {
  const { data, error } = await supabase
    .from("notes")
    .update({ content: validateNoteContent(content) })
    .eq("user_id", userId)
    .eq("id", noteId)
    .select(NOTE_SELECT)
    .single();

  if (error) throw error;
  return mapNoteRow(data as Row);
}

export async function deleteNote(
  supabase: SupabaseClient,
  userId: string,
  noteId: string
): Promise<void> {
  const { error } = await supabase
    .from("notes")
    .delete()
    .eq("user_id", userId)
    .eq("id", noteId);
  if (error) throw error;
}

export async function listSnippets(
  supabase: SupabaseClient,
  userId: string
): Promise<SavedSnippetRecord[]> {
  const { data, error } = await supabase
    .from("saved_snippets")
    .select(SNIPPET_SELECT)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as Row[]).map(mapSavedSnippetRow);
}

export async function createSnippet(
  supabase: SupabaseClient,
  userId: string,
  input: SavedSnippetInput
): Promise<SavedSnippetRecord> {
  const normalized = validateSnippetInput(input);
  const { data, error } = await supabase
    .from("saved_snippets")
    .insert({
      user_id: userId,
      title: normalized.title,
      language: normalized.language,
      code: normalized.code,
      lesson_slug: normalized.lessonSlug,
      challenge_slug: normalized.challengeSlug,
    })
    .select(SNIPPET_SELECT)
    .single();

  if (error) throw error;
  return mapSavedSnippetRow(data as Row);
}

export async function updateSnippet(
  supabase: SupabaseClient,
  userId: string,
  snippetId: string,
  input: SavedSnippetInput
): Promise<SavedSnippetRecord> {
  const normalized = validateSnippetInput(input);
  const { data, error } = await supabase
    .from("saved_snippets")
    .update({
      title: normalized.title,
      language: normalized.language,
      code: normalized.code,
      lesson_slug: normalized.lessonSlug,
      challenge_slug: normalized.challengeSlug,
    })
    .eq("user_id", userId)
    .eq("id", snippetId)
    .select(SNIPPET_SELECT)
    .single();

  if (error) throw error;
  return mapSavedSnippetRow(data as Row);
}

export async function deleteSnippet(
  supabase: SupabaseClient,
  userId: string,
  snippetId: string
): Promise<void> {
  const { error } = await supabase
    .from("saved_snippets")
    .delete()
    .eq("user_id", userId)
    .eq("id", snippetId);
  if (error) throw error;
}
```

- [ ] **Step 4: Run the helper tests and all existing tests**

Run:

```bash
pnpm test:run lib/personal-library.test.ts
pnpm test:run
```

Expected: PASS. If TypeScript reports a Supabase generic mismatch, keep `SupabaseClient` as the parameter type and cast raw `data` to `Row` only at mapper boundaries.

- [ ] **Step 5: Checkpoint**

Run:

```bash
git status --short
```

Expected changed files:

```txt
A  lib/personal-library.ts
A  lib/personal-library.test.ts
```

If the user has explicitly granted commit permission, commit this task:

```bash
git add lib/personal-library.ts lib/personal-library.test.ts
git commit -m "feat: add personal library helpers"
```

If commit permission has not been granted, do not run `git commit`.

---

## Task 2: Shared Session Hook and Bookmark Button

**Files:**
- Create: `components/library/use-current-user.ts`
- Create: `components/library/bookmark-button.tsx`

- [ ] **Step 1: Create the shared current-user hook**

Create `components/library/use-current-user.ts` with this content:

```ts
"use client";

import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type CurrentUserState = {
  supabase: SupabaseClient | null;
  user: User | null;
  loading: boolean;
  available: boolean;
};

export function useCurrentUser(): CurrentUserState {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [supabase]);

  return {
    supabase,
    user,
    loading,
    available: Boolean(supabase),
  };
}
```

- [ ] **Step 2: Create the bookmark button**

Create `components/library/bookmark-button.tsx` with this content:

```tsx
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Bookmark, BookmarkCheck, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isBookmarked, toggleBookmark, type BookmarkTargetType } from "@/lib/personal-library";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "./use-current-user";

type BookmarkButtonProps = {
  targetType: BookmarkTargetType;
  targetSlug: string;
  label?: string;
  savedLabel?: string;
  className?: string;
};

export function BookmarkButton({
  targetType,
  targetSlug,
  label = "Lưu",
  savedLabel = "Đã lưu",
  className,
}: BookmarkButtonProps) {
  const { supabase, user, loading, available } = useCurrentUser();
  const [bookmarked, setBookmarked] = useState(false);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = user?.id ?? null;

  useEffect(() => {
    if (!supabase || !userId) return;

    let mounted = true;
    setChecking(true);
    setError(null);

    isBookmarked(supabase, userId, { targetType, targetSlug })
      .then((value) => {
        if (mounted) setBookmarked(value);
      })
      .catch((e: unknown) => {
        if (mounted) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (mounted) setChecking(false);
      });

    return () => {
      mounted = false;
    };
  }, [supabase, userId, targetType, targetSlug]);

  const handleToggle = useCallback(async () => {
    if (!supabase || !userId) return;

    const previous = bookmarked;
    setSaving(true);
    setError(null);
    setBookmarked(!previous);

    try {
      const result = await toggleBookmark(supabase, userId, { targetType, targetSlug });
      setBookmarked(result.bookmarked);
    } catch (e) {
      setBookmarked(previous);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }, [bookmarked, supabase, targetSlug, targetType, userId]);

  if (loading || checking) {
    return <span className={cn("inline-flex h-7 w-20 animate-pulse rounded-lg bg-foreground/10", className)} />;
  }

  if (!available || !userId) {
    return (
      <Link
        href="/login"
        className={cn(
          "inline-flex h-7 items-center gap-1.5 rounded-lg border border-border bg-foreground/5 px-2.5 text-[0.8rem] font-medium text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground",
          className
        )}
      >
        <LogIn className="h-3.5 w-3.5" />
        Đăng nhập để lưu
      </Link>
    );
  }

  return (
    <span className={cn("inline-flex flex-col gap-1", className)}>
      <Button
        type="button"
        variant={bookmarked ? "secondary" : "outline"}
        size="sm"
        onClick={handleToggle}
        disabled={saving}
        className="gap-1.5"
        aria-pressed={bookmarked}
      >
        {bookmarked ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
        {bookmarked ? savedLabel : label}
      </Button>
      {error && (
        <span className="inline-flex max-w-56 items-center gap-1 text-[10px] text-destructive">
          <AlertCircle className="h-3 w-3" />
          {error}
        </span>
      )}
    </span>
  );
}
```

- [ ] **Step 3: Run typecheck for the new components**

Run:

```bash
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 4: Checkpoint**

Run:

```bash
git status --short
```

Expected changed files include:

```txt
A  components/library/use-current-user.ts
A  components/library/bookmark-button.tsx
```

If the user has explicitly granted commit permission, commit this task:

```bash
git add components/library/use-current-user.ts components/library/bookmark-button.tsx
git commit -m "feat: add bookmark button"
```

If commit permission has not been granted, do not run `git commit`.

---

## Task 3: Wire Bookmarks into Lesson, Project, and Challenge Pages

**Files:**
- Modify: `app/phase/[slug]/[topic]/page.tsx`
- Modify: `app/projects/[id]/page.tsx`
- Modify: `components/challenge/challenge-view.tsx`

- [ ] **Step 1: Add lesson bookmark to topic pages**

In `app/phase/[slug]/[topic]/page.tsx`, add this import with the existing component imports:

```ts
import { BookmarkButton } from "@/components/library/bookmark-button";
```

Replace the existing progress action block:

```tsx
<div className="mt-4">
  <ProgressToggle phaseSlug={phase.slug} topicId={t.id} />
</div>
```

with this block:

```tsx
<div className="mt-4 flex flex-wrap items-center gap-2">
  <ProgressToggle phaseSlug={phase.slug} topicId={t.id} />
  <BookmarkButton
    targetType="lesson"
    targetSlug={`${phase.slug}/${t.id}`}
    label="Lưu bài"
    savedLabel="Đã lưu bài"
  />
</div>
```

- [ ] **Step 2: Add project bookmark to project detail pages**

In `app/projects/[id]/page.tsx`, add this import:

```ts
import { BookmarkButton } from "@/components/library/bookmark-button";
```

Replace the header top row:

```tsx
<div className="flex items-start justify-between gap-3">
  <Badge
    variant="secondary"
    className={`${d.bg} ${d.text} border ${d.border} gap-1.5 px-2 py-0 text-[10px]`}
  >
    <span className="h-1.5 w-1.5 rounded-full bg-current" />
    {d.label}
  </Badge>
  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70">
    {phaseLabel}
  </span>
</div>
```

with this block:

```tsx
<div className="flex flex-wrap items-start justify-between gap-3">
  <div className="flex flex-wrap items-center gap-2">
    <Badge
      variant="secondary"
      className={`${d.bg} ${d.text} border ${d.border} gap-1.5 px-2 py-0 text-[10px]`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {d.label}
    </Badge>
    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70">
      {phaseLabel}
    </span>
  </div>
  <BookmarkButton
    targetType="project"
    targetSlug={project.id}
    label="Lưu dự án"
    savedLabel="Đã lưu dự án"
  />
</div>
```

- [ ] **Step 3: Add challenge bookmark to challenge detail pages**

In `components/challenge/challenge-view.tsx`, add this import:

```ts
import { BookmarkButton } from "@/components/library/bookmark-button";
```

Replace the challenge header block:

```tsx
<div className="mb-8">
  <div className="mb-3 flex flex-wrap items-center gap-2">
    <span
      className={cn(
        "rounded-md border px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider",
        cat.color,
        "border-current/20"
      )}
    >
      {cat.label}
    </span>
    <span
      className={cn(
        "rounded-md border px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider",
        DIFFICULTY_STYLES[challenge.difficulty]
      )}
    >
      {DIFFICULTY_LABELS[challenge.difficulty]}
    </span>
    {solved && (
      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
        <CheckCircle2 className="h-3 w-3" />
        Đã giải
      </span>
    )}
  </div>
  <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
    {challenge.title}
  </h1>
</div>
```

with this block:

```tsx
<div className="mb-8">
  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={cn(
          "rounded-md border px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider",
          cat.color,
          "border-current/20"
        )}
      >
        {cat.label}
      </span>
      <span
        className={cn(
          "rounded-md border px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider",
          DIFFICULTY_STYLES[challenge.difficulty]
        )}
      >
        {DIFFICULTY_LABELS[challenge.difficulty]}
      </span>
      {solved && (
        <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
          <CheckCircle2 className="h-3 w-3" />
          Đã giải
        </span>
      )}
    </div>
    <BookmarkButton
      targetType="challenge"
      targetSlug={challenge.id}
      label="Lưu challenge"
      savedLabel="Đã lưu challenge"
    />
  </div>
  <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
    {challenge.title}
  </h1>
</div>
```

- [ ] **Step 4: Validate the bookmark wiring**

Run:

```bash
pnpm lint
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 5: Checkpoint**

Run:

```bash
git status --short
```

Expected changed files include:

```txt
M  app/phase/[slug]/[topic]/page.tsx
M  app/projects/[id]/page.tsx
M  components/challenge/challenge-view.tsx
```

If the user has explicitly granted commit permission, commit this task:

```bash
git add app/phase/[slug]/[topic]/page.tsx app/projects/[id]/page.tsx components/challenge/challenge-view.tsx
git commit -m "feat: wire bookmarks into learning pages"
```

If commit permission has not been granted, do not run `git commit`.

---

## Task 4: Lesson Notes Panel

**Files:**
- Create: `components/library/lesson-notes-panel.tsx`
- Modify: `app/phase/[slug]/[topic]/page.tsx`

- [ ] **Step 1: Create the lesson notes panel component**

Create `components/library/lesson-notes-panel.tsx` with this content:

```tsx
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Edit3, Loader2, LogIn, Plus, Save, StickyNote, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  createNote,
  deleteNote,
  listNotesForLesson,
  updateNote,
  validateNoteContent,
  type NoteRecord,
} from "@/lib/personal-library";
import { useCurrentUser } from "./use-current-user";

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

type LessonNotesPanelProps = {
  lessonSlug: string;
  lessonTitle: string;
};

export function LessonNotesPanel({ lessonSlug, lessonTitle }: LessonNotesPanelProps) {
  const { supabase, user, loading: loadingUser, available } = useCurrentUser();
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  const userId = user?.id ?? null;

  const loadNotes = useCallback(async () => {
    if (!supabase || !userId) return;
    setLoadingNotes(true);
    setError(null);
    try {
      const nextNotes = await listNotesForLesson(supabase, userId, lessonSlug);
      setNotes(nextNotes);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoadingNotes(false);
    }
  }, [lessonSlug, supabase, userId]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  const handleCreate = async () => {
    if (!supabase || !userId) return;
    setSaving(true);
    setError(null);
    try {
      validateNoteContent(draft);
      const created = await createNote(supabase, userId, lessonSlug, draft);
      setNotes((current) => [created, ...current]);
      setDraft("");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (note: NoteRecord) => {
    setEditingId(note.id);
    setEditingContent(note.content);
    setError(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingContent("");
  };

  const handleUpdate = async (noteId: string) => {
    if (!supabase || !userId) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateNote(supabase, userId, noteId, editingContent);
      setNotes((current) => current.map((note) => (note.id === noteId ? updated : note)));
      cancelEditing();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!supabase || !userId) return;
    setSaving(true);
    setError(null);
    try {
      await deleteNote(supabase, userId, noteId);
      setNotes((current) => current.filter((note) => note.id !== noteId));
      if (editingId === noteId) cancelEditing();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (loadingUser) {
    return (
      <section className="rounded-2xl border border-border bg-card/35 p-5">
        <div className="h-5 w-40 animate-pulse rounded bg-foreground/10" />
        <div className="mt-4 h-20 animate-pulse rounded-lg bg-foreground/10" />
      </section>
    );
  }

  if (!available || !userId) {
    return (
      <section className="rounded-2xl border border-border bg-card/35 p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <StickyNote className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-foreground">Ghi chú cá nhân</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Đăng nhập để lưu ghi chú riêng cho bài học này.
            </p>
            <Link
              href="/login"
              className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-foreground/5 px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
            >
              <LogIn className="h-3.5 w-3.5" />
              Đăng nhập để ghi chú
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card/35 p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <StickyNote className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-foreground">Ghi chú cá nhân</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Lưu các ý chính, câu hỏi hoặc ví dụ riêng cho bài “{lessonTitle}”.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Viết ghi chú mới..."
          className="min-h-24 text-sm"
          maxLength={20_000}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] font-mono text-muted-foreground/70">
            {draft.length}/20000 ký tự
          </span>
          <Button type="button" size="sm" onClick={handleCreate} disabled={saving || draft.trim().length === 0}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Thêm ghi chú
          </Button>
        </div>
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </div>
      )}

      <div className="mt-5 space-y-3">
        {loadingNotes && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Đang tải ghi chú...
          </div>
        )}

        {!loadingNotes && notes.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-foreground/[0.02] p-4 text-sm text-muted-foreground">
            Chưa có ghi chú nào cho bài này.
          </div>
        )}

        {notes.map((note) => {
          const editing = editingId === note.id;
          return (
            <article key={note.id} className="rounded-xl border border-border bg-background/45 p-4">
              {editing ? (
                <div className="space-y-2">
                  <Textarea
                    value={editingContent}
                    onChange={(event) => setEditingContent(event.target.value)}
                    className="min-h-24 text-sm"
                    maxLength={20_000}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground/70">
                      {editingContent.length}/20000 ký tự
                    </span>
                    <div className="flex items-center gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={cancelEditing} disabled={saving}>
                        <X className="h-3.5 w-3.5" />
                        Huỷ
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleUpdate(note.id)}
                        disabled={saving || editingContent.trim().length === 0}
                      >
                        <Save className="h-3.5 w-3.5" />
                        Lưu
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{note.content}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground/60">
                      Cập nhật {formatTimestamp(note.updatedAt)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button type="button" size="sm" variant="ghost" onClick={() => startEditing(note)} disabled={saving}>
                        <Edit3 className="h-3.5 w-3.5" />
                        Sửa
                      </Button>
                      <Button type="button" size="sm" variant="destructive" onClick={() => handleDelete(note.id)} disabled={saving}>
                        <Trash2 className="h-3.5 w-3.5" />
                        Xoá
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Wire the notes panel into topic pages**

In `app/phase/[slug]/[topic]/page.tsx`, add this import:

```ts
import { LessonNotesPanel } from "@/components/library/lesson-notes-panel";
```

Add this block after the content/fallback section and before the quiz block:

```tsx
{hasContent && (
  <div className="mt-12 max-w-[65ch]">
    <LessonNotesPanel lessonSlug={`${phase.slug}/${t.id}`} lessonTitle={t.title} />
  </div>
)}
```

The surrounding area should become:

```tsx
      {hasContent ? (
        <div className="grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
          {toc.length > 0 && <TocSidebar items={toc} />}

          <article className="min-w-0 max-w-[65ch] leading-relaxed">
            <MdxContent source={source} />
          </article>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card/20 p-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground/5 border border-border">
            <BookOpen className="h-6 w-6 text-muted-foreground/70" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Nội dung đang hoàn thiện</h2>
          <p className="mx-auto mt-2 max-w-sm text-xs text-muted-foreground leading-relaxed">
            Chương này chưa có bài giảng đầy đủ. Trong lúc chờ, bạn có thể xem các mục
            kiến thức cần học ở phần &quot;Bạn sẽ học gì&quot; phía trên, hoặc đọc tài liệu tham khảo.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={`/resources`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-foreground/5 px-4 py-2 text-xs font-mono font-semibold text-muted-foreground hover:bg-foreground/10"
            >
              <BookOpen className="h-4 w-4" /> Tài liệu tham khảo
            </Link>
            <Link
              href={`/phase/${phase.slug}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-foreground/5 px-4 py-2 text-xs font-mono font-semibold text-muted-foreground hover:bg-foreground/10"
            >
              <ArrowLeft className="h-4 w-4" /> Quay lại phase
            </Link>
          </div>
        </div>
      )}

      {hasContent && (
        <div className="mt-12 max-w-[65ch]">
          <LessonNotesPanel lessonSlug={`${phase.slug}/${t.id}`} lessonTitle={t.title} />
        </div>
      )}

      {quiz && (
        <div className="mt-12">
          <QuizCard quiz={quiz} phaseSlug={phase.slug} topicId={t.id} />
        </div>
      )}
```

- [ ] **Step 3: Validate notes panel types**

Run:

```bash
pnpm typecheck
pnpm lint
```

Expected: PASS.

- [ ] **Step 4: Checkpoint**

Run:

```bash
git status --short
```

Expected changed files include:

```txt
A  components/library/lesson-notes-panel.tsx
M  app/phase/[slug]/[topic]/page.tsx
```

If the user has explicitly granted commit permission, commit this task:

```bash
git add components/library/lesson-notes-panel.tsx app/phase/[slug]/[topic]/page.tsx
git commit -m "feat: add lesson notes panel"
```

If commit permission has not been granted, do not run `git commit`.

---

## Task 5: Save Snippet Button for Playground and Challenges

**Files:**
- Create: `components/library/save-snippet-button.tsx`
- Modify: `components/playground/playground.tsx`
- Modify: `components/challenge/challenge-editor.tsx`
- Modify: `components/challenge/challenge-view.tsx`

- [ ] **Step 1: Create the save-snippet button component**

Create `components/library/save-snippet-button.tsx` with this content:

```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertCircle, Code2, Loader2, LogIn, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createSnippet, validateSnippetInput } from "@/lib/personal-library";
import { useCurrentUser } from "./use-current-user";

type SaveSnippetButtonProps = {
  language: string;
  code: string;
  defaultTitle?: string;
  lessonSlug?: string | null;
  challengeSlug?: string | null;
  className?: string;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function SaveSnippetButton({
  language,
  code,
  defaultTitle,
  lessonSlug = null,
  challengeSlug = null,
  className,
}: SaveSnippetButtonProps) {
  const { supabase, user, loading, available } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(defaultTitle ?? `${language} snippet`);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const userId = user?.id ?? null;

  useEffect(() => {
    if (!open) {
      setTitle(defaultTitle ?? `${language} snippet`);
      setError(null);
      setSuccess(false);
    }
  }, [defaultTitle, language, open]);

  if (loading) {
    return <span className="inline-flex h-7 w-24 animate-pulse rounded-lg bg-foreground/10" />;
  }

  if (!available || !userId) {
    return (
      <Link
        href="/login"
        className={
          className ??
          "inline-flex h-7 items-center gap-1.5 rounded-lg border border-border bg-foreground/5 px-2.5 text-[0.8rem] font-medium text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
        }
      >
        <LogIn className="h-3.5 w-3.5" />
        Đăng nhập để lưu code
      </Link>
    );
  }

  const handleSave = async () => {
    if (!supabase || !userId) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const input = validateSnippetInput({
        title,
        language,
        code,
        lessonSlug,
        challengeSlug,
      });
      await createSnippet(supabase, userId, input);
      setSuccess(true);
      setOpen(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" variant="outline" size="sm" className={className ?? "gap-1.5"} />
        }
      >
        <Save className="h-3.5 w-3.5" />
        Lưu snippet
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lưu code snippet</DialogTitle>
          <DialogDescription>
            Snippet sẽ được lưu vào thư viện cá nhân của bạn.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
            Tiêu đề
            <Input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} />
          </label>
          <div className="rounded-lg border border-border bg-foreground/[0.03] p-3">
            <div className="mb-2 flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70">
              <Code2 className="h-3.5 w-3.5" />
              {language}
            </div>
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
              {code.slice(0, 2000)}
              {code.length > 2000 ? "\n..." : ""}
            </pre>
          </div>
          {error && (
            <div className="flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5" />
              {error}
            </div>
          )}
          {success && <p className="text-xs text-emerald-400">Đã lưu snippet.</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Huỷ
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving || title.trim().length === 0 || code.trim().length === 0}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Wire snippet saving into the playground widget**

In `components/playground/playground.tsx`, add this import:

```ts
import { SaveSnippetButton } from "@/components/library/save-snippet-button";
```

Update the `Playground` props signature from:

```tsx
export function Playground({
  lang,
  initialCode,
  title,
  persistKey,
  showOpenInPlayground = false,
}: {
  lang: Lang;
  initialCode: string;
  title?: string;
  /** Nếu có, lưu code vào localStorage key này (standalone page). */
  persistKey?: string;
  /** Inline = true → hiện nút "Mở trong playground". */
  showOpenInPlayground?: boolean;
}) {
```

To:

```tsx
export function Playground({
  lang,
  initialCode,
  title,
  persistKey,
  showOpenInPlayground = false,
  snippetContext,
}: {
  lang: Lang;
  initialCode: string;
  title?: string;
  /** Nếu có, lưu code vào localStorage key này (standalone page). */
  persistKey?: string;
  /** Inline = true → hiện nút "Mở trong playground". */
  showOpenInPlayground?: boolean;
  /** Optional context when playground appears inside a lesson/challenge. */
  snippetContext?: {
    lessonSlug?: string | null;
    challengeSlug?: string | null;
    defaultTitle?: string;
  };
}) {
```

Inside the toolbar, insert the save button before the reset button. Replace:

```tsx
<Button
  onClick={reset}
  variant="outline"
  size="sm"
  className="gap-1.5 px-2.5"
  title="Đưa code về ban đầu"
>
  <RotateCcw className="h-3.5 w-3.5" />
</Button>
```

with:

```tsx
<SaveSnippetButton
  language={lang}
  code={code}
  lessonSlug={snippetContext?.lessonSlug ?? null}
  challengeSlug={snippetContext?.challengeSlug ?? null}
  defaultTitle={snippetContext?.defaultTitle ?? `${LANG_LABELS[lang]} snippet`}
/>
<Button
  onClick={reset}
  variant="outline"
  size="sm"
  className="gap-1.5 px-2.5"
  title="Đưa code về ban đầu"
>
  <RotateCcw className="h-3.5 w-3.5" />
</Button>
```

- [ ] **Step 3: Wire snippet saving into the challenge editor**

In `components/challenge/challenge-editor.tsx`, add this import:

```ts
import { SaveSnippetButton } from "@/components/library/save-snippet-button";
```

Update the `ChallengeEditor` function parameters from:

```tsx
export function ChallengeEditor({
  starterCode,
  testCases,
  onSubmit,
  persistKey,
}: {
  starterCode: string;
  testCases: TestCase[];
  /** Callback for every submit result — ghi progress/attempts. */
  onSubmit?: (payload: { code: string; result: ChallengeRunResult; passed: boolean }) => void;
  /** localStorage key cho code. */
  persistKey?: string;
}) {
```

To:

```tsx
export function ChallengeEditor({
  starterCode,
  testCases,
  onSubmit,
  persistKey,
  challengeId,
  challengeTitle,
}: {
  starterCode: string;
  testCases: TestCase[];
  /** Callback for every submit result — ghi progress/attempts. */
  onSubmit?: (payload: { code: string; result: ChallengeRunResult; passed: boolean }) => void;
  /** localStorage key cho code. */
  persistKey?: string;
  /** Challenge context for saved snippets. */
  challengeId?: string;
  challengeTitle?: string;
}) {
```

Replace the reset button in the toolbar:

```tsx
<Button
  onClick={reset}
  variant="ghost"
  size="sm"
  className="ml-auto gap-1.5"
  title="Đưa code về ban đầu"
>
  <RotateCcw className="h-3.5 w-3.5" />
</Button>
```

with this block:

```tsx
<div className="ml-auto flex items-center gap-1.5">
  <SaveSnippetButton
    language="python"
    code={code}
    challengeSlug={challengeId ?? null}
    defaultTitle={challengeTitle ? `${challengeTitle} solution draft` : "Python challenge snippet"}
  />
  <Button
    onClick={reset}
    variant="ghost"
    size="sm"
    className="gap-1.5"
    title="Đưa code về ban đầu"
  >
    <RotateCcw className="h-3.5 w-3.5" />
  </Button>
</div>
```

- [ ] **Step 4: Pass challenge context from ChallengeView**

In `components/challenge/challenge-view.tsx`, update the `ChallengeEditor` props from:

```tsx
<ChallengeEditor
  starterCode={challenge.starterCode}
  testCases={challenge.testCases}
  persistKey={`ai-roadmap:challenge-code:${challenge.id}`}
  onSubmit={({ code, result, passed }) =>
    setChallengeResult(challenge.id, passed, {
      code,
      language: "python",
      testResults: result,
      submittedAt: new Date().toISOString(),
      durationSeconds:
        typeof result.durationMs === "number"
          ? result.durationMs / 1000
          : undefined,
    })
  }
/>
```

To:

```tsx
<ChallengeEditor
  starterCode={challenge.starterCode}
  testCases={challenge.testCases}
  persistKey={`ai-roadmap:challenge-code:${challenge.id}`}
  challengeId={challenge.id}
  challengeTitle={challenge.title}
  onSubmit={({ code, result, passed }) =>
    setChallengeResult(challenge.id, passed, {
      code,
      language: "python",
      testResults: result,
      submittedAt: new Date().toISOString(),
      durationSeconds:
        typeof result.durationMs === "number"
          ? result.durationMs / 1000
          : undefined,
    })
  }
/>
```

- [ ] **Step 5: Validate snippet wiring**

Run:

```bash
pnpm lint
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 6: Checkpoint**

Run:

```bash
git status --short
```

Expected changed files include:

```txt
A  components/library/save-snippet-button.tsx
M  components/playground/playground.tsx
M  components/challenge/challenge-editor.tsx
M  components/challenge/challenge-view.tsx
```

If the user has explicitly granted commit permission, commit this task:

```bash
git add components/library/save-snippet-button.tsx components/playground/playground.tsx components/challenge/challenge-editor.tsx components/challenge/challenge-view.tsx
git commit -m "feat: save code snippets"
```

If commit permission has not been granted, do not run `git commit`.

---

## Task 6: Library Page and Navigation

**Files:**
- Create: `components/library/library-page-client.tsx`
- Create: `app/library/page.tsx`
- Modify: `components/layout/navbar.tsx`

- [ ] **Step 1: Create the Library client component**

Create `components/library/library-page-client.tsx` with this content:

```tsx
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Bookmark, Code2, ExternalLink, Library, Loader2, LogIn, StickyNote, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildBookmarkHref,
  buildNoteHref,
  buildSnippetHref,
  deleteBookmark,
  deleteNote,
  deleteSnippet,
  listBookmarks,
  listNotes,
  listSnippets,
  type BookmarkRecord,
  type NoteRecord,
  type SavedSnippetRecord,
} from "@/lib/personal-library";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "./use-current-user";

type ActiveTab = "bookmarks" | "notes" | "snippets";

type LibraryData = {
  bookmarks: BookmarkRecord[];
  notes: NoteRecord[];
  snippets: SavedSnippetRecord[];
};

const EMPTY_DATA: LibraryData = {
  bookmarks: [],
  notes: [],
  snippets: [],
};

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function bookmarkLabel(bookmark: BookmarkRecord): string {
  if (bookmark.targetType === "lesson") return `Bài học · ${bookmark.targetSlug}`;
  if (bookmark.targetType === "project") return `Dự án · ${bookmark.targetSlug}`;
  return `Challenge · ${bookmark.targetSlug}`;
}

function snippetPreview(code: string): string {
  const lines = code.split("\n").slice(0, 8).join("\n");
  return code.split("\n").length > 8 ? `${lines}\n...` : lines;
}

export function LibraryPageClient() {
  const { supabase, user, loading: loadingUser, available } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<ActiveTab>("bookmarks");
  const [data, setData] = useState<LibraryData>(EMPTY_DATA);
  const [loadingData, setLoadingData] = useState(false);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const userId = user?.id ?? null;

  const loadLibrary = useCallback(async () => {
    if (!supabase || !userId) return;
    setLoadingData(true);
    setError(null);
    try {
      const [bookmarks, notes, snippets] = await Promise.all([
        listBookmarks(supabase, userId),
        listNotes(supabase, userId),
        listSnippets(supabase, userId),
      ]);
      setData({ bookmarks, notes, snippets });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoadingData(false);
    }
  }, [supabase, userId]);

  useEffect(() => {
    void loadLibrary();
  }, [loadLibrary]);

  const handleDeleteBookmark = async (bookmarkId: string) => {
    if (!supabase || !userId) return;
    setMutatingId(bookmarkId);
    setError(null);
    try {
      await deleteBookmark(supabase, userId, bookmarkId);
      setData((current) => ({
        ...current,
        bookmarks: current.bookmarks.filter((bookmark) => bookmark.id !== bookmarkId),
      }));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setMutatingId(null);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!supabase || !userId) return;
    setMutatingId(noteId);
    setError(null);
    try {
      await deleteNote(supabase, userId, noteId);
      setData((current) => ({
        ...current,
        notes: current.notes.filter((note) => note.id !== noteId),
      }));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setMutatingId(null);
    }
  };

  const handleDeleteSnippet = async (snippetId: string) => {
    if (!supabase || !userId) return;
    setMutatingId(snippetId);
    setError(null);
    try {
      await deleteSnippet(supabase, userId, snippetId);
      setData((current) => ({
        ...current,
        snippets: current.snippets.filter((snippet) => snippet.id !== snippetId),
      }));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setMutatingId(null);
    }
  };

  if (loadingUser) {
    return (
      <div className="rounded-2xl border border-border bg-card/35 p-6">
        <div className="h-5 w-48 animate-pulse rounded bg-foreground/10" />
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="h-24 animate-pulse rounded-xl bg-foreground/10" />
          <div className="h-24 animate-pulse rounded-xl bg-foreground/10" />
          <div className="h-24 animate-pulse rounded-xl bg-foreground/10" />
        </div>
      </div>
    );
  }

  if (!available || !userId) {
    return (
      <div className="rounded-2xl border border-border bg-card/35 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Library className="h-5 w-5" />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">Thư viện cá nhân</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          Đăng nhập để lưu bài học, ghi chú và code snippet vào workspace học tập của bạn.
        </p>
        <Link
          href="/login"
          className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/80"
        >
          <LogIn className="h-4 w-4" />
          Đăng nhập
        </Link>
      </div>
    );
  }

  const tabs: Array<{ id: ActiveTab; label: string; count: number; icon: React.ComponentType<{ className?: string }> }> = [
    { id: "bookmarks", label: "Đã lưu", count: data.bookmarks.length, icon: Bookmark },
    { id: "notes", label: "Ghi chú", count: data.notes.length, icon: StickyNote },
    { id: "snippets", label: "Snippets", count: data.snippets.length, icon: Code2 },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card/35 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-primary">
              <Library className="h-4 w-4" />
              Personal Workspace
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Thư viện cá nhân
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Quay lại bài đã lưu, ghi chú riêng và code snippet từ playground hoặc challenge.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void loadLibrary()} disabled={loadingData}>
            {loadingData ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Làm mới
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-foreground/5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              <span className="rounded bg-foreground/10 px-1.5 py-0.5 text-[10px] font-mono">{tab.count}</span>
            </button>
          );
        })}
      </div>

      {loadingData ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card/35 p-5 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang tải thư viện...
        </div>
      ) : (
        <>
          {activeTab === "bookmarks" && (
            <div className="grid gap-3">
              {data.bookmarks.length === 0 ? (
                <EmptyState icon={Bookmark} title="Chưa lưu nội dung nào" description="Dùng nút lưu trên bài học, dự án hoặc challenge để thêm vào đây." />
              ) : (
                data.bookmarks.map((bookmark) => (
                  <article key={bookmark.id} className="rounded-xl border border-border bg-card/35 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{bookmarkLabel(bookmark)}</p>
                        <p className="mt-1 text-[10px] font-mono text-muted-foreground/70">
                          Lưu lúc {formatTimestamp(bookmark.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={buildBookmarkHref(bookmark)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-foreground/5 px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
                        >
                          Mở <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteBookmark(bookmark.id)}
                          disabled={mutatingId === bookmark.id}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Xoá
                        </Button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          )}

          {activeTab === "notes" && (
            <div className="grid gap-3">
              {data.notes.length === 0 ? (
                <EmptyState icon={StickyNote} title="Chưa có ghi chú" description="Mở một bài học và thêm ghi chú cá nhân để xem lại tại đây." />
              ) : (
                data.notes.map((note) => (
                  <article key={note.id} className="rounded-xl border border-border bg-card/35 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-mono text-primary">{note.lessonSlug}</p>
                        <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                          {note.content}
                        </p>
                        <p className="mt-2 text-[10px] font-mono text-muted-foreground/70">
                          Cập nhật {formatTimestamp(note.updatedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={buildNoteHref(note)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-foreground/5 px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
                        >
                          Mở bài <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteNote(note.id)}
                          disabled={mutatingId === note.id}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Xoá
                        </Button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          )}

          {activeTab === "snippets" && (
            <div className="grid gap-3">
              {data.snippets.length === 0 ? (
                <EmptyState icon={Code2} title="Chưa lưu snippet" description="Lưu code từ playground hoặc challenge để xem lại tại đây." />
              ) : (
                data.snippets.map((snippet) => (
                  <article key={snippet.id} className="rounded-xl border border-border bg-card/35 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-sm font-semibold text-foreground">{snippet.title}</h2>
                          <span className="rounded border border-border bg-foreground/5 px-1.5 py-0.5 text-[10px] font-mono uppercase text-muted-foreground">
                            {snippet.language}
                          </span>
                        </div>
                        <pre className="mt-3 max-h-48 overflow-auto rounded-lg border border-border bg-background/60 p-3 text-xs text-muted-foreground">
                          {snippetPreview(snippet.code)}
                        </pre>
                        <p className="mt-2 text-[10px] font-mono text-muted-foreground/70">
                          Cập nhật {formatTimestamp(snippet.updatedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={buildSnippetHref(snippet)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-foreground/5 px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
                        >
                          Context <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteSnippet(snippet.id)}
                          disabled={mutatingId === snippet.id}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Xoá
                        </Button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/25 p-8 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-foreground/5 text-muted-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <h2 className="mt-3 text-sm font-semibold text-foreground">{title}</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
```

- [ ] **Step 2: Create the Library route**

Create `app/library/page.tsx` with this content:

```tsx
import type { Metadata } from "next";
import { LibraryPageClient } from "@/components/library/library-page-client";

export const metadata: Metadata = {
  title: "Thư viện cá nhân",
  description: "Bookmarks, ghi chú và code snippet cá nhân cho AI Engineer Roadmap.",
};

export default function LibraryPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <LibraryPageClient />
    </div>
  );
}
```

- [ ] **Step 3: Add Library to navigation**

In `components/layout/navbar.tsx`, update `navItems` from:

```ts
const navItems = [
  { href: "/roadmap", label: "Lộ trình" },
  { href: "/practice", label: "Luyện tập" },
  { href: "/projects", label: "Dự án" },
  { href: "/skills", label: "Kỹ năng" },
  { href: "/paths", label: "Con đường" },
  { href: "/resources", label: "Tài liệu" },
  { href: "/dashboard", label: "Tiến độ" },
];
```

To:

```ts
const navItems = [
  { href: "/roadmap", label: "Lộ trình" },
  { href: "/practice", label: "Luyện tập" },
  { href: "/library", label: "Thư viện" },
  { href: "/projects", label: "Dự án" },
  { href: "/skills", label: "Kỹ năng" },
  { href: "/paths", label: "Con đường" },
  { href: "/resources", label: "Tài liệu" },
  { href: "/dashboard", label: "Tiến độ" },
];
```

- [ ] **Step 4: Validate the Library route**

Run:

```bash
pnpm lint
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 5: Checkpoint**

Run:

```bash
git status --short
```

Expected changed files include:

```txt
A  components/library/library-page-client.tsx
A  app/library/page.tsx
M  components/layout/navbar.tsx
```

If the user has explicitly granted commit permission, commit this task:

```bash
git add components/library/library-page-client.tsx app/library/page.tsx components/layout/navbar.tsx
git commit -m "feat: add personal library page"
```

If commit permission has not been granted, do not run `git commit`.

---

## Task 7: Documentation and Final Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update README feature list**

In `README.md`, add this bullet after the Phase 1 user data bullet in the feature list:

```md
- **Personal Learning Workspace** (`/library`): authenticated bookmarks, lesson notes, and saved code snippets backed by Supabase RLS.
```

- [ ] **Step 2: Update README route tree**

In the README app route tree, add `/library` after `/login/page.tsx`:

```txt
├── login/page.tsx           # Login/auth UI
├── library/page.tsx         # Personal library: bookmarks, notes, saved snippets
├── search/page.tsx          # Search page
```

- [ ] **Step 3: Update README component tree**

In the README component tree, add `library/` after `layout/`:

```txt
├── layout/                  # navbar, footer, theme provider/toggle
├── library/                 # bookmarks, lesson notes, saved snippets, library page UI
├── quiz/                    # quiz cards/runtime UI
```

- [ ] **Step 4: Run focused and full test commands**

Run:

```bash
pnpm test:run lib/personal-library.test.ts
pnpm test:run
pnpm lint
pnpm typecheck
```

Expected: all commands PASS.

- [ ] **Step 5: Manual browser smoke test**

Run the dev server:

```bash
pnpm dev
```

Expected: Next.js dev server starts on `http://localhost:3000`.

Manually check these paths:

```txt
http://localhost:3000/phase/phase-1/numpy
http://localhost:3000/projects/<use-any-existing-project-id-from-/projects>
http://localhost:3000/practice/numpy-mean-array
http://localhost:3000/playground
http://localhost:3000/library
```

Expected logged-out behavior:

- Lesson, project, challenge, playground, and library surfaces show login CTAs for personal-library actions.
- Existing lesson content, project checklists, challenge execution, and playground execution remain usable.

Expected logged-in behavior with configured Supabase:

- Bookmark toggles persist after refresh.
- A lesson note can be created, edited, deleted, and viewed in `/library`.
- A playground snippet can be saved and viewed in `/library`.
- A challenge snippet can be saved and links back to `/practice/numpy-mean-array` from `/library`.

Stop the dev server after the smoke test.

- [ ] **Step 6: Final status check**

Run:

```bash
git status --short
```

Expected changed files include the personal-library source files, route wiring, and README update.

If the user has explicitly granted commit permission, commit this task:

```bash
git add README.md
git commit -m "docs: document personal learning workspace"
```

If commit permission has not been granted, do not run `git commit`.

---

## Self-Review Notes

Spec coverage:

- Auth model login-only: covered by `useCurrentUser`, login CTAs in `BookmarkButton`, `LessonNotesPanel`, `SaveSnippetButton`, and `LibraryPageClient`.
- Bookmarks for lessons/projects/challenges: covered by Tasks 2 and 3.
- Multiple notes per lesson: covered by Task 4 with create/edit/delete and list by `lessonSlug`.
- Saved snippets from playground/challenge: covered by Task 5.
- `/library` with bookmarks/notes/snippets: covered by Task 6.
- Supabase RLS/client-only writes: covered by `lib/personal-library.ts`; no service-role access is introduced.
- Tests: covered by Task 1 and Task 7 verification.
- Documentation: covered by Task 7.

Placeholder scan:

- The plan avoids incomplete markers and includes concrete file paths, code blocks, commands, expected results, and manual checks.

Type consistency:

- Bookmark types use `targetType` / `targetSlug` in UI and helper code, mapped from Supabase `target_type` / `target_slug`.
- Notes use `lessonSlug`, mapped from `lesson_slug`.
- Snippets use `lessonSlug` / `challengeSlug`, mapped from `lesson_slug` / `challenge_slug`.
- Destination helpers accept the same record shapes used by Library UI.
