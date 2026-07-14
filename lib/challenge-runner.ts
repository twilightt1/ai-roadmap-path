import { runCode, type RunOptions } from "./runner";
import { generateHarness, parseHarnessOutput } from "./challenge-harness";
import type {
  TestCase,
  TestCaseResult,
  ChallengeRunResult,
} from "./challenge-types";

/**
 * Chạy code user qua test cases trong Pyodide (reuse runner đã build).
 *
 * 1. Sinh harness Python (user code + compare helper + test loop)
 * 2. runCode("python", harness) — Pyodide auto-load numpy/pandas/sklearn khi thấy import
 * 3. Parse JSON kết quả từ marker trong stdout
 * 4. Trả ChallengeRunResult cho UI
 */

/** Chạy một subset test cases (dùng cho "Run tests" — chỉ visible). */
export async function runTests(
  userCode: string,
  testCases: TestCase[],
  options?: RunOptions
): Promise<ChallengeRunResult> {
  const start = performance.now();
  const harness = generateHarness(userCode, testCases);

  let runResult;
  try {
    runResult = await runCode("python", harness, options);
  } catch (e) {
    return {
      results: [],
      allPassed: false,
      stdout: "",
      stderr: "",
      error: (e as Error).message || String(e),
      durationMs: Math.round(performance.now() - start),
    };
  }

  // Nếu user code có syntax error, Pyodide báo qua error field.
  const parsed = parseHarnessOutput(runResult.stdout);

  if (!parsed) {
    // Không thấy marker — có thể user code crash trước khi chạy tests,
    // hoặc syntax error. Báo lỗi chung.
    return {
      results: [],
      allPassed: false,
      stdout: runResult.stdout,
      stderr: runResult.stderr,
      error: runResult.error || "Không chạy được code (syntax error hoặc crash)",
      durationMs: runResult.durationMs,
    };
  }

  const results = parsed.results as TestCaseResult[];
  const allPassed =
    results.length > 0 && results.every((r) => r?.passed === true);

  return {
    results,
    allPassed,
    stdout: parsed.leftoverStdout,
    stderr: runResult.stderr,
    error: runResult.error,
    durationMs: runResult.durationMs,
  };
}

/**
 * Submit — chạy TẤT cả test cases (visible + hidden).
 * Dùng cho nút "Submit" chính thức + ghi progress.
 */
export async function submitChallenge(
  userCode: string,
  testCases: TestCase[],
  options?: RunOptions
): Promise<ChallengeRunResult> {
  return runTests(userCode, testCases, options);
}

/**
 * Run example — chỉ chạy visible test cases (hidden=false).
 * Dùng cho nút "Run tests" (debug nhanh, không lộ hidden test).
 */
export async function runExample(
  userCode: string,
  testCases: TestCase[],
  options?: RunOptions
): Promise<ChallengeRunResult> {
  const visibleTests = testCases.filter((t) => !t.hidden);
  if (visibleTests.length === 0) {
    return {
      results: [],
      allPassed: false,
      stdout: "",
      stderr: "",
      error: "Không có test case visible để chạy",
    };
  }
  return runTests(userCode, visibleTests, options);
}
