/// <reference lib="webworker" />

import type { WorkerExecutionMessage, WorkerExecutionRequest } from "./worker-protocol";

function formatArgs(args: unknown[]): string {
  return args
    .map((value) => {
      if (typeof value === "string") return value;
      if (value === null) return "null";
      if (value === undefined) return "undefined";
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return String(value);
      }
    })
    .join(" ");
}

self.addEventListener("message", (event: MessageEvent<WorkerExecutionRequest>) => {
  const { requestId, code } = event.data;
  const startedAt = performance.now();
  const stdout: string[] = [];
  const stderr: string[] = [];

  try {
    self.postMessage({ type: "executing", requestId } satisfies WorkerExecutionMessage);
    const workerConsole = {
      log: (...args: unknown[]) => stdout.push(formatArgs(args)),
      info: (...args: unknown[]) => stdout.push(formatArgs(args)),
      warn: (...args: unknown[]) => stderr.push(formatArgs(args)),
      error: (...args: unknown[]) => stderr.push(formatArgs(args)),
    };
    const execute = new Function("console", `"use strict";\n${code}`);
    execute(workerConsole);
    self.postMessage({
      type: "result",
      requestId,
      result: {
        stdout: stdout.join("\n"),
        stderr: stderr.join("\n"),
        durationMs: Math.round(performance.now() - startedAt),
      },
    } satisfies WorkerExecutionMessage);
  } catch (error) {
    self.postMessage({
      type: "execution-error",
      requestId,
      message: error instanceof Error ? error.message : String(error),
    } satisfies WorkerExecutionMessage);
  }
});
