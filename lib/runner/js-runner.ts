import { ExecutionWorkerClient, WorkerExecutionError } from "./execution-worker-client";
import type { RunResult } from "./types";
import type { RunOptions } from "./pyodide-runner";

let client: ExecutionWorkerClient | null = null;

function getClient(): ExecutionWorkerClient {
  if (client) return client;
  client = new ExecutionWorkerClient({
    createWorker: () => new Worker(new URL("./javascript.worker.ts", import.meta.url)),
  });
  return client;
}

/** Execute JavaScript in a worker so learner code cannot access page DOM/storage. */
export async function runJs(code: string, options: RunOptions = {}): Promise<RunResult> {
  try {
    return await getClient().execute(code, {
      signal: options.signal,
      executionTimeoutMs: options.timeoutMs ?? 5_000,
      loadTimeoutMs: 5_000,
      onStatus: options.onStatus,
    });
  } catch (error) {
    if (error instanceof WorkerExecutionError) {
      return { stdout: "", stderr: "", error: error.message };
    }
    return { stdout: "", stderr: "", error: error instanceof Error ? error.message : String(error) };
  }
}
