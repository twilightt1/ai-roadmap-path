import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProgressOverview } from "@/components/shared/progress-overview";
import { ResetProgress } from "@/components/shared/reset-progress";
import { LearningLoopDashboard } from "@/components/learning-loop/learning-loop-dashboard";
import { featureFlags } from "@/lib/feature-flags";

export const metadata: Metadata = {
  title: "Dashboard · Tiến độ học tập",
  description: "Theo dõi tiến độ học tập của bạn trên AI Engineer Roadmap 2026.",
};

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      {/* Breadcrumb */}
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground/70 hover:text-foreground"
      >
        <ArrowRight className="h-3.5 w-3.5 rotate-180" /> Quay lại trang chủ
      </Link>

      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
            Dashboard
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tiến độ học tập của bạn trên AI Engineer Roadmap 2026 — được lưu trong trình duyệt.
          </p>
        </div>
        <ResetProgress />
      </div>

      {featureFlags.learningLoop && <LearningLoopDashboard />}

      {/* Progress overview */}
      <ProgressOverview />

      {/* CTA */}
      {!featureFlags.learningLoop && <div className="mt-12 rounded-2xl border border-border bg-card/40 p-6 text-center">
        <h2 className="text-lg font-bold text-foreground">Tiếp tục học?</h2>
        <p className="mx-auto mt-2 max-w-md text-xs text-muted-foreground">
          Vào lộ trình để xem các phase, hoặc mở một bài chưa hoàn thành để tiếp tục.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/roadmap"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-transform hover:scale-[1.02] active:scale-95"
          >
            Vào lộ trình <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>}
    </div>
  );
}
