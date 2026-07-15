import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Cpu } from "lucide-react";
import { allProjects, getProjectById, phases } from "@/lib/roadmap-data";
import { difficultyMap, accentMap } from "@/lib/theme";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/shared/reveal";
import { FeatureChecklist } from "@/components/roadmap/feature-checklist";
import { BookmarkButton } from "@/components/library/bookmark-button";
import { ProjectEvidencePanel } from "@/components/project-evidence/project-evidence-panel";
import { featureFlags } from "@/lib/feature-flags";

type Props = { params: Promise<{ id: string }> };

export async function generateStaticParams() {
  return allProjects.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const project = getProjectById(id);
  if (!project) return {};
  return {
    title: `${project.title} · Dự án`,
    description: project.description,
  };
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params;
  const project = getProjectById(id);
  if (!project) notFound();

  const d = difficultyMap[project.difficulty];
  const phase = phases.find((p) => p.number === project.phase);
  const a = phase ? accentMap[phase.accent] : null;
  const phaseLabel = phase?.isCapstone ? "Capstone" : `Phase ${project.phase}`;
  const phaseHref = phase ? `/phase/${phase.slug}` : "/projects";

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      {/* Breadcrumb */}
      <Link
        href="/projects"
        className="mb-6 inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground/70 hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Quay lại dự án
      </Link>

      <Reveal>
        <div className="rounded-2xl border border-border bg-card/35 p-6 sm:p-8 relative overflow-hidden">
          <div
            className={`absolute -right-8 -top-8 h-24 w-24 rounded-full ${a ? a.bgSoft : "bg-foreground/5"} blur-3xl opacity-40`}
          />
          <div className="relative space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="secondary"
                  className={`${d.bg} ${d.text} border ${d.border} gap-1.5 px-2 py-0 text-[10px]`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {d.label}
                </Badge>
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70">
                  {phaseLabel}
                </span>
              </div>
              <BookmarkButton
                targetType="project"
                targetSlug={project.id}
                label="Lưu dự án"
                savedLabel="Đã lưu dự án"
              />
            </div>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {project.title}
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {project.description}
            </p>

            <div className="flex flex-wrap items-center gap-1.5 pt-2">
              <span className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground/70">
                <Cpu className="h-3 w-3" /> Stack:
              </span>
              {project.stack.map((s) => (
                <span
                  key={s}
                  className="rounded bg-foreground/5 border border-border px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground/70"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Reveal>

      {/* Feature checklist */}
      <Reveal className="mt-6">
        <div className="rounded-2xl border border-border bg-card/40 p-6">
          <FeatureChecklist projectId={project.id} features={project.features} />
        </div>
      </Reveal>

      {featureFlags.projectEvidence && (
        <Reveal className="mt-6">
          <ProjectEvidencePanel projectId={project.id} features={project.features} />
        </Reveal>
      )}

      {/* Link to parent phase */}
      <div className="mt-6">
        <Link
          href={phaseHref}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Xem phase {phaseLabel} <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
