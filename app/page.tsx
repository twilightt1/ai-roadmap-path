import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Rocket,
  Brain,
  GitBranch,
  Trophy,
  BookOpen,
} from "lucide-react";
import { phases, learningPaths, stats } from "@/lib/roadmap-data";
import { accentMap } from "@/lib/theme";
import { PhaseIcon } from "@/components/shared/phase-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const statCards = [
  { label: "Phases", value: stats.phases, icon: GitBranch },
  { label: "Chủ đề", value: stats.topics, icon: Brain },
  { label: "Dự án", value: stats.projects, icon: Rocket },
  { label: "Con đường", value: stats.paths, icon: Trophy },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-20 sm:px-6 sm:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <Link
              href="/roadmap"
              className="group mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-1 text-xs text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
            >
              <Sparkles className="h-3.5 w-3.5 text-violet-400" />
              Ultimate AI Engineer Roadmap 2026
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </Link>

            <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-6xl">
              Từ <span className="text-gradient">Zero</span> đến Production-Grade{" "}
              <span className="text-gradient">AI Systems</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
              Lộ trình học AI Engineer đầy đủ nhất 2026 — 17 phases, {stats.topics}+ chủ đề
              và {stats.projects} dự án thực hành. Từ Python, Math, Deep Learning, LLM,
              Multi-LLM Orchestration, RAG, Agents đến MLOps production.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                render={<Link href="/roadmap" />}
                className="h-11 gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 text-white shadow-lg shadow-violet-500/25 hover:from-violet-600 hover:to-fuchsia-600"
              >
                Khám phá lộ trình <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                render={<Link href="/projects" />}
                className="h-11 gap-2 rounded-xl px-6"
              >
                <Rocket className="h-4 w-4" /> Xem dự án
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            {statCards.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-border/60 bg-card/50 p-4 text-center backdrop-blur"
              >
                <s.icon className="mx-auto mb-2 h-5 w-5 text-primary" />
                <div className="text-2xl font-bold tabular-nums">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Phase overview grid */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              17 phases + Capstone
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Nhấp vào mỗi phase để xem chi tiết kiến thức và dự án.
            </p>
          </div>
          <Link
            href="/roadmap"
            className="hidden shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline sm:inline-flex"
          >
            Xem timeline đầy đủ <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {phases.map((phase) => {
            const a = accentMap[phase.accent];
            return (
              <Link
                key={phase.slug}
                href={`/phase/${phase.slug}`}
                className={`group relative overflow-hidden rounded-2xl border ${a.border} bg-card/50 p-5 transition-all hover:-translate-y-0.5 hover:bg-card/80`}
              >
                <div
                  className={`absolute -right-8 -top-8 h-24 w-24 rounded-full ${a.bgSoft} blur-2xl transition-opacity group-hover:opacity-80`}
                />
                <div className="relative flex items-start gap-3">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${a.gradient} text-white shadow-lg`}
                  >
                    <PhaseIcon name={phase.icon} className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${a.text}`}>
                        {phase.isCapstone ? "Capstone" : `Phase ${phase.number}`}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        · {phase.topics.length} chủ đề
                      </span>
                    </div>
                    <h3 className="mt-0.5 font-semibold leading-snug">
                      {phase.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {phase.summary}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Learning paths */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Chọn con đường phù hợp
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            4 lộ trình tuỳ theo mục tiêu và trình độ của bạn.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {learningPaths.map((path) => {
            const a = accentMap[path.accent];
            return (
              <Link
                key={path.id}
                href="/paths"
                className={`group rounded-2xl border ${a.border} bg-card/50 p-5 transition-all hover:-translate-y-0.5 hover:bg-card/80`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-lg ${a.bgSoft} ${a.text} text-sm font-bold`}
                    >
                      {path.id}
                    </span>
                    <h3 className="font-semibold">{path.name}</h3>
                  </div>
                  <Badge variant="outline" className={a.text}>
                    {path.timeline}
                  </Badge>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {path.description}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-violet-500/10 via-card to-cyan-500/10 p-8 text-center sm:p-12">
          <BookOpen className="mx-auto mb-4 h-8 w-8 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Sẵn sàng bắt đầu hành trình?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            Mỗi phase đều có dự án thực hành từ dễ đến khó — học bằng cách xây dựng.
          </p>
          <Button
            render={<Link href="/roadmap" />}
            className="mx-auto mt-6 flex h-11 gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 text-white shadow-lg shadow-violet-500/25"
          >
            Vào lộ trình <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>
    </div>
  );
}
