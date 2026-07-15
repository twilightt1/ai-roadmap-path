"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ExternalLink, Inbox, LockKeyhole, RefreshCw, UserCheck } from "lucide-react";
import { useCurrentUser } from "@/components/library/use-current-user";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  MAX_PROJECT_REVIEW_COMMENT_LENGTH,
  type ProjectReviewQueueItem,
} from "@/lib/project-submission";
import {
  claimRemoteProjectSubmission,
  loadProjectReviewQueue,
  reviewRemoteProjectSubmission,
} from "@/lib/project-submission-remote";

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

  const refresh = useCallback(async () => {
    if (currentUser.loading) return;
    if (!currentUser.supabase || !currentUser.user) {
      setItems([]);
      setAuthorized(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);
    try {
      const queue = await loadProjectReviewQueue(currentUser.supabase);
      setAuthorized(queue.authorized);
      setItems(queue.items);
    } catch (nextError) {
      console.error("[project-review] queue load failed", sanitizedErrorClass(nextError));
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [currentUser.loading, currentUser.supabase, currentUser.user]);

  useEffect(() => {
    if (currentUser.loading || !currentUser.supabase || !currentUser.user) return;
    let active = true;
    const userId = currentUser.user.id;
    void loadProjectReviewQueue(currentUser.supabase)
      .then((queue) => {
        if (!active) return;
        setAuthorized(queue.authorized);
        setItems(queue.items);
        setLoadedForUserId(userId);
        setError(false);
      })
      .catch((nextError) => {
        if (!active) return;
        console.error("[project-review] queue load failed", sanitizedErrorClass(nextError));
        setAuthorized(null);
        setItems([]);
        setLoadedForUserId(userId);
        setError(true);
      });
    return () => { active = false; };
  }, [currentUser.loading, currentUser.supabase, currentUser.user]);

  const claim = async (submissionId: string) => {
    if (!currentUser.supabase) return;
    setBusyId(submissionId);
    setError(false);
    try {
      await claimRemoteProjectSubmission(currentUser.supabase, submissionId);
      await refresh();
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
      await refresh();
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
          <p className="mt-1 text-xs text-muted-foreground">Tối đa 50 snapshot gần nhất; chỉ hiển thị pending và in-review.</p>
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
          {items.map(({ snapshot, summary }) => {
            const assignedToCurrentReviewer = summary.assignedReviewerId === currentUser.user?.id;
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

                {summary.state === "pending" ? (
                  <div className="mt-4 flex justify-end">
                    <Button type="button" size="sm" disabled={busy} onClick={() => void claim(summary.id)}>
                      {busy ? <RefreshCw className="animate-spin" /> : <UserCheck />} Nhận review
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
    </section>
  );
}
