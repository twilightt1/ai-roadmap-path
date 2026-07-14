import { describe, expect, it } from "vitest";
import {
  RUNNER_LIMITS,
  limitSqlResult,
  truncateUtf8,
  TRUNCATION_MARKER,
} from "./runner-limits";

const encoder = new TextEncoder();

describe("runner limits", () => {
  it("truncates UTF-8 output without splitting a code point", () => {
    const value = `${"é".repeat(RUNNER_LIMITS.stdoutBytes)} tail`;
    const truncated = truncateUtf8(value, RUNNER_LIMITS.stdoutBytes);

    expect(encoder.encode(truncated).byteLength).toBeLessThanOrEqual(RUNNER_LIMITS.stdoutBytes);
    expect(truncated.endsWith(TRUNCATION_MARKER)).toBe(true);
    expect(truncated).not.toContain("�");
  });

  it("leaves output at each configured text limit intact", () => {
    expect(truncateUtf8("a".repeat(RUNNER_LIMITS.stdoutBytes), RUNNER_LIMITS.stdoutBytes)).toHaveLength(
      RUNNER_LIMITS.stdoutBytes
    );
    expect(truncateUtf8("b".repeat(RUNNER_LIMITS.stderrBytes), RUNNER_LIMITS.stderrBytes)).toHaveLength(
      RUNNER_LIMITS.stderrBytes
    );
    expect(truncateUtf8("c".repeat(RUNNER_LIMITS.errorBytes), RUNNER_LIMITS.errorBytes)).toHaveLength(
      RUNNER_LIMITS.errorBytes
    );
  });

  it("caps SQL rows, columns, and serialized cells", () => {
    const result = limitSqlResult(
      Array.from({ length: RUNNER_LIMITS.sqlColumns + 1 }, (_, index) => `column-${index}`),
      Array.from({ length: RUNNER_LIMITS.sqlRows + 1 }, () => ["x".repeat(RUNNER_LIMITS.sqlCellBytes + 1)])
    );

    expect(result.columns).toHaveLength(RUNNER_LIMITS.sqlColumns);
    expect(result.rows).toHaveLength(RUNNER_LIMITS.sqlRows);
    expect(result.rows[0]).toHaveLength(1);
    expect(encoder.encode(result.rows[0][0]).byteLength).toBeLessThanOrEqual(RUNNER_LIMITS.sqlCellBytes);
    expect(result.rows[0][0].endsWith(TRUNCATION_MARKER)).toBe(true);
  });

  it("serializes non-string SQL cells before bounding them", () => {
    const { rows } = limitSqlResult(["payload"], [[{ value: true }]]);

    expect(rows).toEqual([[JSON.stringify({ value: true })]]);
  });
});
