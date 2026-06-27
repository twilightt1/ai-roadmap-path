import Link from "next/link";
import { ArrowUpRight, Layers } from "lucide-react";
import type { Project } from "@/lib/types";
import { difficultyMap } from "@/lib/theme";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ProjectCard({ project }: { project: Project }) {
  const d = difficultyMap[project.difficulty];

  return (
    <Card
      className={`group relative overflow-hidden border ${d.border} ${d.bg} transition-all hover:-translate-y-0.5 hover:border-primary/50`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <Badge
            variant="secondary"
            className={`${d.bg} ${d.text} border ${d.border} gap-1`}
          >
            <span>{d.emoji}</span>
            {d.label}
          </Badge>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Phase {project.phase}
          </span>
        </div>
        <CardTitle className="mt-2 text-base font-semibold leading-snug">
          {project.title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{project.description}</p>
      </CardHeader>

      <CardContent className="space-y-3">
        {project.features.length > 0 && (
          <ul className="space-y-1">
            {project.features.map((f) => (
              <li
                key={f}
                className="flex items-start gap-1.5 text-xs text-muted-foreground"
              >
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-primary/60" />
                {f}
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <Layers className="h-3.5 w-3.5 text-muted-foreground" />
          {project.stack.map((s) => (
            <span
              key={s}
              className="rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
            >
              {s}
            </span>
          ))}
        </div>

        <Link
          href={`/phase/${project.phase}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100"
        >
          Xem phase <ArrowUpRight className="h-3 w-3" />
        </Link>
      </CardContent>
    </Card>
  );
}
