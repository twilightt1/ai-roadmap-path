import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { getTopicInPhase, allTopicParams } from "@/lib/roadmap-data";
import {
  getTopicContent,
  getTableOfContents,
} from "@/lib/content";
import { getQuiz } from "@/lib/quiz";
import { accentMap } from "@/lib/theme";
import { PhaseIcon } from "@/components/shared/phase-icon";
import { MdxContent } from "@/components/roadmap/mdx-content";
import { TocSidebar } from "@/components/roadmap/toc-sidebar";
import { QuizCard } from "@/components/quiz/quiz-card";
import { Reveal } from "@/components/shared/reveal";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import { ProgressToggle } from "@/components/shared/progress-toggle";

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
  const quiz = hasContent ? await getQuiz(phase.number, t.id) : null;

  const phaseLabel = phase.isCapstone ? "Capstone" : `Phase ${phase.number}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
      {/* Breadcrumb */}
      <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-xs font-mono text-muted-foreground/70">
        <Link href="/roadmap" className="hover:text-foreground">
          Roadmap
        </Link>
        <span>/</span>
        <Link href={`/phase/${phase.slug}`} className="hover:text-muted-foreground">
          {phaseLabel}
        </Link>
        <span>/</span>
        <span className="text-foreground">{t.title}</span>
      </nav>

      {/* Header */}
      <Reveal>
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
                <span className="text-xs text-muted-foreground/70 font-mono">
                  {phaseLabel} · {phase.title}
                </span>
                <span className="text-xs text-muted-foreground/70 font-mono">
                  · BÀI {index + 1}/{phase.topics.length}
                </span>
              </div>
              <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl text-foreground">
                {t.title}
              </h1>
              {t.description && (
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  {t.description}
                </p>
              )}
              <div className="mt-4">
                <ProgressToggle phaseSlug={phase.slug} topicId={t.id} />
              </div>
            </div>
          </div>

          {/* Learning objectives */}
          <div className="mt-6 relative rounded-xl border border-border bg-card/20 p-4">
            <p className="mb-3 flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
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
      </Reveal>

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
        <div className="rounded-2xl border border-dashed border-border bg-card/20 p-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground/5 border border-border">
            <BookOpen className="h-6 w-6 text-muted-foreground/70" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Nội dung đang hoàn thiện</h2>
          <p className="mx-auto mt-2 max-w-sm text-xs text-muted-foreground leading-relaxed">
            Chương này chưa có bài giảng đầy đủ. Trong lúc chờ, bạn có thể xem các mục
            kiến thức cần học ở phần &quot;Bạn sẽ học gì&quot; phía trên, hoặc đọc tài liệu tham khảo.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={`/resources`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-foreground/5 px-4 py-2 text-xs font-mono font-semibold text-muted-foreground hover:bg-foreground/10"
            >
              <BookOpen className="h-4 w-4" /> Tài liệu tham khảo
            </Link>
            <Link
              href={`/phase/${phase.slug}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-foreground/5 px-4 py-2 text-xs font-mono font-semibold text-muted-foreground hover:bg-foreground/10"
            >
              <ArrowLeft className="h-4 w-4" /> Quay lại phase
            </Link>
          </div>
        </div>
      )}

      {/* Quiz cuối bài (chỉ khi có quiz) */}
      {quiz && (
        <div className="mt-12">
          <QuizCard quiz={quiz} phaseSlug={phase.slug} topicId={t.id} />
        </div>
      )}

      {/* Footer nav: prev/next topic */}
      <div className="mt-16 grid gap-4 border-t border-border pt-8 sm:grid-cols-2">
        {prevTopic ? (
          <Link
            href={`/phase/${phase.slug}/${prevTopic.id}`}
            className="group rounded-xl border border-border bg-foreground/5 p-4 transition-all hover:border-border hover:bg-foreground/10"
          >
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70">
              <ArrowLeft className="h-3 w-3" /> Bài trước
            </div>
            <div className="mt-1 text-sm font-bold text-muted-foreground group-hover:text-primary transition-colors">
              {prevTopic.code} · {prevTopic.title}
            </div>
          </Link>
        ) : (
          <Link
            href={`/phase/${phase.slug}`}
            className="group rounded-xl border border-border bg-foreground/5 p-4 transition-all hover:border-border hover:bg-foreground/10"
          >
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70">
              <ArrowLeft className="h-3 w-3" /> Quay lại phase
            </div>
            <div className="mt-1 text-sm font-bold text-muted-foreground group-hover:text-primary transition-colors">{phaseLabel} · {phase.title}</div>
          </Link>
        )}
        {nextTopic ? (
          <Link
            href={`/phase/${phase.slug}/${nextTopic.id}`}
            className="group rounded-xl border border-border bg-foreground/5 p-4 text-right transition-all hover:border-border hover:bg-foreground/10"
          >
            <div className="flex items-center justify-end gap-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70">
              Bài tiếp theo <ArrowRight className="h-3 w-3" />
            </div>
            <div className="mt-1 text-sm font-bold text-muted-foreground group-hover:text-primary transition-colors">
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
