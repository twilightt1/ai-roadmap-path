"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { Project } from "@/lib/types";
import { phases } from "@/lib/roadmap-data";
import { difficultyMap } from "@/lib/theme";
import { Badge } from "@/components/ui/badge";

export function ProjectCard({ project }: { project: Project }) {
  const d = difficultyMap[project.difficulty];
  const reduce = useReducedMotion();
  const phaseSlug = phases.find((phase) => phase.number === project.phase)?.slug;
  const phaseHref = phaseSlug ? `/phase/${phaseSlug}` : "/projects";

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.3 }}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-xl border ${d.border} ${d.bg} p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30`}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <Badge
            variant="secondary"
            className={`${d.bg} ${d.text} border ${d.border} gap-1.5 py-0 px-2 text-[10px]`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {d.label}
          </Badge>
          <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/70">
            Phase {project.phase}
          </span>
        </div>
        <div>
          <h4 className="text-sm font-bold leading-snug text-foreground group-hover:text-foreground transition-colors">
            {project.title}
          </h4>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            {project.description}
          </p>
        </div>

        {project.features.length > 0 && (
          <ul className="space-y-1">
            {project.features.map((f) => (
              <li
                key={f}
                className="flex items-start gap-1.5 text-[11px] text-muted-foreground"
              >
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-500/60" />
                {f}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-border space-y-3">
        <div className="flex flex-wrap items-center gap-1">
          {project.stack.map((s) => (
            <span
              key={s}
              className="rounded bg-foreground/5 border border-border px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground/70"
            >
              {s}
            </span>
          ))}
        </div>

        <Link
          href={phaseHref}
          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
        >
          Xem phase <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </motion.div>
  );
}
