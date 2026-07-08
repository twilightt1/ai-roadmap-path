"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Bookmark,
  Code2,
  ExternalLink,
  Loader2,
  LogIn,
  RefreshCw,
  StickyNote,
  Trash2,
} from "lucide-react";
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

type LibrarySection = "bookmarks" | "notes" | "snippets";

type LibraryData = {
  bookmarks: BookmarkRecord[];
  notes: NoteRecord[];
  snippets: SavedSnippetRecord[];
};

const EMPTY_LIBRARY: LibraryData = {
  bookmarks: [],
  notes: [],
  snippets: [],
};

const SECTION_META: Record<
  LibrarySection,
  { label: string; description: string; icon: typeof Bookmark; emptyTitle: string; emptyDescription: string }
> = {
  bookmarks: {
    label: "Bookmarks",
    description: "Các bài học, dự án và thử thách đã lưu.",
    icon: Bookmark,
    emptyTitle: "Chưa có bookmark",
    emptyDescription: "Lưu bài học, dự án hoặc thử thách để quay lại nhanh hơn.",
  },
  notes: {
    label: "Ghi chú",
    description: "Ghi chú cá nhân theo từng bài học.",
    icon: StickyNote,
    emptyTitle: "Chưa có ghi chú",
    emptyDescription: "Mở một bài học và thêm ghi chú cá nhân của bạn.",
  },
  snippets: {
    label: "Snippets",
    description: "Code snippet đã lưu từ playground hoặc bài học.",
    icon: Code2,
    emptyTitle: "Chưa có snippet",
    emptyDescription: "Lưu đoạn code quan trọng để tái sử dụng trong quá trình học.",
  },
};

