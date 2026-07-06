/** Ngôn ngữ playground hỗ trợ. */
export type Lang = "python" | "sql" | "javascript";

/** Nhãn hiển thị cho mỗi ngôn ngữ. */
export const LANG_LABELS: Record<Lang, string> = {
  python: "Python",
  sql: "SQL",
  javascript: "JavaScript",
};

/**
 * Kết quả chạy code.
 * - `stdout`/`stderr`: text gom từ runtime (print, console.log, warning…).
 * - `columns`/`rows`: chỉ cho SQL — kết quả SELECT dạng bảng.
 * - `error`: traceback/lỗi (nếu có) — tách khỏi stderr để UI tô đỏ riêng.
 * - `durationMs`: thời gian chạy thực (không kể load runtime).
 */
export type RunResult = {
  stdout: string;
  stderr: string;
  error?: string;
  columns?: string[];
  rows?: unknown[][];
  durationMs?: number;
};
