import type { Metadata } from "next";
import { SearchPageClient } from "@/components/search/search-page-client";

export const metadata: Metadata = {
  title: "Tìm kiếm",
  description:
    "Tìm trong 118 bài học và 51 dự án của AI Engineer Roadmap 2026.",
};

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
          Tìm trong bài học
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tìm nội dung bên trong 118 bài học và 51 dự án. Kết quả kèm đoạn trích phù hợp.
        </p>
      </header>
      <SearchPageClient />
    </div>
  );
}
