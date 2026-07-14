import { describe, expect, it } from "vitest";
import { WorkerExecutionError } from "./execution-worker-client";
import { mapJsRunnerError } from "./js-runner";
import { RUNNER_LIMITS, TRUNCATION_MARKER } from "./runner-limits";

describe("mapJsRunnerError", () => {
  it("preserves a worker error kind as errorCode and bounds its message", () => {
    const result = mapJsRunnerError(
      new WorkerExecutionError("x".repeat(RUNNER_LIMITS.errorBytes + 1), "timeout")
    );

    expect(result).toMatchObject({ stdout: "", stderr: "", errorCode: "timeout" });
    expect(result.error?.endsWith(TRUNCATION_MARKER)).toBe(true);
    expect(new TextEncoder().encode(result.error).byteLength).toBeLessThanOrEqual(RUNNER_LIMITS.errorBytes);
  });

  it("bounds an unexpected thrown value without assigning a runner error code", () => {
    const result = mapJsRunnerError("unexpected failure");

    expect(result).toEqual({ stdout: "", stderr: "", error: "unexpected failure" });
  });
});
