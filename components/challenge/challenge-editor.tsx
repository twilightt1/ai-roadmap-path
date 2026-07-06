"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { Play, Send, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { runExample, submitChallenge } from "@/lib/challenge-runner";
import type { TestCase, ChallengeRunResult } from "@/lib/challenge-types";
import { TestResults } from "./test-results";

// CodeMirror chạm DOM → dynamic import ssr:false.
const CodeEditor = dynamic(
  () => import("@/components/playground/code-editor").then((m) => m.CodeEditor),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-lg ring-1 ring-foreground/10 bg-foreground/[0.02] p-4 text-xs font-mono text-muted-foreground/50">
        Đang tải editor…
      </div>
    ),
  }
);

/**
 * Editor cho challenge — CodeMirror + 2 nút:
 * - "Run tests": chỉ chạy visible test cases (debug)
 * - "Submit": chạy tất cả (visible + hidden), ghi progress nếu pass
 */
export function ChallengeEditor({
  challengeId,
  starterCode,
  testCases,
  onSolved,
  persistKey,
}: {
  challengeId: string;
  starterCode: string;
  testCases: TestCase[];
  /** Callback khi submit pass — ghi progress. */
  onSolved?: () => void;
  /** localStorage key cho code. */
  persistKey?: string;
}) {
  const [code, setCode] = useState(() => {
    if (!persistKey) return starterCode;
    try {
      const saved = localStorage.getItem(persistKey);
      return saved ?? starterCode;
    } catch {
      return starterCode;
    }
  });
  const [runResult, setRunResult] = useState<ChallengeRunResult | null>(null);
  const [submitResult, setSubmitResult] = useState<ChallengeRunResult | null>(
    null
  );
  const [running, setRunning] = useState(false);
  const [loadingRuntime, setLoadingRuntime] = useState(false);
  const [mode, setMode] = useState<"run" | "submit">("run");

  // Lưu code vào localStorage.
  useEffect(() => {
    if (!persistKey) return;
    try {
      localStorage.setItem(persistKey, code);
    } catch {
      /* ignore */
    }
  }, [persistKey, code]);

  const handleRun = useCallback(async () => {
    setRunning(true);
    setLoadingRuntime(true);
    setMode("run");
    setRunResult(null);
    try {
      const r = await runExample(code, testCases);
      setRunResult(r);
    } catch (e) {
      setRunResult({
        results: [],
        allPassed: false,
        stdout: "",
        stderr: "",
        error: (e as Error).message || String(e),
      });
    } finally {
      setRunning(false);
      setLoadingRuntime(false);
    }
  }, [code, testCases]);

  const handleSubmit = useCallback(async () => {
    setRunning(true);
    setLoadingRuntime(true);
    setMode("submit");
    setSubmitResult(null);
    try {
      const r = await submitChallenge(code, testCases);
      setSubmitResult(r);
      if (r.allPassed && onSolved) onSolved();
    } catch (e) {
      setSubmitResult({
        results: [],
        allPassed: false,
        stdout: "",
        stderr: "",
        error: (e as Error).message || String(e),
      });
    } finally {
      setRunning(false);
      setLoadingRuntime(false);
    }
  }, [code, testCases, onSolved]);

  const reset = useCallback(() => {
    setCode(starterCode);
    setRunResult(null);
    setSubmitResult(null);
  }, [starterCode]);

  const currentResult = mode === "run" ? runResult : submitResult;

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-1.5">
        <Button
          onClick={handleRun}
          disabled={running}
          variant="outline"
          size="sm"
          className="gap-1.5"
        >
          <Play className="h-3.5 w-3.5" />
          Run tests
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={running}
          size="sm"
          className="gap-1.5"
        >
          <Send className="h-3.5 w-3.5" />
          Submit
        </Button>
        <Button
          onClick={reset}
          variant="ghost"
          size="sm"
          className="ml-auto gap-1.5"
          title="Đưa code về ban đầu"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Editor */}
      <CodeEditor value={code} onChange={setCode} lang="python" minHeight="280px" />

      {/* Results */}
      <TestResults
        result={currentResult}
        running={running}
        loadingRuntime={loadingRuntime}
      />
    </div>
  );
}
