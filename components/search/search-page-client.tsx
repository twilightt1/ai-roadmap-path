"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";

/**
 * Search page client — lazy-loads Pagefind Component UI at runtime.
 * SSR-safe: the script is injected in a useEffect so the server renders
 * the loading state only.
 *
 * Uses Pagefind 1.5.x Component UI: custom elements
 * <pagefind-input>, <pagefind-summary>, <pagefind-results> that
 * auto-connect to a shared "default" instance once the module loads.
 * See https://pagefind.app/docs/ui-component
 */
export function SearchPageClient() {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Probe the manifest first — if it 404s, the index wasn't built.
        const res = await fetch("/pagefind/pagefind-entry.json", { method: "HEAD" });
        if (!res.ok) throw new Error("pagefind index not built");
        if (cancelled) return;

        // Inject the Component UI stylesheet and script. Custom elements
        // <pagefind-input> / <pagefind-results> below self-initialize
        // once the module executes.
        const css = document.createElement("link");
        css.rel = "stylesheet";
        css.href = "/pagefind/pagefind-component-ui.css";
        document.head.appendChild(css);

        const script = document.createElement("script");
        script.type = "module";
        script.src = "/pagefind/pagefind-component-ui.js";
        script.onload = () => {
          if (!cancelled) setStatus("loaded");
        };
        script.onerror = () => {
          if (!cancelled) setStatus("error");
        };
        document.head.appendChild(script);
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      // Note: we don't remove the <script>/<link> on unmount because React
      // Strict Mode in dev double-invokes effects; leaving them is idempotent
      // (browser dedupes identical script srcs) and avoids re-mount bugs.
    };
  }, []);

  if (status === "error") {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/30 p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-foreground/5 border border-border">
          <Search className="h-5 w-5 text-muted-foreground/70" />
        </div>
        <h2 className="text-base font-bold text-foreground">
          Chỉ mục tìm kiếm chưa được xây dựng
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-xs text-muted-foreground">
          Chạy <code className="rounded bg-foreground/5 px-1.5 py-0.5 text-[11px] font-mono">pnpm build</code> để tạo chỉ mục tìm kiếm, sau đó mở lại trang này.
        </p>
        <Link
          href="/roadmap"
          className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-border bg-foreground/5 px-3.5 py-2 text-xs font-mono font-semibold text-muted-foreground transition-colors hover:bg-foreground/10"
        >
          Vào lộ trình <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  // Pagefind Component UI custom elements. They are inert until the
  // module script in useEffect loads, then self-initialize.
  // suppressHydrationWarning: these custom elements render no children
  // server-side; React should not warn about hydration mismatches.
  return (
    <div suppressHydrationWarning className="space-y-4">
      <pagefind-input placeholder="Tìm trong bài học..." />
      <pagefind-summary />
      <pagefind-results />
    </div>
  );
}
