import { describe, expect, it } from "vitest";
import { WorkerExecutionError } from "./execution-worker-client";
import { mapPyodideRunnerError } from "./pyodide-runner";
import { RUNNER_LIMITS, TRUNCATION_MARKER } from "./runner-limits";

describe("mapPyodideRunnerError", () => {
  it("preserves a runtime-load worker error code and bounds its message", () => {
    const result = mapPyodideRunnerError(
      new WorkerExecutionError("x".repeat(RUNNER_LIMITS.errorBytes + 1), "runtime-load")
    );

    expect(result).toMatchObject({ stdout: "", stderr: "", errorCode: "runtime-load" });
    expect(result.error?.endsWith(TRUNCATION_MARKER)).toBe(true);
    expect(new TextEncoder().encode(result.error).byteLength).toBeLessThanOrEqual(RUNNER_LIMITS.errorBytes);
  });

  it("preserves an execution worker error code", () => {
    expect(mapPyodideRunnerError(new WorkerExecutionError("Python failed", "execution"))).toEqual({
      stdout: "",
      stderr: "",
      error: "Python failed",
      errorCode: "execution",
    });
  });

  it("bounds an unexpected thrown value without assigning a runner error code", () => {
    expect(mapPyodideRunnerError("unexpected failure")).toEqual({
      stdout: "",
      stderr: "",
      error: "unexpected failure",
    });
  });
});
