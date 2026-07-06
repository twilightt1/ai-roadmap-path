"use client";

import { Loader2, Terminal } from "lucide-react";
import type { RunResult } from "@/lib/runner";
import { ResultTable } from "./result-table";

/**
 * Panel output của playground — hiển thị các trạng thái:
 * empty / đang tải runtime / đang chạy / kết quả (stdout + table SQL + error).
 */
export function OutputPanel({
  result,
  running,
  loadingRuntime,
}: {
  result: RunResult | null;
  running: boolean;
  loadingRuntime: string | null;
}) {
  const hasOutput =
    result &&
    (result.stdout ||
      result.stderr ||
      result.error ||
      (result.columns && result.rows));

  return (
    <div className="rounded-lg border border-border/60 bg-foreground/[0.02]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2">
        <Terminal className="h-3.5 w-3.5 text-muted-foreground/70" />
        <span className="text-[10px] font-mono font-bold tracking-wider text-muted-foreground">
          OUTPUT
        </span>
        {result?.durationMs !== undefined && (
          <span className="ml-auto text-[10px] font-mono text-muted-foreground/60">
            {result.durationMs}ms
          </span>
        )}
      </div>

      {/* Body */}
      <div className="min-h-[120px] p-4">
        {loadingRuntime ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>{loadingRuntime}</span>
          </div>
        ) : running ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Đang chạy…</span>
          </div>
        ) : !hasOutput ? (
          <p className="text-xs font-mono text-muted-foreground/50">
            Bấm Run để chạy code
          </p>
        ) : (
          <div className="space-y-3">
            {result?.columns && result?.rows !== undefined && (
              <ResultTable columns={result.columns} rows={result.rows} />
            )}
            {result?.stdout && (
              <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-foreground/80">
                {result.stdout}
              </pre>
            )}
            {result?.stderr && !result?.error && (
              <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-amber-500">
                {result.stderr}
              </pre>
            )}
            {result?.error && (
              <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-destructive">
                {result.error}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
