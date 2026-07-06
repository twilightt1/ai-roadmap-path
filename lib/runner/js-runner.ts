import type { RunResult } from "./types";

/**
 * Runner JavaScript native — chạy trực tiếp trong browser qua `new Function`,
 * không cần runtime ngoài. `console` được redirect để gom output.
 *
 * Giới hạn MVP: sync-only (không await top-level). Async = future.
 */
export function runJs(code: string): RunResult {
  const start = performance.now();
  const logs: string[] = [];
  const errors: string[] = [];

  const sandboxedConsole = {
    log: (...args: unknown[]) => logs.push(formatArgs(args)),
    info: (...args: unknown[]) => logs.push(formatArgs(args)),
    warn: (...args: unknown[]) => errors.push(formatArgs(args)),
    error: (...args: unknown[]) => errors.push(formatArgs(args)),
  };

  try {
    const fn = new Function("console", `"use strict";\n${code}`);
    fn(sandboxedConsole);
    return {
      stdout: logs.join("\n"),
      stderr: errors.join("\n"),
      durationMs: Math.round(performance.now() - start),
    };
  } catch (e) {
    return {
      stdout: logs.join("\n"),
      stderr: errors.join("\n"),
      error: (e as Error).message || String(e),
      durationMs: Math.round(performance.now() - start),
    };
  }
}

/** Format args console.log giống browser: object → JSON, string → raw. */
function formatArgs(args: unknown[]): string {
  return args
    .map((a) => {
      if (typeof a === "string") return a;
      if (a === null) return "null";
      if (a === undefined) return "undefined";
      try {
        return JSON.stringify(a, null, 2);
      } catch {
        return String(a);
      }
    })
    .join(" ");
}
