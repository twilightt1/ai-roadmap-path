import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { DiagnosticAssessmentClient } from "@/components/learning-loop/diagnostic-assessment-client";
import { getDiagnosticAssessment } from "@/lib/diagnostic-assessment";
import { featureFlags } from "@/lib/feature-flags";

export const metadata: Metadata = {
  title: "Diagnostic nền tảng",
  description: "Đánh giá nhanh 8 chủ đề nền tảng để chọn bước học tiếp theo.",
  robots: { index: false, follow: false },
};

export default async function DiagnosticPage() {
  if (!featureFlags.learningLoop) notFound();
  const assessment = await getDiagnosticAssessment();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Quay lại dashboard
      </Link>
      <header className="my-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-3 py-1 text-xs font-mono text-primary">
          <ShieldCheck className="h-3.5 w-3.5" /> Không lưu đáp án đã chọn
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">Diagnostic nền tảng</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          8 câu từ nội dung quiz đã review. Hệ thống chỉ lưu điểm tổng hợp theo chủ đề để đề xuất bước học tiếp theo.
        </p>
      </header>
      <DiagnosticAssessmentClient version={assessment.version} questions={assessment.questions} />
    </div>
  );
}
