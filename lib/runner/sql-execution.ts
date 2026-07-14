import { RUNNER_LIMITS, limitSqlResult, truncateUtf8 } from "./runner-limits";
import type { RunResult } from "./types";

export type SqlJsStatement = {
  step: () => boolean;
  getColumnNames: () => string[];
  get: () => unknown[];
  free: () => void;
};

export type SqlJsDatabase = {
  exec: (sql: string) => void;
  prepare: (sql: string) => SqlJsStatement;
  close: () => void;
};

export type SqlJsStatic = {
  Database: new (data?: null) => SqlJsDatabase;
};

export class UnsupportedSqlSyntaxError extends Error {
  constructor() {
    super("Unsupported SQL syntax: triggers and stored procedures are not supported");
  }
}

type SplitState = "normal" | "single-quote" | "double-quote" | "line-comment" | "block-comment";

function unsupportedSqlSyntax(sql: string): boolean {
  let state: SplitState = "normal";
  let normalized = "";

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1];

    if (state === "normal") {
      if (char === "'") state = "single-quote";
      else if (char === '"') state = "double-quote";
      else if (char === "-" && next === "-") {
        state = "line-comment";
        index += 1;
        normalized += " ";
      } else if (char === "/" && next === "*") {
        state = "block-comment";
        index += 1;
        normalized += " ";
      } else normalized += char;
    } else if (state === "single-quote") {
      if (char === "'" && next === "'") index += 1;
      else if (char === "'") state = "normal";
    } else if (state === "double-quote") {
      if (char === '"' && next === '"') index += 1;
      else if (char === '"') state = "normal";
    } else if (state === "line-comment") {
      if (char === "\n" || char === "\r") {
        state = "normal";
        normalized += " ";
      }
    } else if (char === "*" && next === "/") {
      state = "normal";
      index += 1;
      normalized += " ";
    }
  }

  return /\bcreate\s+(?:(?:temp|temporary)\s+)?(?:trigger|procedure)\b/i.test(normalized);
}

/** Splits only top-level statements and preserves SQL text, including comments. */
export function splitSqlStatements(sql: string): string[] {
  if (unsupportedSqlSyntax(sql)) throw new UnsupportedSqlSyntaxError();

  const statements: string[] = [];
  let state: SplitState = "normal";
  let start = 0;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1];

    if (state === "normal") {
      if (char === "'") state = "single-quote";
      else if (char === '"') state = "double-quote";
      else if (char === "-" && next === "-") {
        state = "line-comment";
        index += 1;
      } else if (char === "/" && next === "*") {
        state = "block-comment";
        index += 1;
      } else if (char === ";") {
        const statement = sql.slice(start, index).trim();
        if (statement) statements.push(statement);
        start = index + 1;
      }
    } else if (state === "single-quote") {
      if (char === "'" && next === "'") index += 1;
      else if (char === "'") state = "normal";
    } else if (state === "double-quote") {
      if (char === '"' && next === '"') index += 1;
      else if (char === '"') state = "normal";
    } else if (state === "line-comment") {
      if (char === "\n" || char === "\r") state = "normal";
    } else if (char === "*" && next === "/") {
      state = "normal";
      index += 1;
    }
  }

  const statement = sql.slice(start).trim();
  if (statement) statements.push(statement);
  return statements;
}

/** Executes SQL against a fresh database and guarantees statement/database cleanup. */
export function executeSql(SQL: SqlJsStatic, code: string): RunResult {
  const startedAt = performance.now();
  let stdout = "";
  let lastColumns: string[] | undefined;
  let lastRows: unknown[][] | undefined;
  let lastError: string | undefined;
  const db = new SQL.Database(null);

  try {
    for (const sql of splitSqlStatements(code)) {
      const statement = db.prepare(sql);
      try {
        const columns = statement.getColumnNames();
        if (columns.length === 0) {
          db.exec(sql);
          continue;
        }

        const limitedColumns = columns.slice(0, RUNNER_LIMITS.sqlColumns);
        const rows: unknown[][] = [];
        while (rows.length < RUNNER_LIMITS.sqlRows && statement.step()) {
          rows.push(limitSqlResult(limitedColumns, [statement.get()]).rows[0]);
        }
        lastColumns = limitedColumns;
        lastRows = rows;
        stdout += `${rows.length} row${rows.length === 1 ? "" : "s"}\n`;
      } finally {
        statement.free();
      }
    }
  } catch (error) {
    lastError = truncateUtf8(
      error instanceof Error ? error.message : String(error),
      RUNNER_LIMITS.errorBytes
    );
  } finally {
    db.close();
  }

  return {
    stdout: truncateUtf8(stdout.trimEnd(), RUNNER_LIMITS.stdoutBytes),
    stderr: lastError ?? "",
    error: lastError,
    columns: lastColumns,
    rows: lastRows,
    durationMs: Math.round(performance.now() - startedAt),
  };
}
