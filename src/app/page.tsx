import Link from "next/link";
import AdSlot from "@/components/AdSlot";
import Logo from "@/components/Logo";

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <section className="text-center">
        <div className="flex justify-center mb-6">
          <Logo size={64} className="rounded-xl shadow-sm" />
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
          Sketch & ship system designs.
        </h1>
        <p className="mt-5 text-lg text-ink/70 max-w-2xl mx-auto">
          A hand-drawn whiteboard meets a database schema designer.
          Everything renders in your browser — no servers, no setup.
          Sign in to save your work, or jump in anonymously.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/board"
            className="px-5 py-3 rounded-md bg-ink text-white hover:opacity-90"
          >
            Open whiteboard
          </Link>
          <Link
            href="/schema"
            className="px-5 py-3 rounded-md border border-ink/15 hover:bg-black/5"
          >
            Try schema designer
          </Link>
        </div>
        <p className="mt-3 text-xs text-ink/50">
          No account required — start drawing instantly.
        </p>
      </section>

      <section className="mt-20 grid md:grid-cols-2 gap-6">
        <FeatureCard
          title="Hand-drawn whiteboard"
          subtitle="Excalidraw-style"
          desc="Sketchy rectangles, ellipses, arrows, free-pen, text and more. Pan, zoom, undo, export to PNG."
          href="/board"
        />
        <FeatureCard
          title="Schema-as-code"
          subtitle="Eraser.io-style"
          desc="Write tables in a tiny DBML-like syntax. Watch the diagram update live, with foreign-key arrows auto-routed."
          href="/schema"
        />
      </section>

      <AdSlot location="landing" className="mt-16 max-w-3xl mx-auto" />

      <section className="mt-20 grid md:grid-cols-3 gap-6 text-sm text-ink/70">
        <Bullet
          title="Server-light"
          body="Rendering, persistence and exports all run client-side. The server only handles auth."
        />
        <Bullet
          title="Local-first"
          body="Your drawings live in localStorage. They survive refreshes; they don't leave your browser unless you choose to share."
        />
        <Bullet
          title="Free to try"
          body="The whole tool works without an account. Sign up only if you want to organise your saved canvases."
        />
      </section>
    </div>
  );
}

function FeatureCard({
  title,
  subtitle,
  desc,
  href,
}: {
  title: string;
  subtitle: string;
  desc: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-xl border border-ink/10 bg-white p-6 hover:border-ink/30 hover:shadow-sm transition"
    >
      <div className="text-xs uppercase tracking-wider text-accent">
        {subtitle}
      </div>
      <div className="mt-1 text-2xl font-semibold">{title}</div>
      <p className="mt-3 text-ink/70">{desc}</p>
      <div className="mt-4 text-sm text-accent group-hover:underline">
        Open →
      </div>
    </Link>
  );
}

function Bullet({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <div className="font-semibold text-ink">{title}</div>
      <div className="mt-1">{body}</div>
    </div>
  );
}
