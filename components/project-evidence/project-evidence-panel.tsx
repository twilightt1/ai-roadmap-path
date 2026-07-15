"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  CheckCircle2,
  Circle,
  FileText,
  GitBranch,
  Link2,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/components/library/use-current-user";
import {
  MAX_PROJECT_EVIDENCE_REFLECTION_LENGTH,
  MIN_PROJECT_EVIDENCE_REFLECTION_LENGTH,
  countProjectEvidenceReflectionCharacters,
  deriveProjectEvidenceRubric,
  isSafeProjectEvidenceUrl,
} from "@/lib/project-evidence";
import { useProjectEvidence } from "@/lib/use-project-evidence";
import { useProgress } from "@/lib/progress";

const syncLabel = {
  "local-only": "chỉ thiết bị này",
  syncing: "đang đồng bộ",
  synced: "đã đồng bộ",
  failed: "lỗi đồng bộ",
} as const;

function UrlEvidenceField({
  id,
  label,
  description,
  placeholder,
  savedValue,
  onSave,
}: {
  id: string;
  label: string;
  description: string;
  placeholder: string;
  savedValue: string;
  onSave(value: string): void;
}) {
  const [value, setValue] = useState(savedValue);
  const [error, setError] = useState<string | null>(null);
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setValue(savedValue);
  }, [savedValue]);

  const save = () => {
    focused.current = false;
    const normalized = value.trim();
    setValue(normalized);
    if (!isSafeProjectEvidenceUrl(normalized)) {
      setError("Chỉ chấp nhận liên kết HTTPS hợp lệ, không chứa thông tin đăng nhập.");
      return;
    }
    setError(null);
    if (normalized !== savedValue) onSave(normalized);
  };

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-foreground">{label}</label>
      <p id={`${id}-description`} className="text-[11px] leading-relaxed text-muted-foreground">{description}</p>
      <Input
        id={id}
        type="url"
        inputMode="url"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onFocus={() => { focused.current = true; }}
        onBlur={save}
        placeholder={placeholder}
        aria-describedby={`${id}-description${error ? ` ${id}-error` : ""}`}
        aria-invalid={Boolean(error)}
        maxLength={500}
      />
      {error && <p id={`${id}-error`} role="alert" className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

function ReflectionField({ savedValue, onSave }: { savedValue: string; onSave(value: string): void }) {
  const [value, setValue] = useState(savedValue);
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setValue(savedValue);
  }, [savedValue]);

  const save = () => {
    focused.current = false;
    if (value !== savedValue) onSave(value);
  };

  return (
    <div className="space-y-1.5">
      <label htmlFor="project-evidence-reflection" className="text-xs font-semibold text-foreground">
        Reflection
      </label>
      <p id="project-evidence-reflection-description" className="text-[11px] leading-relaxed text-muted-foreground">
        Ghi lại quyết định, trở ngại và trade-off. Nội dung này không được đưa vào telemetry.
      </p>
      <Textarea
        id="project-evidence-reflection"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onFocus={() => { focused.current = true; }}
        onBlur={save}
        className="min-h-28"
        placeholder="Ví dụ: Tôi tách lớp API khỏi domain vì..."
        maxLength={MAX_PROJECT_EVIDENCE_REFLECTION_LENGTH}
        aria-describedby="project-evidence-reflection-description project-evidence-reflection-count"
      />
      <p id="project-evidence-reflection-count" className="text-right text-[10px] font-mono text-muted-foreground/70">
        {countProjectEvidenceReflectionCharacters(value)}/{MIN_PROJECT_EVIDENCE_REFLECTION_LENGTH} ký tự nội dung tối thiểu · {value.length}/{MAX_PROJECT_EVIDENCE_REFLECTION_LENGTH}
      </p>
    </div>
  );
}

