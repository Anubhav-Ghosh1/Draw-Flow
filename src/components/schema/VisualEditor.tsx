"use client";

import { useMemo } from "react";
import type { Column, SchemaModel, Table } from "@/lib/schema/types";
import { parseSchema } from "@/lib/schema/parser";
import { serializeSchema } from "@/lib/schema/serialize";

const COLORS = [
  "indigo",
  "blue",
  "sky",
  "emerald",
  "green",
  "amber",
  "red",
  "rose",
  "purple",
  "pink",
  "slate",
];

const TYPES = [
  "int",
  "bigint",
  "varchar",
  "text",
  "boolean",
  "timestamp",
  "date",
  "json",
  "uuid",
  "float",
  "decimal",
];

type Props = {
  source: string;
  onChange: (next: string) => void;
};

export default function VisualEditor({ source, onChange }: Props) {
  const model = useMemo(() => parseSchema(source), [source]);

  const update = (next: SchemaModel) => onChange(serializeSchema(next));

  const updateTable = (idx: number, patch: Partial<Table>) => {
    const tables = model.tables.map((t, i) => (i === idx ? { ...t, ...patch } : t));
    update({ ...model, tables });
  };

  const updateColumn = (
    tIdx: number,
    cIdx: number,
    patch: Partial<Column>,
  ) => {
    const tables = model.tables.map((t, i) => {
      if (i !== tIdx) return t;
      const columns = t.columns.map((c, j) => (j === cIdx ? { ...c, ...patch } : c));
      return { ...t, columns };
    });
    update({ ...model, tables });
  };

  const addTable = () => {
    const name = uniqueName("new_table", model.tables.map((t) => t.name));
    const tables = [
      ...model.tables,
      {
        name,
        color: "indigo",
        columns: [{ name: "id", type: "int", pk: true }],
      } as Table,
    ];
    update({ ...model, tables });
  };

  const deleteTable = (idx: number) => {
    const removed = model.tables[idx].name;
    const tables = model.tables.filter((_, i) => i !== idx);
    const refs = model.refs.filter(
      (r) => r.from.table !== removed && r.to.table !== removed,
    );
    update({ tables, refs });
  };

  const addColumn = (tIdx: number) => {
    const t = model.tables[tIdx];
    const name = uniqueName("column", t.columns.map((c) => c.name));
    const columns = [...t.columns, { name, type: "varchar" }];
    updateTable(tIdx, { columns });
  };

  const deleteColumn = (tIdx: number, cIdx: number) => {
    const t = model.tables[tIdx];
    const columns = t.columns.filter((_, j) => j !== cIdx);
    updateTable(tIdx, { columns });
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50">
      {model.tables.length === 0 && (
        <div className="rounded-md border border-dashed border-ink/15 p-6 text-center text-sm text-ink/60">
          No tables yet. Click "+ Add table" to start.
        </div>
      )}

      {model.tables.map((t, tIdx) => (
        <div
          key={tIdx}
          className="rounded-md border border-black/10 bg-white shadow-sm"
        >
          <header className="flex flex-wrap items-center gap-1.5 px-3 py-2 border-b border-black/10">
            <input
              value={t.name}
              onChange={(e) => updateTable(tIdx, { name: sanitize(e.target.value) })}
              className="flex-1 min-w-[100px] text-sm font-medium bg-transparent outline-none border-b border-transparent focus:border-accent"
            />
            <select
              value={COLORS.includes(t.color ?? "") ? t.color! : "__custom"}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "__custom") return;
                updateTable(tIdx, { color: v });
              }}
              className="text-xs h-7 rounded border border-black/10 px-1 bg-white"
              title="Color"
            >
              {COLORS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              {!COLORS.includes(t.color ?? "") && t.color && (
                <option value="__custom">{t.color}</option>
              )}
            </select>
            <label
              className="w-7 h-7 rounded border border-black/10 overflow-hidden relative cursor-pointer"
              title="Pick any color"
              style={{
                background:
                  "conic-gradient(from 180deg, #ef4444, #f59e0b, #facc15, #22c55e, #3b82f6, #8b5cf6, #ef4444)",
              }}
            >
              <input
                type="color"
                value={
                  /^#[0-9a-fA-F]{6}$/.test(t.color ?? "") ? t.color! : "#6366f1"
                }
                onChange={(e) => updateTable(tIdx, { color: e.target.value })}
                className="opacity-0 absolute inset-0 cursor-pointer"
              />
            </label>
            <button
              onClick={() => deleteTable(tIdx)}
              className="text-xs text-red-500 hover:text-red-700 px-1"
              title="Delete table"
            >
              ✕
            </button>
          </header>

          <div className="px-3 py-2 space-y-1.5">
            {t.columns.map((c, cIdx) => (
              <ColumnRow
                key={cIdx}
                column={c}
                tables={model.tables}
                currentTable={t}
                onChange={(patch) => updateColumn(tIdx, cIdx, patch)}
                onDelete={() => deleteColumn(tIdx, cIdx)}
              />
            ))}
            <button
              onClick={() => addColumn(tIdx)}
              className="text-xs text-accent hover:underline mt-1"
            >
              + Add column
            </button>
          </div>
        </div>
      ))}

      <button
        onClick={addTable}
        className="w-full rounded-md border border-dashed border-ink/20 py-3 text-sm hover:border-accent hover:text-accent"
      >
        + Add table
      </button>
    </div>
  );
}

