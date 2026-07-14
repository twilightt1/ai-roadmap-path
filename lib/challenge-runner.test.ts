import { beforeEach, describe, expect, it, vi } from "vitest";

const { runCode } = vi.hoisted(() => ({ runCode: vi.fn() }));

vi.mock("./runner", () => ({ runCode }));

import { runExample, submitChallenge } from "./challenge-runner";
import type { TestCase } from "./challenge-types";

const testCase: TestCase = {
  name: "Example",
  call: "solve(1)",
  expected: "1",
  compare: "exact",
};

describe("challenge runner options", () => {
  beforeEach(() => {
    runCode.mockReset();
    runCode.mockResolvedValue({
      stdout: '__CHALLENGE_RESULTS__{"results": []}',
      stderr: "",
    });
  });

  it("forwards run options to visible and submit executions", async () => {
    const controller = new AbortController();
    const options = { signal: controller.signal, timeoutMs: 1_000 };

    await runExample("def solve(x): return x", [testCase], options);
    await submitChallenge("def solve(x): return x", [testCase], options);

    expect(runCode).toHaveBeenNthCalledWith(
      1,
      "python",
      expect.any(String),
      options
    );
    expect(runCode).toHaveBeenNthCalledWith(
      2,
      "python",
      expect.any(String),
      options
    );
  });
});