const BOOKMARK_TYPE_LABEL: Record<BookmarkRecord["targetType"], string> = {
  lesson: "Bài học",
  project: "Dự án",
  challenge: "Thử thách",
};

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function previewText(value: string, maxLength = 180): string {
  const normalized = value.trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trimEnd()}…`;
}

function deleteKey(section: LibrarySection, id: string): string {
  return `${section}:${id}`;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card/40 p-6">
        <div className="h-5 w-40 animate-pulse rounded bg-foreground/10" />
        <div className="mt-3 h-8 w-72 max-w-full animate-pulse rounded bg-foreground/10" />
        <div className="mt-3 h-4 w-full max-w-xl animate-pulse rounded bg-foreground/10" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-20 animate-pulse rounded-xl border border-border bg-card/35" />
        ))}
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-28 animate-pulse rounded-xl border border-border bg-card/35" />
        ))}
      </div>
    </div>
  );
}

function EmptyState({ section }: { section: LibrarySection }) {
  const meta = SECTION_META[section];
  const Icon = meta.icon;

  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/30 p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-foreground/5 text-muted-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <h2 className="text-base font-bold text-foreground">{meta.emptyTitle}</h2>
      <p className="mx-auto mt-2 max-w-sm text-xs text-muted-foreground">
        {meta.emptyDescription}
      </p>
    </div>
  );
}

type DeleteButtonProps = {
  itemKey: string;
  deletingKey: string | null;
  onDelete: () => void;
};

function DeleteButton({ itemKey, deletingKey, onDelete }: DeleteButtonProps) {
  const deleting = deletingKey === itemKey;

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      onClick={onDelete}
      disabled={Boolean(deletingKey)}
      aria-busy={deleting}
      className="gap-1.5"
    >
      {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      {deleting ? "Đang xóa…" : "Xóa"}
    </Button>
  );
}

type InlineErrorProps = {
  message: string | undefined;
};

function InlineError({ message }: InlineErrorProps) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="mt-3 flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
    >
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function LibraryPageClient() {
  const { supabase, user, loading: loadingUser, available } = useCurrentUser();
  const [activeSection, setActiveSection] = useState<LibrarySection>("bookmarks");
  const [data, setData] = useState<LibraryData>(EMPTY_LIBRARY);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [inlineErrors, setInlineErrors] = useState<Record<string, string>>({});
  const [deletingItemKey, setDeletingItemKey] = useState<string | null>(null);

  const userId = user?.id ?? null;
  const mountedRef = useRef(false);
  const latestUserIdRef = useRef<string | null>(userId);
  const loadRequestIdRef = useRef(0);
  const deleteRequestIdRef = useRef(0);

  const counts = useMemo(
    () => ({
      bookmarks: data.bookmarks.length,
      notes: data.notes.length,
      snippets: data.snippets.length,
    }),
    [data]
  );

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      loadRequestIdRef.current += 1;
      deleteRequestIdRef.current += 1;
    };
  }, []);

  useLayoutEffect(() => {
    let active = true;

    latestUserIdRef.current = userId;
    loadRequestIdRef.current += 1;
    deleteRequestIdRef.current += 1;

    queueMicrotask(() => {
      if (!active || !mountedRef.current) return;
      setData(EMPTY_LIBRARY);
      setLoadError(null);
      setInlineErrors({});
      setDeletingItemKey(null);
      setLoadingLibrary(Boolean(supabase && userId));
    });

    return () => {
      active = false;
    };
  }, [supabase, userId]);

  const isCurrentLoad = useCallback((requestId: number, capturedUserId: string) => {
    return (
      mountedRef.current &&
      loadRequestIdRef.current === requestId &&
      latestUserIdRef.current === capturedUserId
    );
  }, []);

  const loadLibrary = useCallback(async () => {
    if (!supabase || !userId) {
      loadRequestIdRef.current += 1;
      if (mountedRef.current) {
        setData(EMPTY_LIBRARY);
        setLoadingLibrary(false);
        setLoadError(null);
        setInlineErrors({});
      }
      return;
    }

    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;
    const capturedUserId = userId;

    setLoadingLibrary(true);
    setLoadError(null);
    setInlineErrors({});

    try {
      const [bookmarks, notes, snippets] = await Promise.all([
        listBookmarks(supabase, capturedUserId),
        listNotes(supabase, capturedUserId),
        listSnippets(supabase, capturedUserId),
      ]);

      if (!isCurrentLoad(requestId, capturedUserId)) return;
      setData({ bookmarks, notes, snippets });
    } catch (error: unknown) {
      if (!isCurrentLoad(requestId, capturedUserId)) return;
      setLoadError(errorMessage(error));
    } finally {
      if (isCurrentLoad(requestId, capturedUserId)) setLoadingLibrary(false);
    }
  }, [isCurrentLoad, supabase, userId]);

  useEffect(() => {
    void loadLibrary();
  }, [loadLibrary]);

  const handleDelete = useCallback(
    async (section: LibrarySection, id: string) => {
      if (!supabase || !userId || deletingItemKey) return;

      const itemKey = deleteKey(section, id);
      const requestId = deleteRequestIdRef.current + 1;
      deleteRequestIdRef.current = requestId;
      const capturedUserId = userId;
      const isCurrentDelete = () =>
        mountedRef.current &&
        deleteRequestIdRef.current === requestId &&
        latestUserIdRef.current === capturedUserId;

      setDeletingItemKey(itemKey);
      setInlineErrors((current) => {
        const next = { ...current };
        delete next[itemKey];
        return next;
      });

      try {
        if (section === "bookmarks") {
          await deleteBookmark(supabase, capturedUserId, id);
        } else if (section === "notes") {
          await deleteNote(supabase, capturedUserId, id);
        } else {
          await deleteSnippet(supabase, capturedUserId, id);
        }

        if (!isCurrentDelete()) return;
        setData((current) => ({
          bookmarks:
            section === "bookmarks"
              ? current.bookmarks.filter((bookmark) => bookmark.id !== id)
              : current.bookmarks,
          notes: section === "notes" ? current.notes.filter((note) => note.id !== id) : current.notes,
          snippets:
            section === "snippets"
              ? current.snippets.filter((snippet) => snippet.id !== id)
              : current.snippets,
        }));
      } catch (error: unknown) {
        if (!isCurrentDelete()) return;
        setInlineErrors((current) => ({ ...current, [itemKey]: errorMessage(error) }));
      } finally {
        if (isCurrentDelete()) setDeletingItemKey(null);
      }
    },
    [deletingItemKey, supabase, userId]
  );

  if (loadingUser) return <LoadingSkeleton />;

  if (!available || !userId) {
    return (
      <section className="rounded-2xl border border-border bg-card/40 p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <LogIn className="h-5 w-5" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          Thư viện cá nhân
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          Đăng nhập để xem bookmarks, ghi chú và code snippet cá nhân của bạn trên AI Engineer Roadmap.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:scale-[1.02] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Đăng nhập để mở thư viện <LogIn className="h-4 w-4" />
        </Link>
      </section>
    );
  }

  const activeItems = data[activeSection];

  return (
    <div className="space-y-8">
      <header className="rounded-2xl border border-border bg-card/40 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-primary/80">
              Personal workspace
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Thư viện cá nhân
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
              Tập hợp bookmarks, ghi chú và code snippet đã lưu trong quá trình học.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => void loadLibrary()}
            disabled={loadingLibrary || Boolean(deletingItemKey)}
            aria-busy={loadingLibrary}
            className="gap-1.5 self-start sm:self-auto"
          >
            {loadingLibrary ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Làm mới
          </Button>
        </div>
      </header>

      {loadError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Không tải được thư viện.</p>
            <p className="mt-1 text-xs">{loadError}</p>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {(Object.keys(SECTION_META) as LibrarySection[]).map((section) => {
          const meta = SECTION_META[section];
          const Icon = meta.icon;
          const selected = activeSection === section;

          return (
            <button
              key={section}
              type="button"
              aria-pressed={selected}
              onClick={() => setActiveSection(section)}
              className={cn(
                "rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                selected
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-border bg-card/35 text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
              )}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Icon className="h-4 w-4" />
                  {meta.label}
                </span>
                <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-mono">
                  {counts[section]}
                </span>
              </span>
              <span className="mt-2 block text-xs leading-relaxed text-muted-foreground">
                {meta.description}
              </span>
            </button>
          );
        })}
      </div>

      <section className="space-y-3" aria-label={SECTION_META[activeSection].label}>
        {loadingLibrary ? (
          <div className="space-y-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-28 animate-pulse rounded-xl border border-border bg-card/35" />
            ))}
          </div>
        ) : activeItems.length === 0 ? (
          <EmptyState section={activeSection} />
        ) : activeSection === "bookmarks" ? (
          data.bookmarks.map((bookmark) => {
            const itemKey = deleteKey("bookmarks", bookmark.id);

            return (
              <article key={bookmark.id} className="rounded-xl border border-border bg-card/40 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-mono uppercase tracking-wider text-primary">
                        {BOOKMARK_TYPE_LABEL[bookmark.targetType]}
                      </span>
                      <time className="text-xs text-muted-foreground" dateTime={bookmark.createdAt}>
                        {formatTimestamp(bookmark.createdAt)}
                      </time>
                    </div>
                    <h2 className="mt-2 break-words text-base font-semibold text-foreground">
                      {bookmark.targetSlug}
                    </h2>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Link
                      href={buildBookmarkHref(bookmark)}
                      className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-background px-2.5 text-[0.8rem] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      Mở <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                    <DeleteButton
                      itemKey={itemKey}
                      deletingKey={deletingItemKey}
                      onDelete={() => void handleDelete("bookmarks", bookmark.id)}
                    />
                  </div>
                </div>
                <InlineError message={inlineErrors[itemKey]} />
              </article>
            );
          })
        ) : activeSection === "notes" ? (
          data.notes.map((note) => {
            const itemKey = deleteKey("notes", note.id);

            return (
              <article key={note.id} className="rounded-xl border border-border bg-card/40 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
                        {note.lessonSlug}
                      </span>
                      <time className="text-xs text-muted-foreground" dateTime={note.updatedAt}>
                        {formatTimestamp(note.updatedAt)}
                      </time>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
                      {previewText(note.content)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Link
                      href={buildNoteHref(note)}
                      className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-background px-2.5 text-[0.8rem] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      Mở bài <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                    <DeleteButton
                      itemKey={itemKey}
                      deletingKey={deletingItemKey}
                      onDelete={() => void handleDelete("notes", note.id)}
                    />
                  </div>
                </div>
                <InlineError message={inlineErrors[itemKey]} />
              </article>
            );
          })
        ) : (
          data.snippets.map((snippet) => {
            const itemKey = deleteKey("snippets", snippet.id);

            return (
              <article key={snippet.id} className="rounded-xl border border-border bg-card/40 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-mono uppercase tracking-wider text-primary">
                        {snippet.language}
                      </span>
                      <time className="text-xs text-muted-foreground" dateTime={snippet.updatedAt}>
                        {formatTimestamp(snippet.updatedAt)}
                      </time>
                    </div>
                    <h2 className="mt-2 break-words text-base font-semibold text-foreground">
                      {snippet.title}
                    </h2>
                    <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-foreground/[0.03] p-3 text-xs text-muted-foreground">
                      {previewText(snippet.code, 500)}
                    </pre>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Link
                      href={buildSnippetHref(snippet)}
                      className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-background px-2.5 text-[0.8rem] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      Mở nguồn <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                    <DeleteButton
                      itemKey={itemKey}
                      deletingKey={deletingItemKey}
                      onDelete={() => void handleDelete("snippets", snippet.id)}
                    />
                  </div>
                </div>
                <InlineError message={inlineErrors[itemKey]} />
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
