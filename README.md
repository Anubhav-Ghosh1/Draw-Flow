# DrawFlow

A hand-drawn whiteboard meets schema-as-code, all rendered in your browser. The server only handles auth — drawings live in `localStorage`.
![Draw-Flow](https://socialify.git.ci/Anubhav-Ghosh1/Draw-Flow/image?description=1&descriptionEditable=&language=1&name=1&owner=1&pattern=Plus&stargazers=1&theme=Dark)
## Features

- **Whiteboard** — sketchy rectangles, ellipses, lines, arrows, free-pen, text and an eraser, with pan/zoom, undo/redo and PNG export. Built on `<canvas>` + [rough.js](https://roughjs.com/).
- **Schema designer** — write tables in a tiny DBML-flavoured DSL on the left, see a live diagram with foreign-key arrows on the right. Drag tables to rearrange. Auto-layout for new tables.
- **No-login mode** — the whole app works without an account. Sign in via Clerk only if you want to keep an organised dashboard of canvases.
- **Server-light** — parsing, rendering, persistence and image export all run client-side. Auth is the only server hop.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Clerk (auth)
- rough.js (sketchy rendering)
- localStorage (persistence)

## Setup

```bash
npm install
cp .env.local.example .env.local
# Open https://dashboard.clerk.com → create an app → copy the publishable + secret keys into .env.local
npm run dev
```

Then open http://localhost:3000.

The app is fully usable without Clerk keys — only the sign-in/sign-up modals and `/dashboard` route require them. If you want to skip auth entirely, leave the env vars blank; the public pages (`/`, `/board`, `/schema`) keep working.

## Routes

- `/` — landing page
- `/board` — sketchy whiteboard canvas (no login required)
- `/schema` — schema designer with live diagram (no login required)
- `/dashboard` — list of saved canvases (login required, protected by Clerk middleware)
- `/sign-in`, `/sign-up` — Clerk-hosted forms

## Schema DSL

```
table users [color: indigo] {
  id int pk
  email varchar
  name varchar
}

table posts {
  id int pk
  user_id int > users.id
  title varchar
}

ref: posts.user_id > users.id
```

- `pk` after the type marks a primary key
- `> other_table.col` after a column declares a foreign-key reference
- standalone `ref:` lines work too
- `[color: indigo|emerald|rose|...]` colours the table header
- `// ...` is a comment

## Keyboard shortcuts (whiteboard)

| key | action |
| --- | --- |
| `v` | select |
| `p` | pen |
| `r` | rectangle |
| `o` | ellipse |
| `l` | line |
| `a` | arrow |
| `t` | text |
| `e` | eraser |
| `h` | pan |
| `⌘Z` / `⌘⇧Z` | undo / redo |
| `Backspace` | delete selected |
| `⌘scroll` | zoom |
| `shift+drag` | pan |

## Monetisation (optional)

Two ad slots are wired up — one on the landing page, one on the dashboard. Ads
are deliberately **not** placed on the canvas pages (they would interfere with
drawing).

To enable, add your Google AdSense credentials to `.env.local`:

```
NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX
NEXT_PUBLIC_ADSENSE_SLOT_LANDING=1234567890
NEXT_PUBLIC_ADSENSE_SLOT_DASHBOARD=0987654321
```

If any of these are missing, ads simply don't render in production. In dev
mode you'll see a dashed placeholder where each slot would appear, so you can
verify positioning without serving real ads.

**Steps:**

1. Sign up at [google.com/adsense](https://www.google.com/adsense/) and have
   your domain approved (this can take a few days).
2. Create two ad units (e.g. "Landing — in-feed" and "Dashboard — banner").
3. Paste the publisher ID (`ca-pub-…`) and the two slot IDs into `.env.local`.
4. Redeploy.

**Privacy:** if you ship to EU/UK users, you'll also need a GDPR consent
manager. AdSense's built-in CMP works, or use a dedicated tool like Cookiebot
or Osano. Without consent management, AdSense may serve non-personalised ads
or no ads in those regions.

## How storage works

- Each board/schema is keyed by a short id and saved to `localStorage` after every edit (250 ms debounce).
- The dashboard reads an index list from `localStorage` to show saved canvases.
- Nothing is uploaded to the server.

## Why "server-light"

Because the canvas is the product, not a backend feature. Rendering on the client means:

- zero round-trips between strokes
- works offline once the page is loaded
- no per-user storage costs

If you later want cloud sync, drop the `BoardDoc` / `SchemaDoc` JSON into any KV store keyed by the Clerk user id.
