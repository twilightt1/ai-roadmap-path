import type { Metadata } from "next";
import { Timeline } from "@/components/roadmap/timeline";
import { Reveal } from "@/components/shared/reveal";

export const metadata: Metadata = {
  title: "Roadmap · Lộ trình AI Engineer 2026",
  description:
    "Timeline đầy đủ 17 phases + Capstone. Mỗi phase có thể mở rộng xem chủ đề chi tiết và 3 dự án thực hành.",
};

export default function RoadmapPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          AI Engineer Roadmap 2026
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
          Mở rộng từng phase để xem chủ đề chi tiết và dự án thực hành.
          Hoặc nhấp vào &quot;Chi tiết phase&quot; để xem trang riêng biệt.
        </p>
      </div>
      <Reveal>
        <Timeline />
      </Reveal>
    </div>
  );
}
