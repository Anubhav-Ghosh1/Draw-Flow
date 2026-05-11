"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { nanoid } from "nanoid";
import { listBoards, deleteBoard, type BoardIndexEntry } from "@/lib/drawing/storage";
import {
  listSchemas,
  deleteSchema,
  type SchemaIndexEntry,
} from "@/lib/schema/storage";
import AdSlot from "@/components/AdSlot";

export default function DashboardPage() {
  const [boards, setBoards] = useState<BoardIndexEntry[]>([]);
  const [schemas, setSchemas] = useState<SchemaIndexEntry[]>([]);

  const refresh = () => {
    setBoards(listBoards());
    setSchemas(listSchemas());
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Your canvases</h1>
        <div className="flex gap-2">
          <Link
            href={`/board?id=${nanoid(8)}`}
            className="px-3 py-2 rounded-md bg-ink text-white text-sm hover:opacity-90"
          >
            + New board
          </Link>
          <Link
            href={`/schema?id=${nanoid(8)}`}
            className="px-3 py-2 rounded-md border border-ink/15 text-sm hover:bg-black/5"
          >
            + New schema
          </Link>
        </div>
      </header>

      <Section
        title="Boards"
        empty="No boards yet — start drawing!"
        items={boards}
        hrefBase="/board"
        onDelete={(id) => {
          deleteBoard(id);
          refresh();
        }}
      />

      <AdSlot location="dashboard" banner className="my-8" />

      <Section
        title="Schemas"
        empty="No schemas yet."
        items={schemas}
        hrefBase="/schema"
        onDelete={(id) => {
          deleteSchema(id);
          refresh();
        }}
      />

      <p className="mt-12 text-xs text-ink/50">
        Canvases are stored in your browser's localStorage. Clearing site data
        will erase them.
      </p>
    </div>
  );
}

function Section({
  title,
  empty,
  items,
  hrefBase,
  onDelete,
}: {
  title: string;
  empty: string;
  items: { id: string; name: string; updatedAt: number }[];
  hrefBase: string;
  onDelete: (id: string) => void;
}) {
  return (
    <section>
      <h2 className="text-sm font-medium text-ink/70 mb-3">{title}</h2>
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-ink/15 p-8 text-center text-ink/50 text-sm">
          {empty}
        </div>
      ) : (
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((it) => (
            <li
              key={it.id}
              className="group rounded-lg border border-ink/10 bg-white p-4 hover:border-ink/30 transition flex items-center justify-between"
            >
              <Link
                href={`${hrefBase}?id=${it.id}`}
                className="flex-1 min-w-0"
              >
                <div className="font-medium truncate">{it.name || "Untitled"}</div>
                <div className="text-xs text-ink/50 mt-0.5">
                  {new Date(it.updatedAt).toLocaleString()}
                </div>
              </Link>
              <button
                onClick={() => {
                  if (confirm(`Delete "${it.name || "Untitled"}"?`)) onDelete(it.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-xs text-red-500 hover:text-red-700 ml-2"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
