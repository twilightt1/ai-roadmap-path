"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

/** Nút mở command palette bằng cách dispatch custom event. */
export function SearchTrigger({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => document.dispatchEvent(new CustomEvent("open-search"))}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-border bg-background/40 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        className
      )}
      aria-label="Tìm kiếm"
    >
      <Search className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Tìm kiếm</span>
      <kbd className="hidden rounded border border-border bg-muted/60 px-1 text-[10px] font-medium sm:inline">
        ⌘K
      </kbd>
    </button>
  );
}
