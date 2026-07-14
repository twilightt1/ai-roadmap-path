"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { featureFlags } from "@/lib/feature-flags";
import { WORKER_EXECUTION_DISABLED_MESSAGE } from "@/lib/runner";
import { runTests } from "@/lib/challenge-runner";
import type { ChallengeRunResult } from "@/lib/challenge-types";
import type { CodeExerciseStep } from "@/lib/practice-ladder-types";
import { TestResults } from "@/components/challenge/test-results";

const CodeEditor = dynamic(() => import("@/components/playground/code-editor").then((module) => module.CodeEditor), { ssr: false });

export function CodeExercise({
  step,
  title,
  onPassed,
}: {
  step: CodeExerciseStep;
  title: string;
  onPassed?: () => void;
}) {
  const [code, setCode] = useState(step.starterCode);
  const [result, setResult] = useState<ChallengeRunResult | null>(null);
  const [running, setRunning] = useState(false);

  async function run() {
    if (!featureFlags.workerExecution) {
      setResult({ results: [], allPassed: false, stdout: "", stderr: "", error: WORKER_EXECUTION_DISABLED_MESSAGE });
      return;
    }
    setRunning(true);
    try {
      const next = await runTests(code, step.testCases);
      setResult(next);
      if (next.allPassed) onPassed?.();
    } catch (error) {
      setResult({ results: [], allPassed: false, stdout: "", stderr: "", error: error instanceof Error ? error.message : String(error) });
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="rounded-lg border border-border/60 bg-card/30 p-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{step.instructions}</p>
      <div className="mt-3"><CodeEditor value={code} onChange={setCode} lang="python" minHeight="180px" /></div>
      <div className="mt-2 flex items-center gap-2"><Button onClick={run} disabled={running || !featureFlags.workerExecution} title={!featureFlags.workerExecution ? WORKER_EXECUTION_DISABLED_MESSAGE : undefined} size="sm"><Play className="mr-1.5 h-3.5 w-3.5" />Chạy bài tập</Button><span className="text-xs text-muted-foreground">{!featureFlags.workerExecution ? WORKER_EXECUTION_DISABLED_MESSAGE : step.feedback}</span></div>
      <div className="mt-3"><TestResults result={result} running={running} loadingRuntime={false} /></div>
    </section>
  );
}
