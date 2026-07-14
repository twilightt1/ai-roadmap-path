import { ExecutionWorkerClient, WorkerExecutionError } from "./execution-worker-client";
import { RUNNER_LIMITS, truncateUtf8 } from "./runner-limits";
import type { RunResult } from "./types";
import type { RunOptions } from "./pyodide-runner";

export const SQL_RUNNER_DEFAULTS = {
  loadTimeoutMs: 5_000,
  executionTimeoutMs: 5_000,
} as const;

let client: ExecutionWorkerClient | null = null;

function getClient(): ExecutionWorkerClient {
  if (client) return client;
  client = new ExecutionWorkerClient({
    createWorker: () => new Worker(new URL("./sql.worker.ts", import.meta.url)),
  });
  return client;
}

export function mapSqlRunnerError(error: unknown): RunResult {
  const message = truncateUtf8(error instanceof Error ? error.message : String(error), RUNNER_LIMITS.errorBytes);
  if (error instanceof WorkerExecutionError) {
    return { stdout: "", stderr: "", error: message, errorCode: error.kind };
  }
  return { stdout: "", stderr: "", error: message };
}

/** Executes SQL in a worker-backed, fresh in-memory sql.js database. */
export async function runSql(code: string, options: RunOptions = {}): Promise<RunResult> {
  try {
    return await getClient().execute(code, {
      signal: options.signal,
      loadTimeoutMs: SQL_RUNNER_DEFAULTS.loadTimeoutMs,
      executionTimeoutMs: options.timeoutMs ?? SQL_RUNNER_DEFAULTS.executionTimeoutMs,
      onStatus: options.onStatus,
    });
  } catch (error) {
    return mapSqlRunnerError(error);
  }
}
