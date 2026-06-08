// Generic result table primitive. Phase 3's ResultView composes this with carrier-specific columns.
import type { ReactNode } from "react";
import { cn } from "../lib/utils";

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
}

export interface ResultTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  emptyState?: ReactNode;
}

export function ResultTable<T>({ columns, rows, emptyState }: ResultTableProps<T>) {
  if (rows.length === 0 && emptyState) {
    return <div className="p-8">{emptyState}</div>;
  }

  return (
    <div className="overflow-x-auto rounded border border-border-subtle">
      <table className="w-full font-mono text-xs">
        <thead className="bg-surface-2 text-text-muted">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={cn("px-3 py-2 text-left font-medium", c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={(row as { company?: string }).company ?? i}
              className="border-t border-border-subtle hover:bg-surface-2"
            >
              {columns.map((c) => (
                <td key={c.key} className={cn("px-3 py-2 align-top", c.className)}>
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
