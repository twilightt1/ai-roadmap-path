"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
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
import { getErrorMessage } from "@/lib/error-message";
import { createSnippet, validateSnippetInput } from "@/lib/personal-library";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "./use-current-user";

type SaveSnippetButtonProps = {
  language: string;
  code: string;
  defaultTitle?: string;
  lessonSlug?: string | null;
  challengeSlug?: string | null;
  className?: string;
};

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
  const errorId = useId();

  const mountedRef = useRef(false);
  const inFlightRef = useRef(false);
  const requestIdRef = useRef(0);
  const fallbackTitleRef = useRef(defaultTitle ?? `${language} snippet`);
  const currentContextKeyRef = useRef("");

  const userId = user?.id ?? null;
  const fallbackTitle = defaultTitle ?? `${language} snippet`;
  const trimmedTitle = title.trim();
  const trimmedCode = code.trim();
  const saveContextKey = JSON.stringify({
    userId,
    language,
    lessonSlug,
    challengeSlug,
  });

  useLayoutEffect(() => {
    fallbackTitleRef.current = fallbackTitle;
    currentContextKeyRef.current = saveContextKey;
  }, [fallbackTitle, saveContextKey]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
      inFlightRef.current = false;
    };
  }, []);

  useEffect(() => {
    requestIdRef.current += 1;
    inFlightRef.current = false;

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled || !mountedRef.current) return;
      setSaving(false);
    });

    return () => {
      cancelled = true;
    };
  }, [saveContextKey]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled || !mountedRef.current) return;
      setOpen(false);
      setTitle(fallbackTitleRef.current);
      setError(null);
      setSaving(false);
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (open) return;

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled || !mountedRef.current) return;
      setTitle(fallbackTitle);
      setError(null);
    });

    return () => {
      cancelled = true;
    };
  }, [fallbackTitle, open]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (saving || inFlightRef.current) return;
      setOpen(nextOpen);
    },
    [saving]
  );

  const handleSave = useCallback(async () => {
    if (!supabase || !userId || inFlightRef.current) return;

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    inFlightRef.current = true;

    const savePayload = {
      supabase,
      userId,
      contextKey: saveContextKey,
      input: {
        title,
        language,
        code,
        lessonSlug,
        challengeSlug,
      },
    };

    const isCurrentRequest = () =>
      mountedRef.current &&
      requestIdRef.current === requestId &&
      currentContextKeyRef.current === savePayload.contextKey;

    setSaving(true);
    setError(null);

    try {
      const input = validateSnippetInput(savePayload.input);
      await createSnippet(savePayload.supabase, savePayload.userId, input);
      if (!isCurrentRequest()) return;
      setOpen(false);
    } catch (e: unknown) {
      if (!isCurrentRequest()) return;
      setError(getErrorMessage(e));
    } finally {
      if (requestIdRef.current === requestId) {
        inFlightRef.current = false;
      }
      if (isCurrentRequest()) {
        setSaving(false);
      }
    }
  }, [challengeSlug, code, language, lessonSlug, saveContextKey, supabase, title, userId]);

  if (loading) {
    return (
      <span
        className={cn(
          "inline-flex h-7 w-28 animate-pulse rounded-lg bg-foreground/10",
          className
        )}
      />
    );
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
        Đăng nhập để lưu code
      </Link>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn("gap-1.5", className)}
          />
        }
      >
        <Save className="h-3.5 w-3.5" />
        Lưu snippet
      </DialogTrigger>
      <DialogContent showCloseButton={!saving}>
        <DialogHeader>
          <DialogTitle>Lưu code snippet</DialogTitle>
          <DialogDescription>
            Snippet sẽ được lưu vào thư viện cá nhân của bạn.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
            Tiêu đề
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              disabled={saving}
              aria-invalid={Boolean(error && trimmedTitle.length === 0)}
              aria-describedby={error ? errorId : undefined}
            />
          </label>
          <div className="rounded-lg border border-border bg-foreground/[0.03] p-3">
            <div className="mb-2 flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70">
              <Code2 className="h-3.5 w-3.5" />
              {language}
            </div>
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words text-xs text-muted-foreground">
              {code.slice(0, 2000)}
              {code.length > 2000 ? "\n..." : ""}
            </pre>
          </div>
          {error && (
            <div
              id={errorId}
              role="alert"
              className="flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={saving}
          >
            Huỷ
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || trimmedTitle.length === 0 || trimmedCode.length === 0}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
