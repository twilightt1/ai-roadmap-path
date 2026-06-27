import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { phases, getPhaseBySlug } from "@/lib/roadmap-data";
import { accentMap } from "@/lib/theme";
import { PhaseIcon } from "@/components/shared/phase-icon";
import { TopicList } from "@/components/roadmap/topic-list";
import { ProjectCard } from "@/components/roadmap/project-card";
import { Badge } from "@/components/ui/badge";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return phases.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const phase = getPhaseBySlug(slug);
  if (!phase) return {};
  return {
    title: `Phase ${phase.number} — ${phase.title}`,
    description: phase.goal,
  };
}

export default async function PhaseDetailPage({ params }: Props) {
  const { slug } = await params;
  const phase = getPhaseBySlug(slug);
  if (!phase) notFound();

  const a = accentMap[phase.accent];
  const idx = phases.findIndex((p) => p.slug === slug);
  const prev = idx > 0 ? phases[idx - 1] : null;
  const next = idx < phases.length - 1 ? phases[idx + 1] : null;
  const phaseLabel = phase.isCapstone ? "Capstone" : `Phase ${phase.number}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      {/* Breadcrumb */}
      <Link
        href="/roadmap"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Quay lại roadmap
      </Link>

      {/* Header */}
      <div className={`rounded-2xl border ${a.border} bg-card/60 p-6 sm:p-8`}>
        <div className="flex items-center gap-3">
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${a.gradient} text-white shadow-lg`}
          >
            <PhaseIcon name={phase.icon} className="h-6 w-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <Badge
                className={`${a.bg} text-white border-0`}
              >
                {phaseLabel}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {phase.topics.length} chủ đề · {phase.projects.length} dự án
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              {phase.title}
            </h1>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
          {phase.goal}
        </p>
      </div>

      {/* Projects */}
      {phase.projects.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-semibold">
            Dự án thực hành ({phase.projects.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {phase.projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        </section>
      )}

      {/* Topics */}
      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">
          Chủ đề chi tiết ({phase.topics.length})
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Mở rộng mỗi mục để xem tóm tắt, rồi nhấp &quot;Đọc bài đầy đủ&quot; để vào chương
          giảng chi tiết.
        </p>
        <div className="rounded-xl border border-border/60 bg-card/40">
          <TopicList
            topics={phase.topics}
            phaseSlug={phase.slug}
            accent={phase.accent}
            defaultOpen
          />
        </div>
      </section>

      {/* Navigation */}
      <div className="mt-10 flex items-center justify-between gap-4 border-t border-border/40 pt-8">
        {prev ? (
          <Link
            href={`/phase/${prev.slug}`}
            className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            <span>
              {prev.isCapstone ? "Capstone" : `Phase ${prev.number}`} —{" "}
              <span className="font-medium">{prev.title}</span>
            </span>
          </Link>
        ) : (
          <div />
        )}
        {next ? (
          <Link
            href={`/phase/${next.slug}`}
            className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <span>
              {next.isCapstone ? "Capstone" : `Phase ${next.number}`} —{" "}
              <span className="font-medium">{next.title}</span>
            </span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
