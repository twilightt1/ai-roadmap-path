import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Project } from "@/lib/types";
import { difficultyMap } from "@/lib/theme";
import { Badge } from "@/components/ui/badge";

export function ProjectCard({ project }: { project: Project }) {
  const d = difficultyMap[project.difficulty];

  return (
    <div
      className={`group relative flex flex-col justify-between overflow-hidden rounded-xl border ${d.border} ${d.bg} p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-750`}
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
          <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500">
            Phase {project.phase}
          </span>
        </div>
        <div>
          <h4 className="text-sm font-bold leading-snug text-zinc-200 group-hover:text-foreground transition-colors">
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
                className="flex items-start gap-1.5 text-[11px] text-zinc-400"
              >
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-500/60" />
                {f}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-white/5 space-y-3">
        <div className="flex flex-wrap items-center gap-1">
          {project.stack.map((s) => (
            <span
              key={s}
              className="rounded bg-white/[0.02] border border-white/5 px-1.5 py-0.5 text-[9px] font-mono text-zinc-500"
            >
              {s}
            </span>
          ))}
        </div>

        <Link
          href={`/phase/${project.phase}`}
          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
        >
          Xem phase <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
