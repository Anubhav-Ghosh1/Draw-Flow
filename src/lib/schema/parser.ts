import type { Column, Reference, SchemaModel, Table } from "./types";

/**
 * Tiny DBML-flavoured parser.
 *
 *   table users [color: blue] {
 *     id int pk
 *     email varchar
 *     name varchar
 *   }
 *
 *   table posts {
 *     id int pk
 *     user_id int > users.id
 *     title varchar
 *   }
 *
 *   ref: posts.user_id > users.id
 */
export function parseSchema(src: string): SchemaModel {
  const tables: Table[] = [];
  const refs: Reference[] = [];

  const lines = src.split("\n");
  let i = 0;
  let current: Table | null = null;

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.replace(/\/\/.*$/, "").trim();
    i++;
    if (!line) continue;

    if (current) {
      if (line === "}") {
        tables.push(current);
        current = null;
        continue;
      }
      const col = parseColumn(line, current.name);
      if (col) {
        current.columns.push(col.column);
        if (col.ref) refs.push(col.ref);
      }
      continue;
    }

    // outside a table
    const tableMatch = line.match(
      /^table\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:\[([^\]]*)\])?\s*\{?$/i,
    );
    if (tableMatch) {
      const name = tableMatch[1];
      const attrs = tableMatch[2] ?? "";
      const color = /color\s*:\s*([#a-zA-Z0-9]+)/.exec(attrs)?.[1];
      current = { name, color, columns: [] };
      // brace might be on the next line
      if (!line.endsWith("{")) {
        // skip blank lines until we find {
        while (i < lines.length && lines[i].trim() !== "{") i++;
        if (i < lines.length) i++;
      }
      continue;
    }

    const refMatch = line.match(
      /^ref\s*:\s*([a-zA-Z_][\w]*)\.([a-zA-Z_][\w]*)\s*[->]+\s*([a-zA-Z_][\w]*)\.([a-zA-Z_][\w]*)/i,
    );
    if (refMatch) {
      refs.push({
        from: { table: refMatch[1], column: refMatch[2] },
        to: { table: refMatch[3], column: refMatch[4] },
      });
      continue;
    }

    const inlineRef = line.match(
      /^([a-zA-Z_][\w]*)\.([a-zA-Z_][\w]*)\s*[->]+\s*([a-zA-Z_][\w]*)\.([a-zA-Z_][\w]*)/,
    );
    if (inlineRef) {
      refs.push({
        from: { table: inlineRef[1], column: inlineRef[2] },
        to: { table: inlineRef[3], column: inlineRef[4] },
      });
    }
  }
  if (current) tables.push(current);
  return { tables, refs };
}

function parseColumn(
  line: string,
  tableName: string,
): { column: Column; ref?: Reference } | null {
  // name type [pk] [> other.col]
  // also allow: name type, ref: > other.col
  const refSplit = line.split(/\s*>\s*/);
  const left = refSplit[0].trim();
  const right = refSplit[1]?.trim();

  const parts = left.split(/\s+/).filter(Boolean);
  if (parts.length < 1) return null;
  const name = parts[0];
  const type = parts[1] ?? "varchar";
  const tail = parts.slice(2).join(" ").toLowerCase();
  const pk = /\bpk\b/.test(tail) || /\bprimary\b/.test(tail);

  let ref: Reference | undefined;
  let fk: Column["fk"];
  if (right) {
    const m = right.match(/^([a-zA-Z_][\w]*)\.([a-zA-Z_][\w]*)/);
    if (m) {
      fk = { table: m[1], column: m[2] };
      ref = {
        from: { table: tableName, column: name },
        to: { table: m[1], column: m[2] },
      };
    }
  }

  return {
    column: { name, type, pk, fk },
    ref,
  };
}

export const DEFAULT_SCHEMA = `// Eraser-flavoured schema. Edit on the left, see the diagram on the right.

table users [color: indigo] {
  id int pk
  email varchar
  name varchar
  created_at timestamp
}

table posts [color: emerald] {
  id int pk
  author_id int > users.id
  title varchar
  body text
  published_at timestamp
}

table comments [color: amber] {
  id int pk
  post_id int > posts.id
  author_id int > users.id
  body text
}
`;
