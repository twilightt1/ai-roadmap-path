import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { resourceGroups } from "@/lib/roadmap-data";
import { Reveal } from "@/components/shared/reveal";

export const metadata: Metadata = {
  title: "Tài liệu · Resources Tham Khảo",
  description:
    "Tài nguyên học tập cho AI Engineer: foundational, deep learning, LLMs, production AI và cập nhật mới nhất.",
};

export default function ResourcesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-12 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-500/25">
          <BookOpen className="h-7 w-7" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Tài liệu tham khảo
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
          Nguồn học chất lượng cho từng giai đoạn: từ nền tảng đến production AI.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {resourceGroups.map((group, idx) => (
          <Reveal key={group.id} delay={idx * 0.05}>
            <section className="rounded-2xl border border-border/60 bg-card/60 p-6 h-full">
              <h2 className="mb-4 text-lg font-bold">{group.title}</h2>
              <div className="space-y-0 divide-y divide-border/40">
                {group.items.map((item) => (
                  <div
                    key={`${item.topic}-${item.resource}`}
                    className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                        {item.topic}
                      </span>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {item.resource}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
