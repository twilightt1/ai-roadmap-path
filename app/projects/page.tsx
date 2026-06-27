import type { Metadata } from "next";
import Link from "next/link";
import { Rocket } from "lucide-react";
import { allProjects } from "@/lib/roadmap-data";
import { ProjectCard } from "@/components/roadmap/project-card";

export const metadata: Metadata = {
  title: "Dự án — 51 Projects Thực Hành",
  description:
    "Toàn bộ 51 dự án thực hành từ dễ (🟢) đến khó (🔴) cho từng phase trong lộ trình AI Engineer 2026.",
};

export default function ProjectsPage() {
  const easy = allProjects.filter((p) => p.difficulty === "easy");
  const medium = allProjects.filter((p) => p.difficulty === "medium");
  const hard = allProjects.filter((p) => p.difficulty === "hard");

  const groups: { label: string; emoji: string; projects: typeof easy }[] = [
    { label: "Easy", emoji: "🟢", projects: easy },
    { label: "Medium", emoji: "🟡", projects: medium },
    { label: "Hard", emoji: "🔴", projects: hard },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-12 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-white shadow-lg shadow-violet-500/25">
          <Rocket className="h-7 w-7" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {allProjects.length} Dự án thực hành
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
          Mỗi phase có 3 dự án: dễ 🟢 (nền tảng), trung bình 🟡 (production thinking),
          khó 🔴 (production-grade, multi-system).
        </p>
      </div>

      {groups.map((g) => (
        <section key={g.label} className="mb-12">
          <div className="mb-5 flex items-center gap-2">
            <span className="text-2xl">{g.emoji}</span>
            <h2 className="text-xl font-bold">{g.label}</h2>
            <span className="text-sm text-muted-foreground">
              ({g.projects.length} dự án)
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {g.projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        </section>
      ))}

      <div className="mt-8 text-center">
        <Link
          href="/roadmap"
          className="text-sm font-medium text-primary hover:underline"
        >
          ← Quay lại timeline lộ trình
        </Link>
      </div>
    </div>
  );
}
