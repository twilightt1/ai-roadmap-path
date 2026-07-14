import { beforeEach, describe, expect, it, vi } from "vitest";

const runnerMocks = vi.hoisted(() => ({
  runPython: vi.fn(),
  runSql: vi.fn(),
  runJs: vi.fn(),
}));

vi.mock("../feature-flags", () => ({
  featureFlags: { workerExecution: true },
}));
vi.mock("./pyodide-runner", () => ({ runPython: runnerMocks.runPython }));
vi.mock("./sql-runner", () => ({ runSql: runnerMocks.runSql }));
vi.mock("./js-runner", () => ({ runJs: runnerMocks.runJs }));

import { runCode } from "./index";

describe("runCode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runnerMocks.runSql.mockResolvedValue({ stdout: "", stderr: "" });
  });

  it("forwards cancellation, timeout, and status options to the SQL runner", async () => {
    const onStatus = vi.fn();
    const options = {
      signal: new AbortController().signal,
      timeoutMs: 1_234,
      onStatus,
    };

    await runCode("sql", "select 1", options);

    expect(runnerMocks.runSql).toHaveBeenCalledWith("select 1", options);
  });
});
