import type { Metadata } from "next";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { learningPaths, phases } from "@/lib/roadmap-data";
import { accentMap } from "@/lib/theme";
import { PhaseIcon } from "@/components/shared/phase-icon";
import { Reveal } from "@/components/shared/reveal";

export const metadata: Metadata = {
  title: "Con đường học · 4 Learning Paths",
  description:
    "Chọn 1 trong 4 lộ trình: AI Engineer, ML Engineer, AI Architect, hoặc Complete Full Stack AI Engineer.",
};

export default function PathsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-12 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-500/25">
          <MapPin className="h-7 w-7" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Chọn con đường của bạn
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
          4 lộ trình tuỳ theo mục tiêu và trình độ. Mỗi path chọn subset phases phù hợp
          và có timeline ước tính.
        </p>
      </div>

      <div className="space-y-8">
        {learningPaths.map((path, idx) => {
          const a = accentMap[path.accent];
          const pathPhases = path.phases
            .map((n) => phases.find((p) => p.number === n))
            .filter(Boolean);

          return (
            <Reveal key={path.id} delay={idx * 0.08}>
              <section
                className={`rounded-2xl border ${a.border} bg-card/60 overflow-hidden`}
              >
                {/* Header */}
                <div className={`p-6 sm:p-8 border-b ${a.border}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${a.gradient} text-white font-bold`}
                      >
                        {path.id}
                      </span>
                      <div>
                        <h2 className="text-xl font-bold">{path.name}</h2>
                        <p className="text-sm text-muted-foreground">
                          {path.focus} · {path.timeline}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full ${a.bgSoft} ${a.text} px-3 py-1 text-xs font-medium`}>
                      {path.phases.length} phases
                    </span>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                    {path.description}
                  </p>
                </div>

                {/* Phase sequence */}
                <div className="p-6 sm:p-8">
                  <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Lộ trình phases
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    {pathPhases.map((phase, i) => {
                      if (!phase) return null;
                      const pa = accentMap[phase.accent];
                      return (
                        <span key={phase.slug} className="flex items-center gap-2">
                          <Link
                            href={`/phase/${phase.slug}`}
                            className={`inline-flex items-center gap-1.5 rounded-lg ${pa.bgSoft} ${pa.text} px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-opacity-20`}
                          >
                            <PhaseIcon name={phase.icon} className="h-3.5 w-3.5" />
                            {phase.isCapstone ? "Capstone" : `P${phase.number}`}
                            <span className="hidden sm:inline opacity-70">
                              {phase.title.split(" &")[0].split(":")[0].substring(0, 25)}
                            </span>
                          </Link>
                          {i < pathPhases.length - 1 && (
                            <span className="text-muted-foreground/40">→</span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </section>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}
