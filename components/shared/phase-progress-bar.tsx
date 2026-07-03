"use client";

import { motion } from "motion/react";
import { CheckCircle2 } from "lucide-react";
import { useProgress } from "@/lib/progress";

/**
 * Phase progress bar — shows the current phase's completion %.
 * Used on the phase detail page.
 */
export function PhaseProgressBar({ phaseSlug }: { phaseSlug: string }) {
  const { stats, hydrated } = useProgress();
  const phase = stats.phaseProgress.find((p) => p.slug === phaseSlug);

  if (!hydrated || !phase || phase.total === 0) return null;

  const done = phase.done;

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            {done && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
            {done ? "Phase hoàn thành" : "Tiến độ phase"}
          </span>
          <span className="font-mono tabular-nums text-muted-foreground/70">
            {phase.completed}/{phase.total} bài · {phase.percent}%
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-foreground/10">
          <motion.div
            initial={false}
            animate={{ width: `${phase.percent}%` }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className={`h-full rounded-full ${done ? "bg-emerald-500" : "bg-primary"}`}
          />
        </div>
      </div>
    </div>
  );
}
