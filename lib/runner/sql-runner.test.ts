import { describe, expect, it } from "vitest";
import { mapSqlRunnerError, SQL_RUNNER_DEFAULTS } from "./sql-runner";
import { WorkerExecutionError } from "./execution-worker-client";

describe("SQL runner adapter", () => {
  it("uses five-second runtime-load and execution defaults", () => {
    expect(SQL_RUNNER_DEFAULTS).toEqual({ loadTimeoutMs: 5_000, executionTimeoutMs: 5_000 });
  });

  it("preserves typed worker errors", () => {
    expect(mapSqlRunnerError(new WorkerExecutionError("SQLite timed out", "timeout"))).toEqual({
      stdout: "",
      stderr: "",
      error: "SQLite timed out",
      errorCode: "timeout",
    });
  });
});
