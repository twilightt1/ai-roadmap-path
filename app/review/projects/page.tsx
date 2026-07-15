import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { ProjectReviewQueue } from "@/components/project-review/project-review-queue";
import { featureFlags } from "@/lib/feature-flags";

export const metadata: Metadata = {
  title: "Project review queue",
  description: "Private allow-listed queue for manual project evidence review.",
  robots: { index: false, follow: false },
};

export default function ProjectReviewPage() {
  if (!featureFlags.projectReviewWorkflow) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Quay lại dashboard
      </Link>
      <header className="my-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-3 py-1 text-xs font-mono text-primary">
          <ShieldCheck className="h-3.5 w-3.5" /> Allow-listed manual review
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Project review queue</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Snapshot là bằng chứng do learner cung cấp. Reviewer vẫn phải tự đánh giá nội dung; hệ thống không xác minh URL, tính nguyên gốc hay năng lực.
        </p>
      </header>
      <ProjectReviewQueue />
    </div>
  );
}
