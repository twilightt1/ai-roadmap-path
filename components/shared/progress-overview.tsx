"use client";

import { motion } from "motion/react";
import { Trophy, BookOpen, Target, Flame, TrendingUp } from "lucide-react";
import { useProgress } from "@/lib/progress";
import { ProgressRing } from "./progress-ring";
import { ProjectProgressSection } from "@/components/roadmap/project-progress-section";

/**
 * Dashboard-style overview of the learner's progress.
 * Used on the home page or a dedicated dashboard.
 */
export function ProgressOverview() {
  const { stats, hydrated } = useProgress();

  if (!hydrated) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-card/40 p-6 animate-pulse"
          >
            <div className="h-10 w-10 rounded-lg bg-foreground/10" />
            <div className="mt-3 h-6 w-12 rounded bg-foreground/10" />
            <div className="mt-2 h-3 w-16 rounded bg-foreground/5" />
          </div>
        ))}
      </div>
    );
  }

  const daysSinceStart = stats.daysSinceStart;

  const cards = [
    {
      icon: TrendingUp,
      label: "Tiến độ tổng",
      value: `${stats.overall}%`,
      sub: `${stats.completedTopics}/${stats.totalTopics} bài`,
      color: "text-emerald-400",
    },
    {
      icon: BookOpen,
      label: "Bài đã học",
      value: `${stats.completedTopics}`,
      sub: `trên ${stats.totalTopics} bài`,
      color: "text-cyan-400",
    },
    {
      icon: Target,
      label: "Phase hoàn thành",
      value: `${stats.completedPhases}`,
      sub: `trên ${stats.totalPhases} phase`,
      color: "text-violet-400",
    },
    {
      icon: Flame,
      label: "Ngày học",
      value: `${daysSinceStart}`,
      sub: daysSinceStart === 0 ? "Bắt đầu hôm nay" : "từ ngày đầu tiên",
      color: "text-amber-400",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            className="rounded-2xl border border-border bg-card/40 p-5 transition-colors hover:border-border"
          >
            <div className="flex items-center justify-between">
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg bg-foreground/5 ${c.color}`}>
                <c.icon className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3 text-2xl font-bold tabular-nums text-foreground">
              {c.value}
            </div>
            <div className="mt-1 text-xs font-mono uppercase tracking-wider text-muted-foreground/70">
              {c.label}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">{c.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Phase breakdown */}
      <div className="rounded-2xl border border-border bg-card/40 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-foreground">Tiến độ theo phase</h3>
          </div>
          <ProgressRing value={stats.overall} size={44} showLabel />
        </div>
        <div className="space-y-2.5">
          {stats.phaseProgress.map((p, i) => (
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
                      p.done ? "bg-emerald-500" : "bg-primary"
                    }`}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Projects section */}
      <ProjectProgressSection />
    </div>
  );
}
