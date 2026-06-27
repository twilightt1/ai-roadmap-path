"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ChevronDown, Target } from "lucide-react";
import type { Phase } from "@/lib/types";
import { accentMap } from "@/lib/theme";
import { PhaseIcon } from "@/components/shared/phase-icon";
import { TopicList } from "./topic-list";
import { ProjectCard } from "./project-card";

/**
 * Một node phase trên timeline dọc.
 * Click header để mở rộng xem topics + projects ngay tại chỗ.
 */
export function PhaseNode({ phase }: { phase: Phase }) {
  const a = accentMap[phase.accent];
  const phaseLabel = phase.isCapstone
    ? "Capstone"
    : `Phase ${phase.number}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.4 }}
      className="relative pl-14 sm:pl-20"
    >
      {/* Dot trên đường dọc */}
      <div className="absolute left-[18px] top-1.5 sm:left-[26px]">
        <span
          className={`relative flex h-9 w-9 items-center justify-center rounded-full ${a.bg} ${a.glow} ring-4 ring-background`}
        >
          <PhaseIcon name={phase.icon} className="h-4 w-4 text-white" />
        </span>
      </div>

      <motion.details
        className={`group rounded-2xl border ${a.border} bg-card/60 backdrop-blur-sm transition-colors open:bg-card/80`}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 sm:p-5">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-md ${a.bgSoft} ${a.text} px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider`}
              >
                {phaseLabel}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {phase.topics.length} chủ đề · {phase.projects.length} dự án
              </span>
            </div>
            <h3 className="text-lg font-semibold leading-tight sm:text-xl">
              {phase.title}
            </h3>
            <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
              <Target className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${a.text}`} />
              {phase.goal}
            </p>
          </div>
          <ChevronDown
            className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300 group-open:rotate-180`}
          />
        </summary>

        <div className="border-t border-border/50 px-4 pb-4 pt-4 sm:px-5">
          {phase.projects.length > 0 && (
            <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {phase.projects.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          )}

          <TopicList
            topics={phase.topics}
            phaseSlug={phase.slug}
            accent={phase.accent}
          />

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/phase/${phase.slug}`}
              className={`inline-flex items-center gap-1.5 rounded-lg ${a.bg} px-3 py-1.5 text-xs font-semibold text-white transition-transform hover:scale-[1.03]`}
            >
              Chi tiết phase →
            </Link>
            <Link
              href={`/projects?phase=${phase.number}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/40 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Dự án của phase
            </Link>
          </div>
        </div>
      </motion.details>
    </motion.div>
  );
}
