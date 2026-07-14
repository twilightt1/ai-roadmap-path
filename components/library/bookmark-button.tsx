"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AlertCircle, Bookmark, BookmarkCheck, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/error-message";
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
  const mountedRef = useRef(false);
  const latestContextRef = useRef({ userId, targetType, targetSlug });
  const toggleRequestIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useLayoutEffect(() => {
    latestContextRef.current = { userId, targetType, targetSlug };
    toggleRequestIdRef.current += 1;

    queueMicrotask(() => {
      if (mountedRef.current) setSaving(false);
    });
  }, [userId, targetType, targetSlug]);

  useEffect(() => {
    if (!supabase || !userId) {
      queueMicrotask(() => {
        if (!mountedRef.current) return;
        setChecking(false);
        setBookmarked(false);
        setError(null);
      });
      return;
    }

    let mounted = true;
    queueMicrotask(() => {
      if (!mounted) return;
      setChecking(true);
      setError(null);
    });

    isBookmarked(supabase, userId, { targetType, targetSlug })
      .then((value) => {
        if (mounted) setBookmarked(value);
      })
      .catch((e: unknown) => {
        if (mounted) setError(getErrorMessage(e));
      })
      .finally(() => {
        if (mounted) setChecking(false);
      });

    return () => {
      mounted = false;
    };
  }, [supabase, userId, targetType, targetSlug]);

  const handleToggle = useCallback(async () => {
    if (!supabase || !userId || saving) return;

    const requestId = toggleRequestIdRef.current + 1;
    toggleRequestIdRef.current = requestId;
    const capturedContext = { userId, targetType, targetSlug };
    const isCurrentRequest = () => {
      const latestContext = latestContextRef.current;

      return (
        mountedRef.current &&
        toggleRequestIdRef.current === requestId &&
        latestContext.userId === capturedContext.userId &&
        latestContext.targetType === capturedContext.targetType &&
        latestContext.targetSlug === capturedContext.targetSlug
      );
    };

    const previous = bookmarked;
    setSaving(true);
    setError(null);

    try {
      const result = await toggleBookmark(supabase, capturedContext.userId, {
        targetType: capturedContext.targetType,
        targetSlug: capturedContext.targetSlug,
      });
      if (!isCurrentRequest()) return;
      setBookmarked(result.bookmarked);
    } catch (e: unknown) {
      if (!isCurrentRequest()) return;
      setBookmarked(previous);
      setError(getErrorMessage(e));
    } finally {
      if (isCurrentRequest()) setSaving(false);
    }
  }, [bookmarked, saving, supabase, targetSlug, targetType, userId]);

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
        <span
          role="status"
          aria-live="polite"
          className="inline-flex max-w-56 items-center gap-1 text-[10px] text-destructive"
        >
          <AlertCircle className="h-3 w-3" />
          {error}
        </span>
      )}
    </span>
  );
}
