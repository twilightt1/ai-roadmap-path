/** Bảng kết quả SQL — render columns + rows theo style card của site. */
export function ResultTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: unknown[][];
}) {
  if (rows.length === 0) {
    return (
      <p className="px-4 py-3 text-xs font-mono text-muted-foreground">
        0 rows
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs font-mono">
        <thead>
          <tr className="border-b border-border/60 bg-foreground/[0.03]">
            {columns.map((c) => (
              <th
                key={c}
                className="px-3 py-1.5 text-left font-semibold text-foreground/80"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              className="border-b border-border/30 last:border-0 odd:bg-foreground/[0.01]"
            >
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="px-3 py-1.5 align-top text-muted-foreground"
                >
                  {formatCell(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-3 py-1.5 text-[10px] font-mono text-muted-foreground/60">
        {rows.length} row{rows.length === 1 ? "" : "s"}
      </p>
    </div>
  );
}

/** Format cell SQL → chuỗi hiển thị (null, Buffer, object). */
function formatCell(cell: unknown): string {
  if (cell === null) return "NULL";
  if (cell === undefined) return "";
  if (typeof cell === "number" || typeof cell === "boolean") return String(cell);
  if (typeof cell === "string") return cell;
  if (cell instanceof Uint8Array) return `<Blob ${cell.length}B>`;
  try {
    return JSON.stringify(cell);
  } catch {
    return String(cell);
  }
}
