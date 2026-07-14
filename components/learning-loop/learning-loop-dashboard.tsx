"use client";

import Link from "next/link";
import { ArrowRight, Brain, CalendarCheck, RefreshCw, Sparkles, Target } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { phases } from "@/lib/roadmap-data";
import { WEEKLY_TARGET_OPTIONS } from "@/lib/learning-profile";
import {
  derivePhaseMastery,
  deriveWeeklyGoalProgress,
  recommendNextLearning,
} from "@/lib/learning-loop";
import { useLearningProfile } from "@/lib/use-learning-profile";
import { useProgress } from "@/lib/progress";

const confidenceLabel = {
  low: "Ít bằng chứng",
  medium: "Bằng chứng vừa",
  high: "Bằng chứng tốt",
} as const;

export function LearningLoopDashboard() {
  const progress = useProgress();
  const learning = useLearningProfile();

  if (!progress.hydrated || !learning.hydrated) {
    return <div className="mb-8 h-64 animate-pulse rounded-2xl border border-border bg-card/40" />;
  }

  const progressState = {
    completed: progress.completed,
    projectFeatures: progress.projectFeatures,
    itemStates: progress.itemStates,
    quizResults: progress.quizResults,
  };
  const weekly = deriveWeeklyGoalProgress(progressState, learning.profile.weeklyGoal.target);
  const recommendation = recommendNextLearning(phases, progressState, learning.profile);
  const mastery = derivePhaseMastery(phases, progressState, learning.profile);
  const withEvidence = mastery.filter((entry) => entry.evidence.signalFamilies > 0);
  const visibleMastery = (withEvidence.length > 0 ? withEvidence : mastery.slice(0, 4)).slice(0, 8);
  const diagnostic = learning.profile.diagnostic.value;

  return (
    <section data-testid="learning-loop-dashboard" className="mb-10 space-y-5" aria-labelledby="learning-loop-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-mono uppercase tracking-[0.16em] text-primary">
            <Sparkles className="h-3.5 w-3.5" /> P1 Learning Loop
          </div>
          <h2 id="learning-loop-title" className="text-2xl font-bold text-foreground">Kế hoạch học tuần này</h2>
          <p className="mt-1 text-sm text-muted-foreground">Đề xuất deterministic từ tiến độ, quiz và diagnostic của bạn.</p>
        </div>
        <span className="text-xs font-mono text-muted-foreground">
          Đồng bộ: {learning.status === "local-only" ? "chỉ thiết bị này" : learning.status}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col justify-between p-5 lg:col-span-2">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-primary">
              <ArrowRight className="h-3.5 w-3.5" /> Học tiếp theo
            </div>
            <h3 data-testid="next-learning-title" className="mt-3 text-xl font-bold text-foreground">{recommendation.title}</h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{recommendation.description}</p>
          </div>
          <Link href={recommendation.href} className={buttonVariants({ className: "mt-5 self-start" })}>
            Tiếp tục học <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-amber-400">
            <CalendarCheck className="h-4 w-4" /> Mục tiêu tuần
          </div>
          <div className="mt-3 flex items-end justify-between">
            <span className="text-3xl font-bold tabular-nums text-foreground">{weekly.completed}/{weekly.target}</span>
            <span className="text-xs text-muted-foreground">bài học</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-foreground/10">
            <div className="h-full rounded-full bg-amber-400 transition-[width]" style={{ width: `${weekly.percent}%` }} />
          </div>
          <div className="mt-4 flex gap-2" aria-label="Chọn mục tiêu bài học mỗi tuần">
            {WEEKLY_TARGET_OPTIONS.map((target) => (
              <button
                key={target}
                type="button"
                onClick={() => learning.setWeeklyTarget(target)}
                aria-pressed={learning.profile.weeklyGoal.target === target}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold ${
                  learning.profile.weeklyGoal.target === target
                    ? "border-amber-400/50 bg-amber-400/10 text-amber-300"
                    : "border-border text-muted-foreground hover:bg-foreground/5"
                }`}
              >
                {target} bài
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-violet-400">
            <Brain className="h-4 w-4" /> Diagnostic nền tảng
          </div>
          {diagnostic ? (
            <>
              <div className="mt-3 text-3xl font-bold tabular-nums text-foreground">
                {diagnostic.score}/{diagnostic.total}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Kết quả dùng để ưu tiên khoảng trống; không phải chứng nhận năng lực.
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Hoàn thành 8 câu để learning loop có thêm bằng chứng chọn điểm bắt đầu.
            </p>
          )}
          <Link href="/diagnostic" className={buttonVariants({ variant: "outline", className: "mt-4" })}>
            {diagnostic ? "Làm lại diagnostic" : "Bắt đầu diagnostic"}
          </Link>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-400">
            <Target className="h-4 w-4" /> Mastery estimate
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Điểm ước tính được tách khỏi độ tin cậy của bằng chứng.</p>
          <div className="mt-4 space-y-3">
            {visibleMastery.map((entry) => (
              <div key={entry.phaseSlug}>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="truncate text-foreground">Phase {entry.phaseNumber} · {entry.phaseTitle}</span>
                  <span className="shrink-0 font-mono text-muted-foreground">{entry.score}% · {confidenceLabel[entry.confidence]}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-foreground/10">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${entry.score}%` }} />
                </div>
              </div>
            ))}
          </div>
          {learning.status === "failed" && (
            <button type="button" onClick={learning.retry} className="mt-4 inline-flex items-center gap-1.5 text-xs text-amber-400">
              <RefreshCw className="h-3.5 w-3.5" /> Thử đồng bộ lại
            </button>
          )}
        </Card>
      </div>
    </section>
  );
}
