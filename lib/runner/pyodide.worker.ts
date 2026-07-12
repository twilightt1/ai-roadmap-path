/// <reference lib="webworker" />

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

self.addEventListener("message", async (event: MessageEvent<WorkerExecutionRequest>) => {
  const { requestId, code } = event.data;
  let stdout = "";
  let stderr = "";
  const startedAt = performance.now();

  try {
    post({ type: "loading-runtime", requestId });
    const pyodide = await loadRuntime();
    post({ type: "loading-packages", requestId });
    await pyodide.loadPackagesFromImports(code);
    pyodide.setStdout({ batched: (text) => (stdout += `${text}\n`) });
    pyodide.setStderr({ batched: (text) => (stderr += `${text}\n`) });
    post({ type: "executing", requestId });
    await pyodide.runPythonAsync(code);
    post({
      type: "result",
      requestId,
      result: {
        stdout: stdout.trimEnd(),
        stderr: stderr.trimEnd(),
        durationMs: Math.round(performance.now() - startedAt),
      },
    });
  } catch (error) {
    post({
      type: runtime ? "execution-error" : "runtime-error",
      requestId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});
