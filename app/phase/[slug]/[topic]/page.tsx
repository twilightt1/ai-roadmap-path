import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { getTopicInPhase, allTopicParams } from "@/lib/roadmap-data";
import {
  getTopicContent,
  getTableOfContents,
} from "@/lib/content";
import { accentMap } from "@/lib/theme";
import { PhaseIcon } from "@/components/shared/phase-icon";
import { MdxContent } from "@/components/roadmap/mdx-content";
import { TocSidebar } from "@/components/roadmap/toc-sidebar";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

type Props = {
  params: Promise<{ slug: string; topic: string }>;
};

export async function generateStaticParams() {
  return allTopicParams().map(({ slug, topic }) => ({ slug, topic }));
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { slug, topic } = await params;
  const found = getTopicInPhase(slug, topic);
  if (!found) return {};
  const { phase, topic: t } = found;
  return {
    title: `${t.code} ${t.title}`,
    description:
      t.description ?? `Chương ${t.code} trong ${phase.title} — AI Engineer Roadmap 2026.`,
  };
}

export default async function TopicPage({ params }: Props) {
  const { slug, topic } = await params;
  const found = getTopicInPhase(slug, topic);
  if (!found) notFound();

  const { phase, topic: t, index } = found;
  const a = accentMap[phase.accent];
  const prevTopic = index > 0 ? phase.topics[index - 1] : null;
  const nextTopic =
    index < phase.topics.length - 1 ? phase.topics[index + 1] : null;

  const source = await getTopicContent(phase.number, t.id);
  const hasContent = source !== null;
  const toc = hasContent ? getTableOfContents(source) : [];

  const phaseLabel = phase.isCapstone ? "Capstone" : `Phase ${phase.number}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
      {/* Breadcrumb */}
      <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-xs font-mono text-zinc-500">
        <Link href="/roadmap" className="hover:text-foreground">
          Roadmap
        </Link>
        <span>/</span>
        <Link href={`/phase/${phase.slug}`} className="hover:text-zinc-300">
          {phaseLabel}
        </Link>
        <span>/</span>
        <span className="text-zinc-200">{t.title}</span>
      </nav>

      {/* Header */}
      <header className={`mb-8 rounded-2xl border ${a.border} bg-card/35 p-6 sm:p-8 relative overflow-hidden`}>
        <div
          className={`absolute -right-8 -top-8 h-24 w-24 rounded-full ${a.bgSoft} blur-3xl opacity-40`}
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start">
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${a.gradient} text-white shadow`}
          >
            <PhaseIcon name={phase.icon} className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={`${a.bg} border-0 text-primary-foreground font-mono font-bold text-[10px]`}>{t.code}</Badge>
              <span className="text-xs text-zinc-500 font-mono">
                {phaseLabel} · {phase.title}
              </span>
              <span className="text-xs text-zinc-500 font-mono">
                · BÀI {index + 1}/{phase.topics.length}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl text-zinc-100">
              {t.title}
            </h1>
            {t.description && (
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                {t.description}
              </p>
            )}
          </div>
        </div>

        {/* Learning objectives */}
        <div className="mt-6 relative rounded-xl border border-white/5 bg-zinc-950/20 p-4">
          <p className="mb-3 flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
            <CheckCircle2 className={`h-3.5 w-3.5 ${a.text} opacity-80`} />
            Bạn sẽ học gì
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {t.items.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed"
              >
                <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${a.dot}`} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </header>

      {/* Body: TOC + content */}
      {hasContent ? (
        <div className="grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
          {/* TOC sticky */}
          {toc.length > 0 && <TocSidebar items={toc} />}

          {/* Content */}
          <article className="min-w-0 max-w-[65ch] leading-relaxed">
            <MdxContent source={source} />
          </article>
        </div>
      ) : (
        /* Coming soon fallback */
        <div className="rounded-2xl border border-dashed border-white/5 bg-zinc-950/20 p-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.02] border border-white/5">
            <BookOpen className="h-6 w-6 text-zinc-500" />
          </div>
          <h2 className="text-lg font-bold text-zinc-200">Nội dung đang hoàn thiện</h2>
          <p className="mx-auto mt-2 max-w-sm text-xs text-muted-foreground leading-relaxed">
            Chương này chưa có bài giảng đầy đủ. Trong lúc chờ, bạn có thể xem các mục
            kiến thức cần học ở phần &quot;Bạn sẽ học gì&quot; phía trên, hoặc đọc tài liệu tham khảo.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={`/resources`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.01] px-4 py-2 text-xs font-mono font-semibold text-zinc-300 hover:bg-white/[0.03]"
            >
              <BookOpen className="h-4 w-4" /> Tài liệu tham khảo
            </Link>
            <Link
              href={`/phase/${phase.slug}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.01] px-4 py-2 text-xs font-mono font-semibold text-zinc-300 hover:bg-white/[0.03]"
            >
              <ArrowLeft className="h-4 w-4" /> Quay lại phase
            </Link>
          </div>
        </div>
      )}

      {/* Footer nav: prev/next topic */}
      <div className="mt-16 grid gap-4 border-t border-white/5 pt-8 sm:grid-cols-2">
        {prevTopic ? (
          <Link
            href={`/phase/${phase.slug}/${prevTopic.id}`}
            className="group rounded-xl border border-white/5 bg-white/[0.01] p-4 transition-all hover:border-white/10 hover:bg-white/[0.03]"
          >
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
              <ArrowLeft className="h-3 w-3" /> Bài trước
            </div>
            <div className="mt-1 text-sm font-bold text-zinc-300 group-hover:text-primary transition-colors">
              {prevTopic.code} · {prevTopic.title}
            </div>
          </Link>
        ) : (
          <Link
            href={`/phase/${phase.slug}`}
            className="group rounded-xl border border-white/5 bg-white/[0.01] p-4 transition-all hover:border-white/10 hover:bg-white/[0.03]"
          >
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
              <ArrowLeft className="h-3 w-3" /> Quay lại phase
            </div>
            <div className="mt-1 text-sm font-bold text-zinc-300 group-hover:text-primary transition-colors">{phaseLabel} — {phase.title}</div>
          </Link>
        )}
        {nextTopic ? (
          <Link
            href={`/phase/${phase.slug}/${nextTopic.id}`}
            className="group rounded-xl border border-white/5 bg-white/[0.01] p-4 text-right transition-all hover:border-white/10 hover:bg-white/[0.03]"
          >
            <div className="flex items-center justify-end gap-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
              Bài tiếp theo <ArrowRight className="h-3 w-3" />
            </div>
            <div className="mt-1 text-sm font-bold text-zinc-300 group-hover:text-primary transition-colors">
              {nextTopic.code} · {nextTopic.title}
            </div>
          </Link>
        ) : (
          <div className="hidden sm:block" />
        )}
      </div>
    </div>
  );
}
