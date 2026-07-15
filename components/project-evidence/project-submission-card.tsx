"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CheckCircle2, ClipboardCheck, Clock3, LogIn, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  canCreateProjectSubmission,
  type ProjectSubmissionSummary,
} from "@/lib/project-submission";
import {
  loadLatestProjectSubmission,
  submitRemoteProjectEvidence,
  type ProjectSubmissionStatus,
} from "@/lib/project-submission-remote";

type SyncStatus = "local-only" | "syncing" | "synced" | "failed";

const stateCopy: Record<ProjectSubmissionSummary["state"], {
  label: string;
  description: string;
}> = {
  pending: {
    label: "Đang chờ reviewer",
    description: "Snapshot đã khóa và đang nằm trong hàng đợi riêng tư.",
  },
  in_review: {
    label: "Đang được review",
    description: "Một reviewer đã nhận snapshot này.",
  },
  changes_requested: {
    label: "Cần chỉnh sửa",
    description: "Bản cũ vẫn bất biến; cập nhật draft rồi tạo snapshot mới.",
  },
  approved: {
    label: "Đã được reviewer chấp thuận",
    description: "Đây là kết quả review thủ công, không phải chứng nhận năng lực.",
  },
};

function sanitizedErrorClass(error: unknown): string {
  return error instanceof Error && error.name ? error.name : "UnknownError";
}

export function ProjectSubmissionCard({
  supabase,
  userId,
  projectId,
  rubricReady,
  evidenceSyncStatus,
  progressSyncStatus,
}: {
  supabase: SupabaseClient | null;
  userId: string | null;
  projectId: string;
  rubricReady: boolean;
  evidenceSyncStatus: SyncStatus;
  progressSyncStatus: SyncStatus;
}) {
  const [submission, setSubmission] = useState<ProjectSubmissionStatus | null>(null);
  const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    if (!supabase || !userId) {
      setSubmission(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      setSubmission(await loadLatestProjectSubmission(supabase, userId, projectId));
    } catch (nextError) {
      console.error("[project-submission] load failed", sanitizedErrorClass(nextError));
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [projectId, supabase, userId]);

  useEffect(() => {
    if (!supabase || !userId) return;
    let active = true;
    void loadLatestProjectSubmission(supabase, userId, projectId)
      .then((nextSubmission) => {
        if (!active) return;
        setSubmission(nextSubmission);
        setLoadedForUserId(userId);
        setError(false);
      })
      .catch((nextError) => {
        if (!active) return;
        console.error("[project-submission] load failed", sanitizedErrorClass(nextError));
        setSubmission(null);
        setLoadedForUserId(userId);
        setError(true);
      });
    return () => { active = false; };
  }, [projectId, supabase, userId]);

  if (!userId) {
    return (
      <div data-testid="project-submission-card" className="mt-5 rounded-xl border border-border bg-background/35 p-4">
        <div className="flex items-start gap-3">
          <LogIn className="mt-0.5 h-4 w-4 text-primary" />
          <div>
            <h3 className="text-sm font-bold text-foreground">Tạo snapshot để gửi review</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              <Link href="/login" className="font-medium text-primary hover:underline">Đăng nhập</Link> để đồng bộ draft trước khi tạo snapshot bất biến.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading || loadedForUserId !== userId) {
    return <div data-testid="project-submission-card" className="mt-5 h-28 animate-pulse rounded-xl border border-border bg-background/35" />;
  }

  const current = submission?.summary ?? null;
  const canCreate = canCreateProjectSubmission(current);
  const synced = evidenceSyncStatus === "synced" && progressSyncStatus === "synced";
  const canSubmit = Boolean(supabase) && canCreate && rubricReady && synced && !busy && !error;
  const copy = current ? stateCopy[current.state] : null;

  const submit = async () => {
    if (!supabase || !canSubmit) return;
    setBusy(true);
    setError(false);
    try {
      const summary = await submitRemoteProjectEvidence(supabase, projectId);
      setSubmission({ summary, feedback: null });
    } catch (nextError) {
      console.error("[project-submission] submit failed", sanitizedErrorClass(nextError));
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="project-submission-card" className="mt-5 rounded-xl border border-border bg-background/35 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-xl">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Submission snapshot</h3>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Snapshot lấy evidence và checklist đã đồng bộ từ server. Sau khi gửi, nội dung snapshot không thể sửa.
          </p>
        </div>
        {copy && (
          <span
            data-testid="project-submission-status"
            className={`rounded-full border px-2.5 py-1 text-[10px] font-mono ${current?.state === "approved"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : current?.state === "changes_requested"
                ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                : "border-border bg-foreground/5 text-muted-foreground"}`}
          >
            {copy.label}
          </span>
        )}
      </div>

      {copy && (
        <div className="mt-3 rounded-lg border border-border bg-foreground/[0.03] px-3 py-2.5">
          <p className="text-xs text-foreground">{copy.description}</p>
          <p className="mt-1 flex items-center gap-1 text-[10px] font-mono text-muted-foreground/70">
            {current?.state === "approved" ? <CheckCircle2 className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}
            {current ? new Date(current.submittedAt).toLocaleString("vi-VN") : ""}
          </p>
          {submission?.feedback?.comment && (
            <blockquote data-testid="project-review-feedback" className="mt-2 border-l-2 border-amber-400/50 pl-3 text-xs leading-relaxed text-muted-foreground">
              {submission.feedback.comment}
            </blockquote>
          )}
        </div>
      )}

      {canCreate && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            {!rubricReady
              ? "Hoàn thành đủ rubric evidence trước khi gửi."
              : !synced
                ? "Đợi evidence và checklist đồng bộ thành công trước khi gửi."
                : "Server sẽ kiểm tra lại toàn bộ điều kiện trong transaction."}
          </p>
          <Button type="button" size="sm" disabled={!canSubmit} onClick={() => void submit()}>
            {busy ? <RefreshCw className="animate-spin" /> : <Send />}
            {current?.state === "changes_requested" ? "Gửi snapshot mới" : "Gửi review"}
          </Button>
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-center justify-between gap-2" role="alert">
          <p className="text-xs text-destructive">Không thể cập nhật submission. Nội dung draft không bị thay đổi.</p>
          <Button type="button" variant="ghost" size="xs" onClick={() => void refresh()}>
            <RefreshCw /> Thử lại
          </Button>
        </div>
      )}
    </div>
  );
}
