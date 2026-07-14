import { ExecutionWorkerClient, WorkerExecutionError } from "./execution-worker-client";
import { RUNNER_LIMITS, truncateUtf8 } from "./runner-limits";
import type { RunResult } from "./types";

export type RunnerStatus = "loading-runtime" | "loading-packages" | "executing";

export type RunOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
  onStatus?: (status: RunnerStatus) => void;
};

let client: ExecutionWorkerClient | null = null;

function getClient(): ExecutionWorkerClient {
  if (client) return client;
  client = new ExecutionWorkerClient({
    createWorker: () => new Worker(new URL("./pyodide.worker.ts", import.meta.url)),
  });
  return client;
}

export function mapPyodideRunnerError(error: unknown): RunResult {
  const message = truncateUtf8(error instanceof Error ? error.message : String(error), RUNNER_LIMITS.errorBytes);
  if (error instanceof WorkerExecutionError) {
    return { stdout: "", stderr: "", error: message, errorCode: error.kind };
  }
  return { stdout: "", stderr: "", error: message };
}

/**
 * Run Python in a dedicated worker. Terminating the worker handles timeout and
 * cancellation without freezing the application page.
 */
export async function runPython(code: string, options: RunOptions = {}): Promise<RunResult> {
  try {
    return await getClient().execute(code, {
      signal: options.signal,
      executionTimeoutMs: options.timeoutMs ?? 10_000,
      loadTimeoutMs: 60_000,
      onStatus: options.onStatus,
    });
  } catch (error) {
    return mapPyodideRunnerError(error);
  }
}
