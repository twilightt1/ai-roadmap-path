import Link from "next/link";
import { ArrowRight, Sparkles, Rocket, GitBranch, Brain, Trophy, BookOpen } from "lucide-react";
import { phases, learningPaths, stats } from "@/lib/roadmap-data";
import { accentMap } from "@/lib/theme";
import { PhaseIcon } from "@/components/shared/phase-icon";
import { Button } from "@/components/ui/button";
import { HeroPreview } from "@/components/roadmap/hero-preview";
import { LogoWall } from "@/components/shared/logo-wall";
import { Reveal } from "@/components/shared/reveal";
import { ProgressOverview } from "@/components/shared/progress-overview";

const statCards = [
  { label: "Phases", value: stats.phases, icon: GitBranch },
  { label: "Chủ đề", value: stats.topics, icon: Brain },
  { label: "Dự án", value: stats.projects, icon: Rocket },
  { label: "Con đường", value: stats.paths, icon: Trophy },
];

export default function HomePage() {
  return (
    <div className="space-y-24 py-8 sm:py-12">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-20 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            {/* Left Column: Copy & Actions */}
            <div className="space-y-6 text-left">
              <Link
                href="/roadmap"
                className="group inline-flex items-center gap-2 rounded-full border border-border bg-foreground/5 px-3.5 py-1 text-xs font-mono text-muted-foreground backdrop-blur transition-colors hover:border-border hover:text-foreground"
              >
                <Sparkles className="h-3 w-3 text-emerald-400" />
                Ultimate AI Engineer Roadmap 2026
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </Link>

              <h1 className="text-5xl font-extrabold tracking-tighter leading-[1.05] sm:text-7xl">
                Từ <span className="text-gradient">Zero</span> đến
                <br />
                Production-Grade
                <br />
                <span className="text-gradient">AI Systems</span>
              </h1>

              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
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
                  className="h-10 gap-2 rounded-lg border-border bg-foreground/5 px-5 text-xs font-semibold text-muted-foreground hover:bg-foreground/10"
                >
                  <Rocket className="h-4 w-4" /> Xem dự án
                </Button>
              </div>
            </div>

            {/* Right Column: Visual */}
            <div className="hidden lg:block">
              <HeroPreview />
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <Reveal className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-px border border-border bg-foreground/5 p-1 rounded-2xl sm:grid-cols-4 backdrop-blur-sm">
          {statCards.map((s) => (
            <div key={s.label} className="bg-card/40 p-6 text-center">
              <s.icon className="mx-auto mb-2 h-4 w-4 text-emerald-400" />
              <div className="text-3xl font-bold tracking-tight tabular-nums text-foreground">{s.value}</div>
              <div className="mt-1 text-xs font-mono uppercase tracking-wider text-muted-foreground/70">{s.label}</div>
            </div>
          ))}
        </div>
      </Reveal>

      {/* Your progress */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Tiến độ của bạn
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Theo dõi từng bài đã học — tiến độ được lưu trong trình duyệt của bạn.
            </p>
          </div>
        </div>
        <ProgressOverview />
      </section>

      {/* Phase Grid */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
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
            const isFeatured = i === 0 || i === 4 || i === 8 || i === 12;
            return (
              <Reveal key={phase.slug} delay={i % 3 * 0.05} className={isFeatured ? "lg:col-span-2" : ""}>
                <Link
                  href={`/phase/${phase.slug}`}
                  className={`group relative flex h-full overflow-hidden rounded-2xl border ${a.border} bg-card/30 p-6 transition-all hover:-translate-y-0.5 hover:border-primary/30`}
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
                        <span className="text-[10px] text-muted-foreground/70">
                          · {phase.topics.length} chủ đề
                        </span>
                      </div>
                      <h3 className="mt-1 font-bold text-base leading-snug text-foreground group-hover:text-foreground transition-colors">
                        {phase.title}
                      </h3>
                      <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                        {phase.summary}
                      </p>
                    </div>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Learning Paths */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Chọn con đường phù hợp
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Lựa chọn 1 trong 4 lộ trình học tập tối ưu hoá theo mục tiêu của bạn.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 lg:divide-x divide-border">
          {learningPaths.map((path, idx) => {
            const a = accentMap[path.accent];
            return (
              <Reveal key={path.id} delay={idx * 0.08} className={`group relative pt-6 sm:pt-0 ${idx > 0 ? "lg:pl-8" : ""}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-mono uppercase tracking-wider ${a.text}`}>
                      Lộ trình {path.id}
                    </span>
                  </div>
                  <span className={`inline-flex items-center rounded-full ${a.bgSoft} ${a.text} px-2 py-0.5 text-[10px] font-medium`}>
                    {path.timeline}
                  </span>
                </div>
                <h3 className="mt-3 text-base font-bold text-foreground group-hover:text-primary transition-colors">
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
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Logo Wall */}
      <Reveal>
        <LogoWall />
      </Reveal>

      {/* CTA Section */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card/30 p-8 text-center sm:p-12">
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
