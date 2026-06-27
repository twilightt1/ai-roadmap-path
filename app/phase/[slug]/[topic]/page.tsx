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
      <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/roadmap" className="hover:text-foreground">
          Roadmap
        </Link>
        <span>/</span>
        <Link href={`/phase/${phase.slug}`} className="hover:text-foreground">
          {phaseLabel}
        </Link>
        <span>/</span>
        <span className="text-foreground">{t.title}</span>
      </nav>

      {/* Header */}
      <header className={`mb-8 rounded-2xl border ${a.border} bg-card/50 p-6 sm:p-8`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${a.gradient} text-white shadow-lg`}
          >
            <PhaseIcon name={phase.icon} className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={`${a.bg} border-0 text-white`}>{t.code}</Badge>
              <span className="text-xs text-muted-foreground">
                {phaseLabel} · {phase.title}
              </span>
              <span className="text-xs text-muted-foreground">
                · Bài {index + 1}/{phase.topics.length}
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              {t.title}
            </h1>
            {t.description && (
              <p className="mt-3 text-base text-muted-foreground leading-relaxed">
                {t.description}
              </p>
            )}
          </div>
        </div>

        {/* Learning objectives */}
        <div className="mt-6 rounded-xl border border-border/40 bg-background/40 p-4">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <CheckCircle2 className={`h-3.5 w-3.5 ${a.text}`} />
            Bạn sẽ học gì
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {t.items.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${a.dot}`} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </header>

      {/* Body: TOC + content */}
      {hasContent ? (
        <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
          {/* TOC sticky */}
          {toc.length > 0 && (
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Mục lục
                </p>
                <nav className="space-y-1 border-l border-border/40">
                  {toc.map((item) => (
                    <a
                      key={item.slug}
                      href={`#${item.slug}`}
                      className={`block border-l-2 border-transparent py-1 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground ${
                        item.level === 3 ? "pl-6" : "pl-4"
                      }`}
                    >
                      {item.text}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>
          )}

          {/* Content */}
          <article className="min-w-0">
            <MdxContent source={source} />
          </article>
        </div>
      ) : (
        /* Coming soon fallback */
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/30 p-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/40">
            <BookOpen className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">Nội dung đang hoàn thiện</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Chương này chưa có bài giảng đầy đủ. Trong lúc chờ, bạn có thể xem các mục
            kiến thức cần học ở phần &quot;Bạn sẽ học gì&quot; phía trên, hoặc đọc tài liệu
            tham khảo.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={`/resources`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/40 px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              <BookOpen className="h-4 w-4" /> Tài liệu tham khảo
            </Link>
            <Link
              href={`/phase/${phase.slug}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/40 px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              <ArrowLeft className="h-4 w-4" /> Quay lại phase
            </Link>
          </div>
        </div>
      )}

      {/* Footer nav: prev/next topic */}
      <div className="mt-12 grid gap-4 border-t border-border/40 pt-8 sm:grid-cols-2">
        {prevTopic ? (
          <Link
            href={`/phase/${phase.slug}/${prevTopic.id}`}
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-primary/40 hover:bg-card/80"
          >
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ArrowLeft className="h-3.5 w-3.5" /> Bài trước
            </div>
            <div className="mt-1 font-medium">
              {prevTopic.code} · {prevTopic.title}
            </div>
          </Link>
        ) : (
          <Link
            href={`/phase/${phase.slug}`}
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-primary/40 hover:bg-card/80"
          >
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ArrowLeft className="h-3.5 w-3.5" /> Quay lại phase
            </div>
            <div className="mt-1 font-medium">{phaseLabel} — {phase.title}</div>
          </Link>
        )}
        {nextTopic ? (
          <Link
            href={`/phase/${phase.slug}/${nextTopic.id}`}
            className="group rounded-xl border border-border/60 bg-card/40 p-4 text-right transition-colors hover:border-primary/40 hover:bg-card/80"
          >
            <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
              Bài tiếp theo <ArrowRight className="h-3.5 w-3.5" />
            </div>
            <div className="mt-1 font-medium">
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
