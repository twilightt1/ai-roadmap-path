/// <reference lib="webworker" />

import { RUNNER_LIMITS, TRUNCATION_MARKER, truncateUtf8 } from "./runner-limits";
import type { WorkerExecutionMessage, WorkerExecutionRequest } from "./worker-protocol";

const PYODIDE_VERSION = "0.26.4";
const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

type Pyodide = {
  runPythonAsync(code: string): Promise<unknown>;
  loadPackagesFromImports(code: string): Promise<void>;
  setStdout(options: { batched: (text: string) => void }): void;
  setStderr(options: { batched: (text: string) => void }): void;
};

declare const loadPyodide: (options: { indexURL: string }) => Promise<Pyodide>;

let runtime: Promise<Pyodide> | null = null;

function post(message: WorkerExecutionMessage) {
  self.postMessage(message);
}

function loadRuntime() {
  if (runtime) return runtime;
  importScripts(`${PYODIDE_CDN}pyodide.js`);
  runtime = loadPyodide({ indexURL: PYODIDE_CDN });
  return runtime;
}

function createBoundedCollector(maxBytes: number) {
  let value = "";
  let truncated = false;

  return {
    append(text: string) {
      if (truncated) return;
      value = truncateUtf8(`${value}${text}\n`, maxBytes);
      truncated = value.endsWith(TRUNCATION_MARKER);
    },
    value() {
      return value.trimEnd();
    },
  };
}

function errorMessage(error: unknown) {
  return truncateUtf8(error instanceof Error ? error.message : String(error), RUNNER_LIMITS.errorBytes);
}

self.addEventListener("message", async (event: MessageEvent<WorkerExecutionRequest>) => {
  const { requestId, code } = event.data;
  const stdout = createBoundedCollector(RUNNER_LIMITS.stdoutBytes);
  const stderr = createBoundedCollector(RUNNER_LIMITS.stderrBytes);
  const startedAt = performance.now();
  let isExecuting = false;

  try {
    post({ type: "loading-runtime", requestId });
    const pyodide = await loadRuntime();
    post({ type: "loading-packages", requestId });
    await pyodide.loadPackagesFromImports(code);
    pyodide.setStdout({ batched: (text) => stdout.append(text) });
    pyodide.setStderr({ batched: (text) => stderr.append(text) });
    isExecuting = true;
    post({ type: "executing", requestId });
    await pyodide.runPythonAsync(code);
    post({
      type: "result",
      requestId,
      result: {
        stdout: stdout.value(),
        stderr: stderr.value(),
        durationMs: Math.round(performance.now() - startedAt),
      },
    });
  } catch (error) {
    post({
      type: isExecuting ? "execution-error" : "runtime-error",
      requestId,
      message: errorMessage(error),
    });
  }
});
