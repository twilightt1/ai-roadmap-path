import type { Metadata } from "next";
import { LibraryPageClient } from "@/components/library/library-page-client";

export const metadata: Metadata = {
  title: "Thư viện cá nhân",
  description: "Bookmarks, ghi chú và code snippet cá nhân cho AI Engineer Roadmap.",
};

export default function LibraryPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <LibraryPageClient />
    </div>
  );
}
