import type { Lang, RunResult } from "./types";
import { runPython } from "./pyodide-runner";
import { runSql } from "./sql-runner";
import { runJs } from "./js-runner";

export type { Lang, RunResult } from "./types";
export { LANG_LABELS } from "./types";

/** Kiểm tra ngôn ngữ có được playground hỗ trợ không. */
export function isLangSupported(lang: string): lang is Lang {
  return lang === "python" || lang === "sql" || lang === "javascript";
}

/**
 * Dispatch code đến runner tương ứng.
 * Python/SQL async (load runtime), JS sync.
 */
export async function runCode(lang: Lang, code: string): Promise<RunResult> {
  switch (lang) {
    case "python":
      return runPython(code);
    case "sql":
      return runSql(code);
    case "javascript":
      return runJs(code);
  }
}
