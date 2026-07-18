# Settlers API — Integration Guide

Backend for the Gmail → class-action workflow. Everything is built on `fetch`
(no SDKs), so it adds **zero npm dependencies**.

**Flow:** Gmail receipts → LLM extracts purchases → for each product, find
class-action lawsuits from **both CourtListener and web search (Brave +
Firecrawl)** in parallel → LLM classifies relevance → merge/dedup → **list** the
matched lawsuits. (Claim filing is a later flow.)

---

## Required env (`.env.local`)

```bash
# LLM (OpenRouter, Haiku 4.5 by default)
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=anthropic/claude-haiku-4.5   # optional; this is the default

# Data (Supabase Postgres via Drizzle). Optional — falls back to in-memory if unset.
# Supabase → Project Settings → Database → Connection string → "Session pooler" (URI).
DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres

# Class-action lookup (CourtListener). Optional token = higher rate limits.
COURTLISTENER_API_TOKEN=...

# Web-search enrichment. Optional — enrichment no-ops if unset.
BRAVE_API_KEY=...
FIRECRAWL_API_KEY=...

# Gmail (real scan). Optional — without these, use demo mode.
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

**Database schema:** defined in `lib/db/schema.ts` (Drizzle). Apply it with
`npm run db:push` (needs `DATABASE_URL`). RLS is enabled with no policies — the
backend connects as the `postgres` role (bypasses RLS) and the UI goes through
these API routes, so the publishable key never touches the tables. If you skip
`DATABASE_URL` entirely, the store falls back to an in-process cache and
everything still works for a single session.

---

## Endpoints

### `POST /api/workflow` — streaming agent run (SSE)

Runs the whole pipeline and streams live events for the UI activity feed.

Request body (all optional):

```jsonc
{
  "demo": false,        // true (or no Gmail connection) => canned purchases
  "maxEmails": 100,     // Gmail scan cap (default 100)
  "minConfidence": 0.5  // threshold to keep a match (both sources)
}
```

- Signed in with Google **and** `demo !== true` → real Gmail scan.
- `demo: true` **or** no Google token → demo purchases (still hits CourtListener
  + the LLM live, so the class-action half is fully real).

Response: `text/event-stream`. Each event is `data: <json>\n\n`.

### `GET /api/purchases` → `{ purchases: PurchaseRecord[] }`

Purchases scanned for the current user (or `demo`).

### `GET /api/matches` → `{ matches: StoredMatch[] }`

Class-action matches found for the current user. Feeds the swipe deck.

### `POST /api/claims` `{ matchId }` → `{ claim, requiredFields }`

Prepares a claim for a matched lawsuit: discovers where to act and autofills it.
Never submits. The `claim` has `submitType` (`claim` = open settlement form,
`interest` = law-firm sign-up for an ongoing case, `watch` = nothing yet),
`submitUrl`, `status`, `instructions`, `deadline`, `enteredData` (`{label,value,
source}[]` — the autofilled fields), and `missing` (labels the user must supply).

### `GET /api/claims` → `{ claims: ClaimRow[] }`

The user's queued claims (feeds the claims tab).

### `GET /api/profile` · `POST /api/profile` `{ name?, email?, phone?, address? }`

The autofill identity used to fill claim forms. GET falls back to the session
name/email when no profile is saved.

---

## Streaming event types

From `lib/events.ts` (`AgentEvent`). Render these as the live feed:

| `type`           | Payload                                                                                          | Meaning                                     |
| ---------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| `status`         | `{ step, message }`                                                                               | Phase banner (`gmail`, `extract`, `auth`)   |
| `gmail_scanning` | `{ scanned, total }`                                                                              | Progress bar while reading emails           |
| `purchase_found` | `{ purchase }` (`PurchaseRecord & { brand }`)                                                     | A parsed purchase — add a card              |
| `brand_lookup`   | `{ brand, message }`                                                                              | "Searching CourtListener + web for …"       |
| `match`          | `{ brand, source, title, url, claimUrl, active, stage, claimPotential, confidence, summary, whyQualified, uncertainties }` | A claimable class-action lawsuit ✅         |
| `done`           | `{ purchases, matches }`                                                                          | Run complete                                |
| `error`          | `{ message }`                                                                                     | Something failed — stream then closes       |

`source` is `"courtlistener"` (a court docket) or `"web"` (a settlement/news page
found via Brave). Web-sourced matches usually carry a `claimUrl` and payout
estimate; CourtListener matches carry `court` and the docket `url`.

Matches are ranked by **`claimPotential`** (0..1 — likelihood the buyer can claim
a current/future settlement), then `confidence`. **`stage`** is one of
`settlement_open` (claims open now), `settlement_upcoming`, `ongoing` (active
suit, no settlement yet), `resolved` (closed), or `unknown` — use it to badge
"Claim open" vs "watch". Resolved/closed cases are kept but sink to the bottom.

---

## Consuming the stream (client)

`EventSource` can't POST, so use `fetch` + a `ReadableStream` reader:

```ts
async function runWorkflow(onEvent: (e: AgentEvent) => void, body = { demo: true }) {
  const res = await fetch("/api/workflow", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by a blank line.
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const line = frame.split("\n").find((l) => l.startsWith("data: "));
      if (line) onEvent(JSON.parse(line.slice(6)) as AgentEvent);
    }
  }
}
```

Type is exported: `import type { AgentEvent } from "@/lib/events"`.

### Example: drive the whole demo

```ts
runWorkflow((e) => {
  if (e.type === "purchase_found") addPurchaseCard(e.purchase);
  if (e.type === "match") addLawsuitCard(e); // e.source: "courtlistener" | "web"
  if (e.type === "done") console.log(`Found ${e.matches} lawsuits`);
});
```

---

## Data shapes

- `PurchaseRecord`, `MatchResult`, `Settlement` — shared UI types in
  `lib/types.ts`.
- `ClassActionCase` (`lib/courtlistener.ts`) — normalized CourtListener docket
  (`caseName`, `court`, `dateFiled`, `dateTerminated`, `active`, `url`).
- `ClassActionMatch` (`lib/classaction.ts`) — a purchase-to-lawsuit match from
  either source: `{ source, title, url, court, active, claimUrl, summary,
  payoutLow, payoutHigh, deadline, confidence, whyQualified[], uncertainties[] }`.
- `StoredMatch` (`lib/store.ts`) — the persisted/`GET /api/matches` row (snake_case).

---

## Module map (`lib/`)

| File               | Responsibility                                             |
| ------------------ | ---------------------------------------------------------- |
| `env.ts`           | Central env access                                         |
| `openrouter.ts`    | LLM chat + JSON-schema structured output                   |
| `db/schema.ts`     | Drizzle schema (source of truth; `npm run db:push`)        |
| `db/index.ts`      | Drizzle client over Supabase Postgres (postgres.js)        |
| `gmail.ts`         | Google token (via better-auth) + receipt scan (Gmail REST) |
| `extract.ts`       | Receipt email → `PurchaseRecord[]` (LLM)                   |
| `courtlistener.ts` | Brand → active class-action dockets                        |
| `classaction.ts`   | CourtListener discovery + LLM relevance classification     |
| `websearch.ts`     | Brave + Firecrawl → web-discovered lawsuits (same shape)   |
| `workflow.ts`      | Orchestration: dual-source discovery + dedup, streams events |
| `store.ts`         | Persist purchases/matches (Supabase or in-memory)          |
| `events.ts`        | `AgentEvent` union + SSE `Response` helper                 |
| `demo.ts`          | Canned purchases for the no-Gmail demo path                |

---

## Verifying

```bash
npm install         # (deps were being reinstalled while this was authored)
npm run dev
curl -N -X POST localhost:3000/api/workflow -H 'content-type: application/json' -d '{"demo":true}'
```

You should see a live SSE stream: purchases → `brand_lookup` → `case_found` →
`match` for brands with active dockets (Fitbit/Apple/Samsung in the demo set).
