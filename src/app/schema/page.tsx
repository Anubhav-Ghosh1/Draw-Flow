"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { nanoid } from "nanoid";
import { clearShareHash, readShareFromHash } from "@/lib/share";
import { saveSchema } from "@/lib/schema/storage";

const SchemaEditor = dynamic(() => import("@/components/schema/SchemaEditor"), {
  ssr: false,
});

export default function SchemaPage() {
  const [docId, setDocId] = useState<string | null>(null);
  const [imported, setImported] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);

    const share = readShareFromHash();
    if (share && share.kind === "schema") {
      const newId = nanoid(8);
      const p = share.payload ?? {};
      saveSchema({
        id: newId,
        name: p.name ? `${p.name} (shared)` : "Shared schema",
        source: typeof p.source === "string" ? p.source : "",
        positions:
          p.positions && typeof p.positions === "object" ? p.positions : {},
        background: p.background,
        updatedAt: Date.now(),
      });
      clearShareHash();
      url.searchParams.set("id", newId);
      window.history.replaceState({}, "", url.toString());
      window.localStorage.setItem("drawflow:lastSchemaId", newId);
      setDocId(newId);
      setImported(true);
      return;
    }

    let id = url.searchParams.get("id");
    if (!id) {
      id = window.localStorage.getItem("drawflow:lastSchemaId") ?? "default";
      url.searchParams.set("id", id);
      window.history.replaceState({}, "", url.toString());
    }
    window.localStorage.setItem("drawflow:lastSchemaId", id);
    setDocId(id);
  }, []);

  if (!docId) return null;
  return (
    <>
      {imported && <ImportedBanner kind="schema" />}
      <SchemaEditor docId={docId} />
    </>
  );
}

function ImportedBanner({ kind }: { kind: string }) {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 4000);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-2 rounded-md shadow">
      Imported a shared {kind} as a local copy — your edits stay yours.
    </div>
  );
}
