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
import { HeroPreview } from "@/components/roadmap/hero-preview";

const statCards = [
  { label: "Phases", value: stats.phases, icon: GitBranch },
  { label: "Chủ đề", value: stats.topics, icon: Brain },
  { label: "Dự án", value: stats.projects, icon: Rocket },
  { label: "Con đường", value: stats.paths, icon: Trophy },
];

export default function HomePage() {
  return (
    <div className="space-y-16 py-8 sm:py-12">
      {/* Hero & Interactive Preview */}
      <section className="relative overflow-hidden">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-20 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            {/* Left Column: Copy & Actions */}
            <div className="space-y-6 text-left">
              <Link
                href="/roadmap"
                className="group inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/[0.02] px-3.5 py-1 text-xs font-mono text-zinc-400 backdrop-blur transition-colors hover:border-white/10 hover:text-foreground"
              >
                <Sparkles className="h-3 w-3 text-emerald-400" />
                Ultimate AI Engineer Roadmap 2026
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </Link>

              <h1 className="text-balance text-5xl font-extrabold tracking-tighter leading-none sm:text-7xl">
                Từ <span className="text-gradient">Zero</span> đến <br />
                Production-Grade <br />
                <span className="text-gradient">AI Systems</span>
              </h1>

              <p className="max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
                Lộ trình AI Engineer 2026 gồm 17 phases, 51 dự án thực hành từ nền tảng đến production-grade systems.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  render={<Link href="/roadmap" />}
                  className="h-10 gap-2 rounded-lg bg-primary px-5 text-xs font-semibold text-primary-foreground shadow-sm transition-transform hover:scale-[1.02] active:scale-95"
                >
                  Khám phá lộ trình <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  render={<Link href="/projects" />}
                  className="h-10 gap-2 rounded-lg border-white/5 bg-white/[0.02] px-5 text-xs font-semibold text-zinc-300 hover:bg-white/[0.05]"
                >
                  <Rocket className="h-4 w-4" /> Xem dự án
                </Button>
              </div>
            </div>

            {/* Right Column: Visual Mockup */}
            <div className="hidden lg:block">
              <HeroPreview />
            </div>
          </div>

          {/* Stats Row */}
          <div className="mx-auto mt-16 grid grid-cols-2 gap-px border border-white/5 bg-white/[0.01] p-1 rounded-2xl sm:grid-cols-4 backdrop-blur-sm">
            {statCards.map((s) => (
              <div
                key={s.label}
                className="bg-zinc-950/40 p-6 text-center"
              >
                <s.icon className="mx-auto mb-2 h-4 w-4 text-emerald-400" />
                <div className="text-3xl font-bold tracking-tight tabular-nums text-zinc-100">{s.value}</div>
                <div className="mt-1 text-xs font-mono uppercase tracking-wider text-zinc-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Phase Overview Grid (Asymmetrical Layout) */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-400">Roadmap Index</span>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              17 Phases & Capstone Projects
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Nhấp vào mỗi phase để xem chi tiết kiến thức và dự án thực tế đi kèm.
            </p>
          </div>
          <Link
            href="/roadmap"
            className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Xem timeline đầy đủ <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {phases.map((phase, i) => {
            const a = accentMap[phase.accent];
            const isFeatured = i === 0 || i === 4 || i === 8 || i === 12; // Design rhythm
            return (
              <Link
                key={phase.slug}
                href={`/phase/${phase.slug}`}
                className={`group relative overflow-hidden rounded-2xl border ${a.border} bg-card/30 p-6 transition-all hover:-translate-y-0.5 hover:border-primary/30 ${
                  isFeatured ? "lg:col-span-2" : ""
                }`}
              >
                <div
                  className={`absolute -right-8 -top-8 h-24 w-24 rounded-full ${a.bgSoft} blur-3xl opacity-40 transition-opacity group-hover:opacity-60`}
                />
                <div className="relative flex items-start gap-4">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${a.gradient} text-white shadow`}
                  >
                    <PhaseIcon name={phase.icon} className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono uppercase tracking-wider ${a.text}`}>
                        {phase.isCapstone ? "Capstone" : `Phase ${phase.number}`}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        · {phase.topics.length} chủ đề
                      </span>
                    </div>
                    <h3 className="mt-1 font-bold text-base leading-snug text-zinc-200 group-hover:text-foreground transition-colors">
                      {phase.title}
                    </h3>
                    <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                      {phase.summary}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Learning Paths (Cardless Horizontal Split Columns) */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-400">Tailored Paths</span>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Chọn con đường phù hợp
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Lựa chọn 1 trong 4 lộ trình học tập tối ưu hoá theo mục tiêu của bạn.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 lg:divide-x divide-white/5">
          {learningPaths.map((path, idx) => {
            const a = accentMap[path.accent];
            return (
              <div
                key={path.id}
                className={`group relative pt-6 sm:pt-0 ${idx > 0 ? "lg:pl-8" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-mono uppercase tracking-wider ${a.text}`}>
                      Lộ trình {path.id}
                    </span>
                  </div>
                  <Badge variant="outline" className={`${a.border} ${a.text} bg-transparent text-[10px] px-2 py-0`}>
                    {path.timeline}
                  </Badge>
                </div>
                <h3 className="mt-3 text-base font-bold text-zinc-200 group-hover:text-primary transition-colors">
                  {path.name}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {path.description}
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-xs text-primary font-semibold">
                  <span>Khám phá</span>
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </div>
                <Link href="/paths" className="absolute inset-0" />
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-zinc-950/30 p-8 text-center sm:p-12">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.02] to-transparent pointer-events-none" />
          <BookOpen className="mx-auto mb-4 h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Sẵn sàng bắt đầu hành trình?
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-xs text-muted-foreground">
            Mỗi phase đều có dự án thực hành từ dễ đến khó — học bằng cách xây dựng hệ thống thực tế.
          </p>
          <Button
            render={<Link href="/roadmap" />}
            className="mx-auto mt-6 flex h-10 gap-2 rounded-lg bg-primary px-6 text-primary-foreground shadow-md transition-transform hover:scale-[1.02] active:scale-95"
          >
            Vào lộ trình <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>
    </div>
  );
}
