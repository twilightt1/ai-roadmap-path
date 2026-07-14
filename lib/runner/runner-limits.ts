export const RUNNER_LIMITS = {
  stdoutBytes: 64 * 1024,
  stderrBytes: 64 * 1024,
  errorBytes: 16 * 1024,
  sqlRows: 1_000,
  sqlColumns: 100,
  sqlCellBytes: 8 * 1024,
} as const;

export const TRUNCATION_MARKER = "\n… output truncated";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** Bounds text by UTF-8 bytes, preserving complete code points and reserving room for a marker. */
export function truncateUtf8(value: string, maxBytes: number): string {
  const bytes = encoder.encode(value);
  if (bytes.byteLength <= maxBytes) return value;

  const markerBytes = encoder.encode(TRUNCATION_MARKER);
  const contentBudget = Math.max(0, maxBytes - markerBytes.byteLength);
  let end = contentBudget;
  while (end > 0 && (bytes[end] & 0b1100_0000) === 0b1000_0000) end -= 1;

  return `${decoder.decode(bytes.subarray(0, end))}${TRUNCATION_MARKER}`;
}

function serializeSqlCell(value: unknown): string {
  if (typeof value === "string") return value;
  const serialized = JSON.stringify(value);
  return serialized === undefined ? String(value) : serialized;
}

export function limitSqlResult(columns: string[], rows: unknown[][]) {
  const limitedColumns = columns.slice(0, RUNNER_LIMITS.sqlColumns);
  return {
    columns: limitedColumns,
    rows: rows.slice(0, RUNNER_LIMITS.sqlRows).map((row) =>
      row.slice(0, limitedColumns.length).map((cell) => truncateUtf8(serializeSqlCell(cell), RUNNER_LIMITS.sqlCellBytes))
    ),
  };
}
