"use client";

import { Check, X, Loader2 } from "lucide-react";
import type { ChallengeRunResult, TestCaseResult } from "@/lib/challenge-types";
import {
  getAdditionalClientSideTestFailure,
  getTestCaseDisplayName,
} from "./test-result-display";

/**
 * Panel kết quả test — hiện per-test-case pass/fail + summary bar.
 * MVP: hiện expected vs actual khi fail (debug-friendly).
 */
export function TestResults({
  result,
  running,
  loadingRuntime,
}: {
  result: ChallengeRunResult | null;
  running: boolean;
  loadingRuntime: boolean;
}) {
  if (loadingRuntime) {
    return (
      <div className="rounded-lg border border-border/60 bg-foreground/[0.02] p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Đang tải Python runtime (Pyodide ~10MB, chỉ lần đầu)…</span>
        </div>
      </div>
    );
  }

  if (running) {
    return (
      <div className="rounded-lg border border-border/60 bg-foreground/[0.02] p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Đang chạy test cases…</span>
        </div>
      </div>
    );
  }

  if (!result) return null;

  // Lỗi harness (syntax error, crash trước khi chạy tests)
  if (result.error && result.results.length === 0) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <p className="mb-1 text-xs font-semibold text-destructive">
          Lỗi chạy code
        </p>
        <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-destructive/90">
          {result.error}
        </pre>
      </div>
    );
  }

  const passed = result.results.filter((r) => r.passed).length;
  const total = result.results.length;
  const allPassed = result.allPassed;

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div
        className={`flex items-center justify-between rounded-lg border px-4 py-2.5 ${
          allPassed
            ? "border-emerald-500/30 bg-emerald-500/5"
            : "border-border/60 bg-foreground/[0.02]"
        }`}
      >
        <span
          className={`text-sm font-semibold ${
            allPassed ? "text-emerald-400" : "text-foreground"
          }`}
        >
          {allPassed ? "✓ Tất cả test passed!" : `${passed}/${total} test passed`}
        </span>
        {result.durationMs !== undefined && (
          <span className="text-[10px] font-mono text-muted-foreground/60">
            {result.durationMs}ms
          </span>
        )}
      </div>

      {/* Per-test-case */}
      <div className="space-y-1.5">
        {result.results.map((tc, i) => (
          <TestCaseRow key={i} tc={tc} index={i} />
        ))}
      </div>

      {/* Stderr (warnings từ numpy v.v.) */}
      {result.stderr && (
        <pre className="whitespace-pre-wrap break-words rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 font-mono text-xs leading-relaxed text-amber-500">
          {result.stderr}
        </pre>
      )}
    </div>
  );
}

function TestCaseRow({ tc, index }: { tc: TestCaseResult; index: number }) {
  const additionalTestFailure = getAdditionalClientSideTestFailure(tc);

  return (
    <div
      className={`rounded-lg border px-3 py-2 ${
        tc.passed
          ? "border-emerald-500/20 bg-emerald-500/[0.03]"
          : "border-destructive/20 bg-destructive/[0.03]"
      }`}
    >
      <div className="flex items-center gap-2">
        {tc.passed ? (
          <Check className="h-4 w-4 shrink-0 text-emerald-400" />
        ) : (
          <X className="h-4 w-4 shrink-0 text-destructive" />
        )}
        <span className="text-xs font-medium text-foreground">
          {getTestCaseDisplayName(tc, index)}
        </span>
        {tc.hidden && (
          <span className="rounded border border-border/60 px-1 py-0.5 text-[9px] font-mono uppercase text-muted-foreground/60">
            additional
          </span>
        )}
      </div>
      {additionalTestFailure ? (
        <p className="mt-1.5 pl-6 text-[11px] text-muted-foreground">
          {additionalTestFailure.errorClass
            ? `Error class: ${additionalTestFailure.errorClass}`
            : "This additional client-side test did not pass."}
        </p>
      ) : (
        <>
          {!tc.passed && !tc.error && (
            <div className="mt-1.5 grid gap-1 pl-6 text-[11px] font-mono">
              {tc.actual !== undefined && (
                <div className="text-muted-foreground">
                  <span className="text-muted-foreground/60">actual: </span>
                  <span className="text-foreground/80">{tc.actual}</span>
                </div>
              )}
              {tc.expected !== undefined && (
                <div className="text-muted-foreground">
                  <span className="text-muted-foreground/60">expected: </span>
                  <span className="text-emerald-400/80">{tc.expected}</span>
                </div>
              )}
            </div>
          )}
          {!tc.passed && tc.error && (
            <pre className="mt-1.5 whitespace-pre-wrap break-words pl-6 font-mono text-[11px] leading-relaxed text-destructive/90">
              {tc.error}
            </pre>
          )}
        </>
      )}
    </div>
  );
}
