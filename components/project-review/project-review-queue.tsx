"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Inbox,
  LockKeyhole,
  RefreshCw,
  UserCheck,
} from "lucide-react";
import { useCurrentUser } from "@/components/library/use-current-user";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  DEFAULT_PROJECT_REVIEW_QUEUE_PAGE_SIZE,
  MAX_PROJECT_REVIEW_COMMENT_LENGTH,
  type ProjectReviewQueueCursor,
  type ProjectReviewQueueItem,
} from "@/lib/project-submission";
import {
  claimRemoteProjectSubmission,
  loadProjectReviewQueue,
  loadProjectReviewQueuePage,
  reviewRemoteProjectSubmission,
} from "@/lib/project-submission-remote";
import { featureFlags } from "@/lib/feature-flags";

function sanitizedErrorClass(error: unknown): string {
  return error instanceof Error && error.name ? error.name : "UnknownError";
}

export function ProjectReviewQueue() {
  const currentUser = useCurrentUser();
  const [items, setItems] = useState<ProjectReviewQueueItem[]>([]);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [error, setError] = useState(false);
  const [cursorHistory, setCursorHistory] = useState<Array<ProjectReviewQueueCursor | null>>([null]);
  const [pageIndex, setPageIndex] = useState(0);
  const [nextCursor, setNextCursor] = useState<ProjectReviewQueueCursor | null>(null);
  const requestSequence = useRef(0);

  const loadAtCursor = useCallback(async (
    cursor: ProjectReviewQueueCursor | null,
    userId: string,
    resetPagination = false
  ) => {
    if (!currentUser.supabase) return;
    const requestId = ++requestSequence.current;
    setLoading(true);
    setError(false);
    try {
      const queue = featureFlags.projectReviewQueuePagination
        ? await loadProjectReviewQueuePage(
            currentUser.supabase,
            cursor,
            DEFAULT_PROJECT_REVIEW_QUEUE_PAGE_SIZE
          )
        : {
            ...await loadProjectReviewQueue(currentUser.supabase),
            nextCursor: null,
          };
      if (requestId !== requestSequence.current) return;
      setAuthorized(queue.authorized);
      setItems(queue.items);
      setNextCursor(queue.nextCursor);
      setLoadedForUserId(userId);
      if (resetPagination) {
        setCursorHistory([null]);
        setPageIndex(0);
      }
    } catch (nextError) {
      if (requestId !== requestSequence.current) return;
      console.error("[project-review] queue load failed", sanitizedErrorClass(nextError));
      setError(true);
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, [currentUser.supabase]);

  const refresh = useCallback(async () => {
    if (currentUser.loading) return;
    if (!currentUser.supabase || !currentUser.user) {
      setItems([]);
      setAuthorized(null);
      setLoading(false);
      return;
    }
    await loadAtCursor(cursorHistory[pageIndex] ?? null, currentUser.user.id);
  }, [
    currentUser.loading,
    currentUser.supabase,
    currentUser.user,
    cursorHistory,
    loadAtCursor,
    pageIndex,
  ]);

  useEffect(() => {
    if (currentUser.loading || !currentUser.supabase || !currentUser.user) return;
    const userId = currentUser.user.id;
    let active = true;
    queueMicrotask(() => {
      if (active) void loadAtCursor(null, userId, true);
    });
    return () => {
      active = false;
      requestSequence.current += 1;
    };
  }, [currentUser.loading, currentUser.supabase, currentUser.user, loadAtCursor]);

  const resetToFirstPage = async () => {
    if (!currentUser.user) return;
    setCursorHistory([null]);
    setPageIndex(0);
    await loadAtCursor(null, currentUser.user.id);
  };

  const previousPage = async () => {
    if (!currentUser.user || pageIndex === 0) return;
    const previousIndex = pageIndex - 1;
    setPageIndex(previousIndex);
    await loadAtCursor(cursorHistory[previousIndex] ?? null, currentUser.user.id);
  };

  const followingPage = async () => {
    if (!currentUser.user || !nextCursor) return;
    const followingIndex = pageIndex + 1;
    setCursorHistory((current) => [
      ...current.slice(0, followingIndex),
      nextCursor,
    ]);
    setPageIndex(followingIndex);
    await loadAtCursor(nextCursor, currentUser.user.id);
  };

  const claim = async (submissionId: string) => {
    if (!currentUser.supabase) return;
    setBusyId(submissionId);
    setError(false);
    try {
      await claimRemoteProjectSubmission(currentUser.supabase, submissionId);
      await resetToFirstPage();
    } catch (nextError) {
      console.error("[project-review] claim failed", sanitizedErrorClass(nextError));
      setError(true);
    } finally {
      setBusyId(null);
    }
  };

  const decide = async (
    submissionId: string,
    decision: "changes_requested" | "approved"
  ) => {
    if (!currentUser.supabase) return;
    const comment = comments[submissionId]?.trim() ?? "";
    if (decision === "changes_requested" && !comment) return;
    setBusyId(submissionId);
    setError(false);
    try {
      await reviewRemoteProjectSubmission(
        currentUser.supabase,
        submissionId,
        decision,
        comment
      );
      setComments((current) => ({ ...current, [submissionId]: "" }));
      await resetToFirstPage();
    } catch (nextError) {
      console.error("[project-review] decision failed", sanitizedErrorClass(nextError));
      setError(true);
    } finally {
      setBusyId(null);
    }
  };

  if (currentUser.loading) {
    return <div className="h-64 animate-pulse rounded-2xl border border-border bg-card/40" />;
  }

  if (!currentUser.user) {
    return (
      <div className="rounded-2xl border border-border bg-card/40 p-6 text-center">
        <LockKeyhole className="mx-auto h-7 w-7 text-primary" />
        <h2 className="mt-3 text-lg font-bold">Reviewer sign-in required</h2>
        <p className="mt-2 text-xs text-muted-foreground">Hàng đợi không khả dụng cho anonymous user.</p>
        <Link href="/login" className={cn(buttonVariants(), "mt-4")}>Đăng nhập</Link>
      </div>
    );
  }

  if (loading || loadedForUserId !== currentUser.user.id) {
    return <div className="h-64 animate-pulse rounded-2xl border border-border bg-card/40" />;
  }

  if (authorized === false) {
    return (
      <div data-testid="reviewer-access-denied" className="rounded-2xl border border-border bg-card/40 p-6">
        <h2 className="text-lg font-bold">Không có quyền reviewer</h2>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Quyền này chỉ được cấp qua allow-list quản trị; profile hoặc trình duyệt không thể tự cấp.
        </p>
      </div>
    );
  }

  return (
    <section data-testid="project-review-queue" aria-labelledby="project-review-queue-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="project-review-queue-title" className="text-xl font-bold">Hàng đợi đang hoạt động</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {featureFlags.projectReviewQueuePagination
              ? `Tối đa ${DEFAULT_PROJECT_REVIEW_QUEUE_PAGE_SIZE} snapshot mỗi trang; sắp xếp theo thời điểm nộp bất biến.`
              : "Tối đa 50 snapshot gần nhất; chỉ hiển thị pending và in-review."}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void refresh()}>
          <RefreshCw /> Làm mới
        </Button>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          Reviewer operation thất bại. Snapshot và workflow hiện tại không bị thay đổi.
        </p>
      )}

      {items.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-border p-8 text-center">
          <Inbox className="mx-auto h-7 w-7 text-muted-foreground/60" />
          <p className="mt-3 text-sm font-semibold">Không có submission đang chờ</p>
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          {items.map(({ snapshot, summary, assignedReviewerActive }) => {
            const assignedToCurrentReviewer = summary.assignedReviewerId === currentUser.user?.id;
            const reclaimable = featureFlags.projectReviewQueuePagination
              && summary.state === "in_review"
              && !assignedReviewerActive;
            const comment = comments[summary.id] ?? "";
            const busy = busyId === summary.id;
            return (
              <article
                key={summary.id}
                data-testid="project-review-item"
                data-submission-id={summary.id}
                className="rounded-2xl border border-border bg-card/40 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-primary" />
                      <h3 className="font-bold">Project {snapshot.projectId}</h3>
                    </div>
                    <p className="mt-1 text-[10px] font-mono text-muted-foreground/70">
                      Snapshot {summary.id.slice(0, 8)} · {new Date(summary.submittedAt).toLocaleString("vi-VN")}
                    </p>
                  </div>
                  <span className="rounded-full border border-border bg-foreground/5 px-2.5 py-1 text-[10px] font-mono text-muted-foreground">
                    {summary.state === "pending" ? "pending" : "in review"}
                  </span>
                </div>

                <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                  <div>
                    <dt className="font-semibold text-foreground">Repository</dt>
                    <dd className="mt-1 break-all text-muted-foreground">
                      <a href={snapshot.repositoryUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                        {snapshot.repositoryUrl} <ExternalLink className="h-3 w-3" />
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-foreground">Demo</dt>
                    <dd className="mt-1 break-all text-muted-foreground">
                      {snapshot.demoUrl
                        ? <a href={snapshot.demoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">{snapshot.demoUrl} <ExternalLink className="h-3 w-3" /></a>
                        : "Không cung cấp"}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 rounded-xl border border-border bg-background/35 p-3">
                  <h4 className="text-xs font-semibold">Reflection snapshot</h4>
                  <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">{snapshot.reflection}</p>
                  <p className="mt-2 text-[10px] font-mono text-muted-foreground/60">
                    Checklist server: {snapshot.completedFeatureCount}/{snapshot.requiredFeatureCount} · rubric v{snapshot.rubricVersion}
                  </p>
                </div>

                {summary.state === "pending" || reclaimable ? (
                  <div className="mt-4 flex justify-end">
                    <Button type="button" size="sm" disabled={busy} onClick={() => void claim(summary.id)}>
                      {busy ? <RefreshCw className="animate-spin" /> : <UserCheck />}
                      {reclaimable ? "Nhận lại review" : "Nhận review"}
                    </Button>
                  </div>
                ) : assignedToCurrentReviewer ? (
                  <div className="mt-4 space-y-3">
                    <div>
                      <label htmlFor={`review-comment-${summary.id}`} className="text-xs font-semibold">Phản hồi reviewer</label>
                      <Textarea
                        id={`review-comment-${summary.id}`}
                        value={comment}
                        onChange={(event) => setComments((current) => ({
                          ...current,
                          [summary.id]: event.target.value,
                        }))}
                        maxLength={MAX_PROJECT_REVIEW_COMMENT_LENGTH}
                        className="mt-1 min-h-24"
                        placeholder="Nêu thay đổi cụ thể, hoặc để trống khi phê duyệt."
                      />
                      <p className="mt-1 text-right text-[10px] font-mono text-muted-foreground/60">
                        {comment.length}/{MAX_PROJECT_REVIEW_COMMENT_LENGTH}
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busy || !comment.trim()}
                        onClick={() => void decide(summary.id, "changes_requested")}
                      >
                        Yêu cầu chỉnh sửa
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={busy}
                        onClick={() => void decide(summary.id, "approved")}
                      >
                        <CheckCircle2 /> Phê duyệt
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-right text-xs text-muted-foreground">Reviewer khác đang xử lý.</p>
                )}
              </article>
            );
          })}
        </div>
      )}

      {featureFlags.projectReviewQueuePagination && (
        <nav
          data-testid="project-review-pagination"
          aria-label="Phân trang hàng đợi review"
          className="mt-5 flex items-center justify-between gap-3"
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading || pageIndex === 0}
            onClick={() => void previousPage()}
          >
            <ChevronLeft /> Trang trước
          </Button>
          <span className="text-xs font-mono text-muted-foreground">Trang {pageIndex + 1}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading || nextCursor === null}
            onClick={() => void followingPage()}
          >
            Trang sau <ChevronRight />
          </Button>
        </nav>
      )}
    </section>
  );
}
