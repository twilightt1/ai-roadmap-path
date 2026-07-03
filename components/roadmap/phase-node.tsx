"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { ChevronDown, Target } from "lucide-react";
import type { Phase } from "@/lib/types";
import { accentMap } from "@/lib/theme";
import { TopicList } from "./topic-list";
import { ProjectCard } from "./project-card";
import { PhaseProgressBadge } from "@/components/shared/phase-progress-badge";

export function PhaseNode({ phase }: { phase: Phase }) {
  const [isOpen, setIsOpen] = useState(false);
  const reduce = useReducedMotion();
  const a = accentMap[phase.accent];
  const phaseLabel = phase.isCapstone ? "Capstone" : `Phase ${phase.number}`;

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.4 }}
      className="relative pl-14 sm:pl-20"
    >
      {/* Dot trên đường dọc */}
      <div className="absolute left-[18px] top-1.5 sm:left-[26px] z-10">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`relative flex h-9 w-9 items-center justify-center rounded-full border bg-background text-xs font-mono font-bold ring-4 ring-background transition-all hover:scale-[1.05] cursor-pointer outline-none ${
            isOpen
              ? `${a.text} ${a.border} shadow-md`
              : "border-border text-muted-foreground/70 hover:border-border"
          }`}
        >
          {phase.isCapstone ? "★" : String(phase.number).padStart(2, "0")}
        </button>
      </div>

      <div
        className={`group overflow-hidden rounded-2xl border transition-all duration-200 ${
          isOpen
            ? `${a.border} bg-card/50`
            : "border-border bg-card/30 hover:border-border"
        }`}
      >
        {/* Accordion Trigger */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full cursor-pointer items-center justify-between gap-4 p-4 text-left sm:p-5 outline-none border-none bg-transparent"
        >
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider ${a.bgSoft} ${a.text}`}
              >
                {phaseLabel}
              </span>
              <span className="text-[10px] text-muted-foreground/70 font-mono">
                {phase.topics.length} CHỦ ĐỀ · {phase.projects.length} DỰ ÁN
              </span>
            </div>
            <h3 className="text-base font-bold leading-tight sm:text-lg text-foreground group-hover:text-foreground transition-colors">
              {phase.title}
            </h3>
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Target className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${a.text}`} />
              {phase.goal}
            </p>
          </div>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground/70 transition-transform duration-300 ${isOpen ? "rotate-180 text-foreground" : ""}`}
          />
          <div className="flex shrink-0 items-center">
            <PhaseProgressBadge phaseSlug={phase.slug} size={36} />
          </div>
        </button>

        {/* Accordion Content */}
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={reduce ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={reduce ? { height: 0, opacity: 0 } : { height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="border-t border-border px-4 pb-5 pt-4 sm:px-5">
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

                <div className="mt-5 flex flex-wrap gap-2">
                  <Link
                    href={`/phase/${phase.slug}`}
                    className={`inline-flex items-center gap-1.5 rounded-lg ${a.bg} px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-transform hover:scale-[1.02]`}
                  >
                    Chi tiết phase →
                  </Link>
                  <Link
                    href={`/projects?phase=${phase.number}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-foreground/5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-foreground/10"
                  >
                    Dự án của phase
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
