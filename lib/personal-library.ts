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
