/// <reference lib="webworker" />

import { executeSql, type SqlJsStatic } from "./sql-execution";
import { RUNNER_LIMITS, truncateUtf8 } from "./runner-limits";
import type { WorkerExecutionMessage, WorkerExecutionRequest } from "./worker-protocol";

const SQLJS_CDN = "https://cdn.jsdelivr.net/npm/sql.js@1.12.0/dist/";

declare const initSqlJs: (options: { locateFile: (file: string) => string }) => Promise<SqlJsStatic>;

let runtime: Promise<SqlJsStatic> | null = null;

function loadRuntime(): Promise<SqlJsStatic> {
  if (runtime) return runtime;
  importScripts(`${SQLJS_CDN}sql-wasm.js`);
  runtime = initSqlJs({ locateFile: (file) => `${SQLJS_CDN}${file}` });
  return runtime;
}

function post(message: WorkerExecutionMessage) {
  self.postMessage(message);
}

self.addEventListener("message", async (event: MessageEvent<WorkerExecutionRequest>) => {
  const { requestId, code } = event.data;
  try {
    post({ type: "loading-runtime", requestId });
    const SQL = await loadRuntime();
    post({ type: "executing", requestId });
    post({ type: "result", requestId, result: executeSql(SQL, code) });
  } catch (error) {
    post({
      type: runtime ? "execution-error" : "runtime-error",
      requestId,
      message: truncateUtf8(error instanceof Error ? error.message : String(error), RUNNER_LIMITS.errorBytes),
    });
  }
});
