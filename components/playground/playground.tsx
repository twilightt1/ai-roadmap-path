"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Play, RotateCcw, ExternalLink, Terminal } from "lucide-react";
import { SaveSnippetButton } from "@/components/library/save-snippet-button";
import { Button } from "@/components/ui/button";
import { runCode, LANG_LABELS, type Lang, type RunResult } from "@/lib/runner";
import { OutputPanel } from "./output-panel";

// CodeMirror chạm DOM → dynamic import ssr:false để khỏi server bundle.
const CodeEditor = dynamic(
  () => import("./code-editor").then((m) => m.CodeEditor),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-lg ring-1 ring-foreground/10 bg-foreground/[0.02] p-4 text-xs font-mono text-muted-foreground/50">
        Đang tải editor…
      </div>
    ),
  }
);

/** Runtime loading message theo ngôn ngữ. */
const LOADING_MSG: Record<Lang, string> = {
  python: "Đang tải Python runtime (Pyodide ~10MB, chỉ lần đầu)…",
  sql: "Đang tải SQLite runtime (sql.js ~1MB, chỉ lần đầu)…",
  javascript: "Đang khởi tạo…",
};

/**
 * Playground widget — unit dùng cả inline (MDX) lẫn standalone (/playground).
 * Editor + Run + output, stacked dọc (fit 65ch inline).
 */
export function Playground({
  lang,
  initialCode,
  title,
  persistKey,
  showOpenInPlayground = false,
  snippetContext,
}: {
  lang: Lang;
  initialCode: string;
  title?: string;
  /** Nếu có, lưu code vào localStorage key này (standalone page). */
  persistKey?: string;
  /** Inline = true → hiện nút "Mở trong playground". */
  showOpenInPlayground?: boolean;
  /** Optional context when playground appears inside a lesson/challenge. */
  snippetContext?: {
    lessonSlug?: string | null;
    challengeSlug?: string | null;
    defaultTitle?: string;
  };
}) {
  const router = useRouter();
  // Khôi phục code từ localStorage (lazy init — tránh setState trong effect).
  const [code, setCode] = useState(() => {
    if (!persistKey) return initialCode;
    try {
      const saved = localStorage.getItem(persistKey);
      return saved ?? initialCode;
    } catch {
      return initialCode;
    }
  });
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [loadingRuntime, setLoadingRuntime] = useState<string | null>(null);

  // Lưu code vào localStorage khi thay đổi.
  useEffect(() => {
    if (!persistKey) return;
    try {
      localStorage.setItem(persistKey, code);
    } catch {
      /* ignore */
    }
  }, [persistKey, code]);

  const run = useCallback(async () => {
    setRunning(true);
    setLoadingRuntime(LOADING_MSG[lang]);
    setResult(null);
    try {
      const r = await runCode(lang, code);
      setResult(r);
    } catch (e) {
      setResult({
        stdout: "",
        stderr: "",
        error: (e as Error).message || String(e),
      });
    } finally {
      setRunning(false);
      setLoadingRuntime(null);
    }
  }, [lang, code]);

  const reset = useCallback(() => {
    setCode(initialCode);
    setResult(null);
  }, [initialCode]);

  const openInPlayground = useCallback(() => {
    const params = new URLSearchParams({ lang, code });
    router.push(`/playground?${params.toString()}`);
  }, [router, lang, code]);

  return (
    <div className="my-6 overflow-hidden rounded-xl border border-border/60 bg-card/30">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-foreground/[0.02] px-4 py-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
          <Terminal className="h-3.5 w-3.5 text-primary" />
        </span>
        <span className="text-xs font-semibold text-foreground">
          {title ?? "Playground"}
        </span>
        <span className="rounded border border-border/60 px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase text-muted-foreground">
          {LANG_LABELS[lang]}
        </span>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
          <Button
            onClick={run}
            disabled={running}
            size="sm"
            className="gap-1.5 px-3"
          >
            <Play className="h-3.5 w-3.5" />
            Run
          </Button>
          <SaveSnippetButton
            language={lang}
            code={code}
            lessonSlug={snippetContext?.lessonSlug ?? null}
            challengeSlug={snippetContext?.challengeSlug ?? null}
            defaultTitle={snippetContext?.defaultTitle ?? `${LANG_LABELS[lang]} snippet`}
          />
          <Button
            onClick={reset}
            variant="outline"
            size="sm"
            className="gap-1.5 px-2.5"
            title="Đưa code về ban đầu"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          {showOpenInPlayground && (
            <Button
              onClick={openInPlayground}
              variant="ghost"
              size="sm"
              className="gap-1.5 px-2.5"
              title="Mở trong trang playground riêng"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Editor + Output (stacked dọc) */}
      <div className="grid gap-3 p-3">
        <CodeEditor value={code} onChange={setCode} lang={lang} />
        <OutputPanel
          result={result}
          running={running}
          loadingRuntime={loadingRuntime}
        />
      </div>
    </div>
  );
}
