"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Edit3,
  Loader2,
  LogIn,
  Plus,
  Save,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
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

const NOTE_MAX_LENGTH = 20_000;

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
  const canLoadNotes = Boolean(supabase && userId);
  const mountedRef = useRef(false);
  const latestContextRef = useRef({ userId, lessonSlug });
  const mutationRequestIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const clearLessonState = useCallback((clearDraft = false) => {
    setNotes([]);
    setEditingId(null);
    setEditingContent("");
    setError(null);
    if (clearDraft) setDraft("");
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingId(null);
    setEditingContent("");
  }, []);

  useLayoutEffect(() => {
    let active = true;

    latestContextRef.current = { userId, lessonSlug };
    mutationRequestIdRef.current += 1;

    queueMicrotask(() => {
      if (!active) return;
      clearLessonState(true);
      setLoadingNotes(canLoadNotes);
      setSaving(false);
    });

    return () => {
      active = false;
    };
  }, [canLoadNotes, clearLessonState, lessonSlug, userId]);

  const isCurrentMutationRequest = useCallback(
    (requestId: number, capturedContext: { userId: string; lessonSlug: string }) => {
      const latestContext = latestContextRef.current;

      return (
        mountedRef.current &&
        mutationRequestIdRef.current === requestId &&
        latestContext.userId === capturedContext.userId &&
        latestContext.lessonSlug === capturedContext.lessonSlug
      );
    },
    []
  );

  useEffect(() => {
    if (!supabase || !userId) {
      queueMicrotask(() => {
        if (!mountedRef.current) return;
        clearLessonState(true);
        setLoadingNotes(false);
        setSaving(false);
      });
      return;
    }

    let active = true;
    const capturedContext = { userId, lessonSlug };
    const isCurrentLoad = () => {
      const latestContext = latestContextRef.current;

      return (
        active &&
        mountedRef.current &&
        latestContext.userId === capturedContext.userId &&
        latestContext.lessonSlug === capturedContext.lessonSlug
      );
    };

    queueMicrotask(() => {
      if (!isCurrentLoad()) return;
      clearLessonState(true);
      setLoadingNotes(true);
    });

    listNotesForLesson(supabase, capturedContext.userId, capturedContext.lessonSlug)
      .then((nextNotes) => {
        if (!isCurrentLoad()) return;
        setNotes(nextNotes);
      })
      .catch((e: unknown) => {
        if (!isCurrentLoad()) return;
        setError(errorMessage(e));
      })
      .finally(() => {
        if (isCurrentLoad()) setLoadingNotes(false);
      });

    return () => {
      active = false;
    };
  }, [clearLessonState, lessonSlug, supabase, userId]);

  const handleCreate = async () => {
    if (!supabase || !userId || saving || loadingNotes) return;

    const requestId = mutationRequestIdRef.current + 1;
    mutationRequestIdRef.current = requestId;
    const capturedContext = { userId, lessonSlug };
    const capturedDraft = draft;

    setSaving(true);
    setError(null);

    try {
      validateNoteContent(capturedDraft);
      const created = await createNote(supabase, capturedContext.userId, capturedContext.lessonSlug, capturedDraft);
      if (!isCurrentMutationRequest(requestId, capturedContext)) return;
      setNotes((current) => [created, ...current]);
      setDraft("");
    } catch (e: unknown) {
      if (!isCurrentMutationRequest(requestId, capturedContext)) return;
      setError(errorMessage(e));
    } finally {
      if (isCurrentMutationRequest(requestId, capturedContext)) setSaving(false);
    }
  };

  const startEditing = (note: NoteRecord) => {
    setEditingId(note.id);
    setEditingContent(note.content);
    setError(null);
  };

  const handleUpdate = async (noteId: string) => {
    if (!supabase || !userId || saving || loadingNotes) return;

    const requestId = mutationRequestIdRef.current + 1;
    mutationRequestIdRef.current = requestId;
    const capturedContext = { userId, lessonSlug };
    const capturedContent = editingContent;

    setSaving(true);
    setError(null);

    try {
      validateNoteContent(capturedContent);
      const updated = await updateNote(supabase, capturedContext.userId, noteId, capturedContent);
      if (!isCurrentMutationRequest(requestId, capturedContext)) return;
      setNotes((current) => current.map((note) => (note.id === noteId ? updated : note)));
      cancelEditing();
    } catch (e: unknown) {
      if (!isCurrentMutationRequest(requestId, capturedContext)) return;
      setError(errorMessage(e));
    } finally {
      if (isCurrentMutationRequest(requestId, capturedContext)) setSaving(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!supabase || !userId || saving || loadingNotes) return;

    const requestId = mutationRequestIdRef.current + 1;
    mutationRequestIdRef.current = requestId;
    const capturedContext = { userId, lessonSlug };
    const wasEditingDeletedNote = editingId === noteId;

    setSaving(true);
    setError(null);

    try {
      await deleteNote(supabase, capturedContext.userId, noteId);
      if (!isCurrentMutationRequest(requestId, capturedContext)) return;
      setNotes((current) => current.filter((note) => note.id !== noteId));
      if (wasEditingDeletedNote) cancelEditing();
    } catch (e: unknown) {
      if (!isCurrentMutationRequest(requestId, capturedContext)) return;
      setError(errorMessage(e));
    } finally {
      if (isCurrentMutationRequest(requestId, capturedContext)) setSaving(false);
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
          maxLength={NOTE_MAX_LENGTH}
          disabled={saving || loadingNotes}
          aria-label="Nội dung ghi chú mới"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] font-mono text-muted-foreground/70">
            {draft.length}/20000 ký tự
          </span>
          <Button
            type="button"
            size="sm"
            onClick={handleCreate}
            disabled={saving || loadingNotes || draft.trim().length === 0}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Thêm ghi chú
          </Button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-3 flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
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
                    maxLength={NOTE_MAX_LENGTH}
                    disabled={saving || loadingNotes}
                    aria-label="Chỉnh sửa nội dung ghi chú"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground/70">
                      {editingContent.length}/20000 ký tự
                    </span>
                    <div className="flex items-center gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={cancelEditing} disabled={saving || loadingNotes}>
                        <X className="h-3.5 w-3.5" />
                        Huỷ
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleUpdate(note.id)}
                        disabled={saving || loadingNotes || editingContent.trim().length === 0}
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
                      <Button type="button" size="sm" variant="ghost" onClick={() => startEditing(note)} disabled={saving || loadingNotes}>
                        <Edit3 className="h-3.5 w-3.5" />
                        Sửa
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(note.id)}
                        disabled={saving || loadingNotes}
                      >
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
