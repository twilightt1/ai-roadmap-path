import type { TestCase } from "./challenge-types";

/**
 * Sinh Python source code để chạy code user qua các test cases trong Pyodide.
 *
 * Cấu trúc harness:
 * 1. Code user (định nghĩa `solve` + import)
 * 2. Helper `_compare(actual, expected, mode)` — so sánh theo type
 * 3. Helper `_repr(v)` — repr an toàn cho hiển thị khi fail
 * 4. Loop qua test cases: try/except, gọi solve, so sánh, gom results
 * 5. In marker + JSON để JS parse
 *
 * Output marker: `===CHALLENGE_RESULTS===\n<json>` — JS tìm marker, parse dòng sau.
 */

const COMPARE_HELPER = `
import json as _json
import traceback as _tb

def _compare(actual, expected, mode):
    try:
        if mode == "exact":
            return actual == expected
        elif mode == "approx":
            return abs(float(actual) - float(expected)) < 1e-9
        elif mode == "np_array":
            import numpy as _np
            a = _np.asarray(actual)
            e = _np.asarray(expected)
            return a.shape == e.shape and _np.array_equal(a, e)
        elif mode == "pd_frame":
            import pandas as _pd
            if not (isinstance(actual, _pd.DataFrame) and isinstance(expected, _pd.DataFrame)):
                return False
            return actual.equals(expected)
        elif mode == "pd_series":
            import pandas as _pd
            if not (isinstance(actual, _pd.Series) and isinstance(expected, _pd.Series)):
                return False
            return actual.equals(expected)
    except Exception:
        return False
    return False

def _repr(v):
    try:
        return repr(v)
    except Exception:
        return str(v)
`;

const MARKER = "===CHALLENGE_RESULTS===";

/**
 * Sinh harness Python đầy đủ.
 * @param userCode code user (định nghĩa solve)
 * @param testCases danh sách test case cần chạy
 */
export function generateHarness(
  userCode: string,
  testCases: TestCase[]
): string {
  // Sinh phần chạy test cases — mỗi test case 1 block try/except.
  const testBlocks = testCases
    .map((tc, i) => {
      const name = JSON.stringify(tc.name);
      const call = tc.call;
      const expected = tc.expected;
      const mode = JSON.stringify(tc.compare);
      const hidden = tc.hidden ? "True" : "False";
      return `    # --- Test ${i + 1}: ${tc.name} ---
    try:
        _actual = ${call}
        _expected = ${expected}
        _passed = _compare(_actual, _expected, ${mode})
        _results.append({
            "name": ${name},
            "passed": _passed,
            "actual": _repr(_actual),
            "expected": _repr(_expected),
            "hidden": ${hidden},
        })
    except Exception as _e:
        _results.append({
            "name": ${name},
            "passed": False,
            "error": _tb.format_exc().splitlines()[-1] if _tb.format_exc() else str(_e),
            "expected": ${JSON.stringify(tc.expected)},
            "hidden": ${hidden},
        })`;
    })
    .join("\n");

  return `${userCode}

${COMPARE_HELPER}

# --- Challenge test runner ---
_results = []
${testBlocks}

# Output kết quả qua marker để JS parse
print("${MARKER}")
print(_json.dumps(_results))
`;
}

/** Marker để JS tìm trong stdout. */
export const RESULTS_MARKER = MARKER;

/**
 * Parse stdout từ Pyodide, tách JSON kết quả sau marker.
 * Trả về { results, leftoverStdout } hoặc null nếu không thấy marker.
 */
export function parseHarnessOutput(
  stdout: string
): { results: unknown[]; leftoverStdout: string } | null {
  const idx = stdout.indexOf(MARKER);
  if (idx === -1) return null;
  const before = stdout.substring(0, idx).trim();
  const after = stdout.substring(idx + MARKER.length).trim();
  try {
    const results = JSON.parse(after) as unknown[];
    return { results, leftoverStdout: before };
  } catch {
    return null;
  }
}