export function ProjectEvidencePanel({ projectId, features }: { projectId: string; features: string[] }) {
  const currentUser = useCurrentUser();
  const progress = useProgress();
  const projectEvidence = useProjectEvidence(
    projectId,
    currentUser.supabase,
    currentUser.user?.id ?? null,
    currentUser.loading
  );
  const expectedUserId = currentUser.user?.id ?? null;

  if (
    !progress.hydrated ||
    !projectEvidence.hydrated ||
    currentUser.loading ||
    projectEvidence.userId !== expectedUserId
  ) {
    return <div className="h-96 animate-pulse rounded-2xl border border-border bg-card/40" />;
  }

  const completedFeatures = features.filter((_, index) => progress.isFeatureDone(projectId, index)).length;
  const rubric = deriveProjectEvidenceRubric({
    evidence: projectEvidence.evidence,
    completedFeatures,
    totalFeatures: features.length,
  });

  return (
    <section
      data-testid="project-evidence-panel"
      className="rounded-2xl border border-border bg-card/40 p-6"
      aria-labelledby="project-evidence-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.16em] text-primary">
            <ShieldCheck className="h-3.5 w-3.5" /> P2 Project Evidence
          </div>
          <h2 id="project-evidence-title" className="text-lg font-bold text-foreground">Hồ sơ bằng chứng</h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">
            Lưu bằng chứng riêng tư để chuẩn bị review thủ công. Rubric này không phải điểm hay chứng nhận năng lực.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-foreground/5 px-2.5 py-1 text-[10px] font-mono text-muted-foreground">
          <LockKeyhole className="h-3 w-3" /> {currentUser.user ? "riêng tư theo tài khoản" : "riêng tư trên thiết bị"}
        </span>
      </div>

      {!currentUser.user && (
        <p className="mt-3 text-xs text-muted-foreground">
          Bản nháp đang lưu trên trình duyệt. <Link href="/login" className="font-medium text-primary hover:underline">Đăng nhập để đồng bộ</Link>.
        </p>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <UrlEvidenceField
            id="project-evidence-repository"
            label="Repository URL"
            description="Liên kết HTTPS tới mã nguồn; nên có README và hướng dẫn chạy."
            placeholder="https://github.com/you/project"
            savedValue={projectEvidence.evidence.repositoryUrl.value}
            onSave={projectEvidence.setRepositoryUrl}
          />
          <UrlEvidenceField
            id="project-evidence-demo"
            label="Demo URL (không bắt buộc)"
            description="Bản deploy hoặc video giúp reviewer kiểm chứng nhanh hơn."
            placeholder="https://demo.example.com"
            savedValue={projectEvidence.evidence.demoUrl.value}
            onSave={projectEvidence.setDemoUrl}
          />
          <ReflectionField
            savedValue={projectEvidence.evidence.reflection.value}
            onSave={projectEvidence.setReflection}
          />
        </div>

        <div className="rounded-xl border border-border bg-background/35 p-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-foreground">Rubric bằng chứng</h3>
          </div>
          <ul className="mt-4 space-y-3">
            {rubric.criteria.map((criterion) => (
              <li key={criterion.id} className="flex items-start gap-2.5">
                {criterion.satisfied
                  ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" />}
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-semibold text-foreground">{criterion.label}</span>
                    <span className="text-[9px] font-mono uppercase text-muted-foreground/60">
                      {criterion.required ? "bắt buộc" : "bổ sung"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{criterion.description}</p>
                </div>
              </li>
            ))}
          </ul>

          <div
            data-testid="evidence-ready-status"
            className={`mt-4 rounded-lg border px-3 py-2.5 ${rubric.readyForManualReview
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-border bg-foreground/[0.03] text-muted-foreground"}`}
          >
            <div className="flex items-center gap-2 text-xs font-semibold">
              {rubric.readyForManualReview ? <Check className="h-4 w-4" /> : <GitBranch className="h-4 w-4" />}
              {rubric.readyForManualReview ? "Sẵn sàng cho review thủ công" : "Bản nháp đang hoàn thiện"}
            </div>
            <p className="mt-1 text-[10px] font-mono">
              {rubric.requiredCompleted}/{rubric.requiredTotal} tiêu chí bắt buộc
            </p>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 text-[10px] font-mono text-muted-foreground/70" aria-live="polite">
            <span className="inline-flex items-center gap-1"><Link2 className="h-3 w-3" /> Đồng bộ: {syncLabel[projectEvidence.status]}</span>
            {projectEvidence.status === "failed" && (
              <Button type="button" variant="ghost" size="xs" onClick={projectEvidence.retry}>
                <RefreshCw className="h-3 w-3" /> Thử lại
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
