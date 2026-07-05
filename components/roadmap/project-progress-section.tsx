"use client";

import { motion } from "motion/react";
import { Rocket } from "lucide-react";
import { useProgress } from "@/lib/progress";

/**
 * Dashboard "Projects" section — overall X/51 + per-phase project breakdown.
 * Reads from `useProgress().stats.projectProgress`.
 */
export function ProjectProgressSection() {
  const { stats, hydrated } = useProgress();

  if (!hydrated) {
    return (
      <div className="rounded-2xl border border-border bg-card/40 p-6 animate-pulse">
        <div className="h-5 w-32 rounded bg-foreground/10" />
        <div className="mt-4 h-1.5 rounded-full bg-foreground/10" />
        <div className="mt-6 space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-5 rounded bg-foreground/5" />
          ))}
        </div>
      </div>
    );
  }

  const { completedProjects, totalProjects, projectProgress } = stats;
  const percent = totalProjects === 0 ? 0 : Math.round((completedProjects / totalProjects) * 100);

  // Only show phases that have at least one project.
  const phasesWithProjects = projectProgress.filter((p) => p.total > 0);

  return (
    <div className="rounded-2xl border border-border bg-card/40 p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Rocket className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-foreground">Tiến độ dự án</h3>
        </div>
        <span className="text-xs font-mono text-muted-foreground/70 tabular-nums">
          {completedProjects}/{totalProjects} · {percent}%
        </span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-foreground/10">
        <motion.div
          initial={false}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="h-full rounded-full bg-emerald-500"
        />
      </div>

      <div className="mt-5 space-y-2.5">
        {phasesWithProjects.map((p, i) => (
          <motion.div
            key={p.slug}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.02, duration: 0.2 }}
            className="flex items-center gap-3"
          >
            <span className="w-8 text-right text-[10px] font-mono text-muted-foreground/70 tabular-nums">
              {p.phase}
            </span>
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs">
                <span className="truncate text-muted-foreground">{p.title}</span>
                <span className="ml-2 font-mono tabular-nums text-muted-foreground/70">
                  {p.completed}/{p.total}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-foreground/10">
                <motion.div
                  initial={false}
                  animate={{ width: `${p.percent}%` }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className={`h-full rounded-full ${
                    p.completed === p.total ? "bg-emerald-500" : "bg-primary"
                  }`}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
