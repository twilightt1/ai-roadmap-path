"use client";

import { useEffect, useState } from "react";

interface TocItem {
  text: string;
  slug: string;
  level: number;
}

export function TocSidebar({ items }: { items: TocItem[] }) {
  const [activeSlug, setActiveSlug] = useState<string>("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Tìm các đề mục đang cắt ngang viewport
        const intersecting = entries.filter((entry) => entry.isIntersecting);
        if (intersecting.length > 0) {
          // Lấy đề mục đầu tiên cắt ngang
          setActiveSlug(intersecting[0].target.id);
        }
      },
      { rootMargin: "-80px 0px -70% 0px" } // Kích hoạt khi đề mục nằm ở phần trên của màn hình
    );

    items.forEach((item) => {
      const el = document.getElementById(item.slug);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [items]);

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24">
        <p className="mb-3 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">
          MỤC LỤC
        </p>
        <nav className="space-y-1.5 border-l border-white/5">
          {items.map((item) => {
            const isActive = activeSlug === item.slug;
            return (
              <a
                key={item.slug}
                href={`#${item.slug}`}
                className={`block border-l-2 py-0.5 text-xs transition-all duration-150 ${
                  isActive
                    ? "border-emerald-500 text-emerald-400 font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                } ${item.level === 3 ? "pl-5" : "pl-3"}`}
              >
                {item.text}
              </a>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
