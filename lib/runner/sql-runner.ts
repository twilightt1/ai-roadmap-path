import type { RunResult } from "./types";

/**
 * Runner SQL qua sql.js (SQLite WebAssembly) — chạy hoàn toàn trong browser.
 * SQLite WASM (~1MB) lazy-load từ CDN lần đầu, cache singleton ở module scope.
 * Mỗi run tạo DB mới (in-memory) để tránh leak state giữa các lần chạy.
 */

// sql.js types lỏng — CDN script gắn initSqlite3 vào window.
type SqlJsStatic = {
  Database: new (data?: null) => Database;
};
type Database = {
  exec: (sql: string) => void;
  prepare: (sql: string) => Statement;
  close: () => void;
};
type Statement = {
  step: () => boolean;
  getColumnNames: () => string[];
  getValues: () => unknown[];
  free: () => void;
};

declare global {
  interface Window {
    initSqlJs?: (opts: { locateFile: (file: string) => string }) => Promise<SqlJsStatic>;
  }
}

const SQLJS_CDN = "https://cdn.jsdelivr.net/npm/sql.js@1.12.0/dist/";

let sqlJsPromise: Promise<SqlJsStatic> | null = null;

function injectScriptOnce(): Promise<void> {
  if (window.initSqlJs) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(
      "sqljs-script"
    ) as HTMLScriptElement | null;
    if (existing) {
      if (window.initSqlJs) return resolve();
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Không tải được sql.js từ CDN"))
      );
      return;
    }
    const script = document.createElement("script");
    script.id = "sqljs-script";
    script.src = `${SQLJS_CDN}sql-wasm.js`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Không tải được sql.js từ CDN"));
    document.head.appendChild(script);
  });
}

export async function loadSqlOnce(): Promise<SqlJsStatic> {
  if (sqlJsPromise) return sqlJsPromise;
  sqlJsPromise = (async () => {
    await injectScriptOnce();
    if (!window.initSqlJs) {
      throw new Error("initSqlJs không khả dụng sau khi inject script");
    }
    return window.initSqlJs({ locateFile: (file) => `${SQLJS_CDN}${file}` });
  })();
  return sqlJsPromise;
}

/**
 * Tách SQL thành các statement (theo dấu chấm phẩy) — đơn giản cho MVP,
 * xử lý được多数 trường hợp. Không xử lý string literal chứa ';' hoàn hảo.
 */
function splitStatements(sql: string): string[] {
  return sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Chạy code SQL trên DB in-memory mới. Gom kết quả SELECT thành columns+rows.
 */
export async function runSql(code: string): Promise<RunResult> {
  const start = performance.now();
  let stdout = "";
  let stderr = "";
  let lastColumns: string[] | undefined;
  let lastRows: unknown[][] | undefined;
  let lastError: string | undefined;

  let SQL: SqlJsStatic;
  try {
    SQL = await loadSqlOnce();
  } catch (e) {
    return {
      stdout: "",
      stderr: "",
      error: `Không load được SQLite runtime: ${(e as Error).message}`,
      durationMs: Math.round(performance.now() - start),
    };
  }

  const db = new SQL.Database(null);
  try {
    const statements = splitStatements(code);
    for (const stmt of statements) {
      // Thử prepare để xem có kết quả (SELECT) không; exec cho non-SELECT.
      const prepared = db.prepare(stmt);
      try {
        const columns = prepared.getColumnNames();
        if (columns.length > 0) {
          // SELECT — gom rows
          const rows: unknown[][] = [];
          while (prepared.step()) rows.push(prepared.getValues());
          // Chỉ giữ kết quả của SELECT cuối (giống psql behavior)
          lastColumns = columns;
          lastRows = rows;
          if (rows.length > 0) {
            stdout += `${rows.length} row${rows.length === 1 ? "" : "s"}\n`;
          } else {
            stdout += "0 rows\n";
          }
        } else {
          // Non-SELECT (CREATE/INSERT/UPDATE/DELETE) — exec để apply
          prepared.free();
          db.exec(stmt);
        }
      } finally {
        prepared.free();
      }
    }
  } catch (e) {
    lastError = (e as Error).message || String(e);
    stderr += lastError;
  } finally {
    db.close();
  }

  return {
    stdout: stdout.trimEnd(),
    stderr: stderr.trimEnd(),
    error: lastError,
    columns: lastColumns,
    rows: lastRows,
    durationMs: Math.round(performance.now() - start),
  };
}
