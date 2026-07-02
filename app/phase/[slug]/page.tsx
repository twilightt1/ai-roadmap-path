import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { phases, getPhaseBySlug } from "@/lib/roadmap-data";
import { accentMap } from "@/lib/theme";
import { PhaseIcon } from "@/components/shared/phase-icon";
import { TopicList } from "@/components/roadmap/topic-list";
import { ProjectCard } from "@/components/roadmap/project-card";
import { Reveal } from "@/components/shared/reveal";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return phases.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const phase = getPhaseBySlug(slug);
  if (!phase) return {};
  return {
    title: `Phase ${phase.number} · ${phase.title}`,
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
        className="mb-6 inline-flex items-center gap-1.5 text-xs font-mono text-zinc-500 hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Quay lại roadmap
      </Link>

      {/* Header */}
      <Reveal>
        <div className={`rounded-2xl border ${a.border} bg-card/35 p-6 sm:p-8 relative overflow-hidden`}>
          <div
            className={`absolute -right-8 -top-8 h-24 w-24 rounded-full ${a.bgSoft} blur-3xl opacity-40`}
          />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${a.gradient} text-white shadow`}
              >
                <PhaseIcon name={phase.icon} className="h-6 w-6" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${a.text}`}>
                    {phaseLabel}
                  </span>
                  <span className="text-xs text-zinc-500 font-mono">
                    · {phase.topics.length} CHỦ ĐỀ · {phase.projects.length} DỰ ÁN
                  </span>
                </div>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl text-zinc-100">
                  {phase.title}
                </h1>
              </div>
            </div>
          </div>
          <p className="mt-4 relative text-sm text-muted-foreground leading-relaxed max-w-2xl">
            {phase.goal}
          </p>
        </div>
      </Reveal>

      {/* Projects */}
      {phase.projects.length > 0 && (
        <Reveal className="mt-12">
          <h2 className="mb-4 text-lg font-bold text-zinc-200">
            Dự án thực hành ({phase.projects.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {phase.projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        </Reveal>
      )}

      {/* Topics */}
      <Reveal className="mt-12">
        <h2 className="mb-2 text-lg font-bold text-zinc-200">
          Chủ đề chi tiết ({phase.topics.length})
        </h2>
        <p className="mb-4 text-xs text-muted-foreground leading-relaxed">
          Mở rộng mỗi mục để xem tóm tắt, rồi nhấp &quot;Đọc bài đầy đủ&quot; để vào chương giảng chi tiết.
        </p>
        <div className="rounded-xl border border-white/5 bg-zinc-950/20">
          <TopicList
            topics={phase.topics}
            phaseSlug={phase.slug}
            accent={phase.accent}
            defaultOpen
          />
        </div>
      </Reveal>

      {/* Navigation */}
      <div className="mt-16 flex items-center justify-between gap-4 border-t border-white/5 pt-8">
        {prev ? (
          <Link
            href={`/phase/${prev.slug}`}
            className="group flex flex-col items-start gap-1 rounded-xl border border-white/5 bg-white/[0.01] p-4 text-left transition-all hover:border-white/10 hover:bg-white/[0.03]"
          >
            <span className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
              <ArrowLeft className="h-3 w-3" /> Phase trước
            </span>
            <span className="text-sm font-bold text-zinc-300 group-hover:text-primary transition-colors">
              {prev.isCapstone ? "Capstone" : `Phase ${prev.number}`} · {prev.title}
            </span>
          </Link>
        ) : (
          <div />
        )}
        {next ? (
          <Link
            href={`/phase/${next.slug}`}
            className="group flex flex-col items-end gap-1 rounded-xl border border-white/5 bg-white/[0.01] p-4 text-right transition-all hover:border-white/10 hover:bg-white/[0.03]"
          >
            <span className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
              Phase sau <ArrowRight className="h-3 w-3" />
            </span>
            <span className="text-sm font-bold text-zinc-300 group-hover:text-primary transition-colors">
              {next.isCapstone ? "Capstone" : `Phase ${next.number}`} · {next.title}
            </span>
          </Link>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
