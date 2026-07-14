import { featureFlags } from "../feature-flags";
import type { Lang, RunResult } from "./types";
import { runPython } from "./pyodide-runner";
import { runSql } from "./sql-runner";
import { runJs } from "./js-runner";
import type { RunOptions } from "./pyodide-runner";

export type { Lang, RunResult } from "./types";
export type { RunOptions, RunnerStatus } from "./pyodide-runner";
export { LANG_LABELS } from "./types";

/** Kiểm tra ngôn ngữ có được playground hỗ trợ không. */
export function isLangSupported(lang: string): lang is Lang {
  return lang === "python" || lang === "sql" || lang === "javascript";
}

/**
 * Dispatch code đến runner tương ứng.
 * Python/SQL async (load runtime), JS sync.
 */
export const WORKER_EXECUTION_DISABLED_MESSAGE =
  "Code execution is temporarily unavailable while the isolated worker is under maintenance. Please try again later.";

export async function runCode(lang: Lang, code: string, options?: RunOptions): Promise<RunResult> {
  if (!featureFlags.workerExecution) {
    return {
      stdout: "",
      stderr: "",
      error: WORKER_EXECUTION_DISABLED_MESSAGE,
      errorCode: "execution-disabled",
    };
  }

  switch (lang) {
    case "python":
      return runPython(code, options);
    case "sql":
      return runSql(code);
    case "javascript":
      return runJs(code, options);
  }
}