function ColumnRow({
  column,
  tables,
  currentTable,
  onChange,
  onDelete,
}: {
  column: Column;
  tables: Table[];
  currentTable: Table;
  onChange: (patch: Partial<Column>) => void;
  onDelete: () => void;
}) {
  const fkValue = column.fk ? `${column.fk.table}.${column.fk.column}` : "";
  const fkOptions: { table: string; column: string }[] = [];
  for (const t of tables) {
    if (t.name === currentTable.name) continue;
    for (const c of t.columns) {
      fkOptions.push({ table: t.name, column: c.name });
    }
  }

  return (
    <div className="rounded-md border border-black/5 bg-slate-50/60 hover:bg-slate-50 p-2 space-y-1.5">
      <div className="flex items-center gap-1.5">
        <input
          value={column.name}
          onChange={(e) => onChange({ name: sanitize(e.target.value) })}
          className="flex-1 min-w-0 text-xs h-7 rounded border border-black/10 px-2 outline-none focus:border-accent bg-white"
          placeholder="name"
        />
        <select
          value={column.type}
          onChange={(e) => onChange({ type: e.target.value })}
          className="w-24 shrink-0 text-xs h-7 rounded border border-black/10 px-1 bg-white"
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
          {!TYPES.includes(column.type) && (
            <option value={column.type}>{column.type}</option>
          )}
        </select>
        <button
          onClick={onDelete}
          className="shrink-0 w-7 h-7 rounded text-xs text-ink/40 hover:text-red-500 hover:bg-red-50"
          title="Delete column"
        >
          ✕
        </button>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <label
          className="flex items-center gap-1 px-1.5 h-6 rounded cursor-pointer select-none hover:bg-white"
          title="Primary key"
        >
          <input
            type="checkbox"
            checked={!!column.pk}
            onChange={(e) => onChange({ pk: e.target.checked })}
            className="accent-amber-500"
          />
          <span>pk</span>
        </label>
        <span className="text-ink/30">→</span>
        <select
          value={fkValue}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) onChange({ fk: undefined });
            else {
              const [tbl, col] = v.split(".");
              onChange({ fk: { table: tbl, column: col } });
            }
          }}
          className="flex-1 min-w-0 text-xs h-7 rounded border border-black/10 px-1 bg-white"
          title="Foreign key reference"
        >
          <option value="">no foreign key</option>
          {fkOptions.map((o) => (
            <option key={`${o.table}.${o.column}`} value={`${o.table}.${o.column}`}>
              {o.table}.{o.column}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function sanitize(s: string) {
  return s.replace(/[^a-zA-Z0-9_]/g, "_");
}

function uniqueName(base: string, taken: string[]): string {
  if (!taken.includes(base)) return base;
  let i = 2;
  while (taken.includes(`${base}_${i}`)) i++;
  return `${base}_${i}`;
}
