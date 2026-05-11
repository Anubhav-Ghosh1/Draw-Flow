export type Column = {
  name: string;
  type: string;
  pk?: boolean;
  fk?: { table: string; column: string };
  note?: string;
};

export type Table = {
  name: string;
  color?: string;
  columns: Column[];
};

export type Reference = {
  from: { table: string; column: string };
  to: { table: string; column: string };
};

export type SchemaModel = {
  tables: Table[];
  refs: Reference[];
};

export type TablePosition = { x: number; y: number };

import type { BackgroundStyle } from "@/lib/backgrounds";

export type SchemaDoc = {
  id: string;
  name: string;
  source: string;
  positions: Record<string, TablePosition>;
  background?: BackgroundStyle;
  updatedAt: number;
};
