import type { Reference, SchemaModel, Table } from "./types";

/**
 * Render a SchemaModel back to DSL source.
 *
 * Inline FK references (a column's `> other.col`) are emitted on the column
 * line. Standalone refs (refs that don't match a column's `fk` field) are
 * emitted at the bottom as `ref: a.col > b.col`.
 *
 * Comments are not preserved — switching from Visual to Code regenerates the
 * source from scratch.
 */
export function serializeSchema(model: SchemaModel): string {
  const out: string[] = [];
  const inlineRefKeys = new Set<string>();

  for (const t of model.tables) {
    out.push(renderTable(t));
    out.push("");
    for (const c of t.columns) {
      if (c.fk) {
        inlineRefKeys.add(refKey(t.name, c.name, c.fk.table, c.fk.column));
      }
    }
  }

  const standalone = model.refs.filter(
    (r) => !inlineRefKeys.has(refKey(r.from.table, r.from.column, r.to.table, r.to.column)),
  );
  for (const r of standalone) {
    out.push(`ref: ${r.from.table}.${r.from.column} > ${r.to.table}.${r.to.column}`);
  }

  return out.join("\n").replace(/\n+$/, "") + "\n";
}

function renderTable(t: Table): string {
  const head = `table ${t.name}${t.color ? ` [color: ${t.color}]` : ""} {`;
  const lines = [head];
  for (const c of t.columns) {
    const parts = [c.name, c.type || "varchar"];
    if (c.pk) parts.push("pk");
    let line = "  " + parts.join(" ");
    if (c.fk) line += ` > ${c.fk.table}.${c.fk.column}`;
    lines.push(line);
  }
  lines.push("}");
  return lines.join("\n");
}

function refKey(ft: string, fc: string, tt: string, tc: string) {
  return `${ft}.${fc}->${tt}.${tc}`;
}
