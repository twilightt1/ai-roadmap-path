"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useProgress } from "@/lib/progress";
import { ProgressRing } from "./progress-ring";
import { featureFlags } from "@/lib/feature-flags";

/**
 * Compact progress summary banner for the roadmap page.
 * Shows overall %, counts, and a link to the dashboard.
 */
export function RoadmapProgressSummary() {
  const { stats, hydrated } = useProgress();

  if (!hydrated) {
    return (
      <div className="mb-10 h-24 animate-pulse rounded-2xl border border-border bg-card/40" />
    );
  }

  // If nothing started yet, show a gentle nudge instead
  if (stats.completedTopics === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 rounded-2xl border border-dashed border-border bg-card/30 p-6 text-center"
      >
        <p className="text-sm text-muted-foreground">
          Mở một bài và đánh dấu{" "}
          <span className="inline-flex items-center gap-1 font-mono font-semibold text-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Đánh dấu hoàn thành
          </span>{" "}
          để bắt đầu theo dõi tiến độ.
        </p>
        {featureFlags.learningLoop && (
          <Link href="/diagnostic" className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
            Chưa biết bắt đầu ở đâu? Làm diagnostic 8 câu <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </motion.div>
    );
  }

  const nextPhase = stats.phaseProgress.find((p) => !p.done && p.total > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-10 flex flex-col items-center gap-4 rounded-2xl border border-border bg-card/40 p-5 sm:flex-row sm:justify-between sm:gap-6"
    >
      <div className="flex items-center gap-4">
        <ProgressRing value={stats.overall} size={56} showLabel />
        <div>
          <div className="text-sm font-bold text-foreground">
            {stats.completedTopics} / {stats.totalTopics} bài đã học
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {stats.completedPhases} / {stats.totalPhases} phase hoàn thành
          </div>
        </div>
      </div>

      {nextPhase && (
        <Link
          href={`/phase/${nextPhase.slug}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-foreground/5 px-3.5 py-2 text-xs font-mono font-semibold text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
        >
          Tiếp tục: Phase {nextPhase.phase} · {nextPhase.title}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </motion.div>
  );
}
