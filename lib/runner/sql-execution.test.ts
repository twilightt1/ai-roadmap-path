import { describe, expect, it, vi } from "vitest";
import { RUNNER_LIMITS, TRUNCATION_MARKER } from "./runner-limits";
import { executeSql, splitSqlStatements, type SqlJsStatic } from "./sql-execution";

function createSql(rows: unknown[][] = [["value"]], columns = ["value"]) {
  const statement = {
    step: vi.fn<() => boolean>(),
    getColumnNames: vi.fn(() => columns),
    get: vi.fn(() => rows.shift() ?? []),
    free: vi.fn(),
  };
  statement.step.mockImplementation(() => rows.length > 0);

  const db = {
    exec: vi.fn(),
    prepare: vi.fn(() => statement),
    close: vi.fn(),
  };

  const SQL: SqlJsStatic = {
    Database: class {
      constructor() {
        return db;
      }
    } as unknown as SqlJsStatic["Database"],
  };

  return { SQL, db, statement };
}

describe("splitSqlStatements", () => {
  it("keeps semicolons in quoted strings and comments within a statement", () => {
    expect(
      splitSqlStatements("select ';' as value; -- ;\nselect \";\" as value; /* ; */ select 2;")
    ).toEqual(["select ';' as value", '-- ;\nselect ";" as value', "/* ; */ select 2"]);
  });

  it("rejects trigger and procedure syntax instead of splitting their bodies", () => {
    expect(() => splitSqlStatements("CREATE TRIGGER audit AFTER INSERT ON users BEGIN SELECT 1; END;")).toThrow(
      /unsupported SQL syntax/i
    );
    expect(() => splitSqlStatements("CREATE PROCEDURE demo() BEGIN SELECT 1; END;")).toThrow(
      /unsupported SQL syntax/i
    );
  });
});

describe("executeSql", () => {
  it("frees every prepared statement exactly once and closes its database once", () => {
    const { SQL, db, statement } = createSql([], []);

    executeSql(SQL, "create table items (id integer);");

    expect(statement.free).toHaveBeenCalledOnce();
    expect(db.close).toHaveBeenCalledOnce();
    expect(db.exec).toHaveBeenCalledWith("create table items (id integer)");
  });

  it("caps SQL rows, columns, and serialized cell output using shared limits", () => {
    const columns = Array.from({ length: RUNNER_LIMITS.sqlColumns + 1 }, (_, index) => `column_${index}`);
    const rows = Array.from({ length: RUNNER_LIMITS.sqlRows + 1 }, (_, index) => [
      "x".repeat(RUNNER_LIMITS.sqlCellBytes + 1),
      ...Array.from({ length: RUNNER_LIMITS.sqlColumns }, () => index),
    ]);
    const { SQL, statement } = createSql(rows, columns);

    const result = executeSql(SQL, "select value;");

    expect(result.rows).toHaveLength(RUNNER_LIMITS.sqlRows);
    expect(result.rows?.[0]).toHaveLength(RUNNER_LIMITS.sqlColumns);
    expect(statement.step).toHaveBeenCalledTimes(RUNNER_LIMITS.sqlRows);
    expect(result.rows?.[0]?.[0]).toMatchObject({});
    expect(result.rows?.[0]?.[0]).toBeTypeOf("string");
    expect((result.rows?.[0]?.[0] as string).endsWith(TRUNCATION_MARKER)).toBe(true);
    expect(new TextEncoder().encode(result.rows?.[0]?.[0] as string).byteLength).toBeLessThanOrEqual(
      RUNNER_LIMITS.sqlCellBytes
    );
  });
});
