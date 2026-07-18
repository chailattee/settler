# Claim App — Class Action Claim Finder & Auto-Filer

## Context

Hackathon project (empty repo `ramp2026`). Billions in class-action settlement money goes unclaimed because people don't know they're eligible and filing is tedious. Build an app that: discovers open settlements, extracts eligibility rules with AI, matches them against the user's uploaded receipts/statements, lets the user verify matches via a Tinder-style swipe deck, then uses browser automation (OpenAI computer use) to fill the official claim form — **always stopping at the certification/attest page for human review** (claims are signed under penalty of perjury; the human must attest and submit).

Decisions made with user: **Next.js web app · uploaded files as evidence · swipe-deck verification UX · curated real settlements + one fake settlement with a local mock claim site so the full filing flow can be demoed live and safely.**

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind; framer-motion for the swipe deck
- `openai` SDK, model `gpt-5.1` (Responses API); structured outputs via `client.responses.parse` + `zodTextFormat` (`openai/helpers/zod`); receipts parsed with `input_image` / `input_file` content parts (base64 image + PDF)
- Playwright (chromium) executing OpenAI **computer use** actions (`computer-use-preview` model, `computer_use_preview` tool) — loop: screenshot → model action → Playwright performs it → `computer_call_output`
- Storage: flat JSON via a small `lib/store.ts` (no DB — hackathon)
- `OPENAI_API_KEY` in `.env.local`

## Architecture / files

```
app/
  page.tsx                 # landing: upload evidence + "find my money"
  matches/page.tsx         # swipe deck
  claims/page.tsx          # claim queue + live filing viewer + approval gate
  mock-claim/page.tsx      # FAKE "DemoCorp Data Breach" settlement claim site (3-step form → certification page → submit)
  api/upload/route.ts      # file upload → GPT vision parse → purchase records
  api/match/route.ts       # run matching engine
  api/claim/route.ts       # start filing agent; GET = poll status/screenshots
data/
  settlements/*.json       # ~8 curated real settlements + democorp.json (points at /mock-claim)
  store.json               # purchases, matches, claim runs
lib/
  openai.ts                # client + model const
  schemas.ts               # zod: EligibilityRules, PurchaseRecord, MatchResult
  store.ts                 # read/write data/store.json
  extract.ts               # settlement page text → EligibilityRules (structured output)
  parse-evidence.ts        # PDF/image/CSV → PurchaseRecord[] (vision)
  match.ts                 # purchases × rules → MatchResult[] (confidence, evidence refs, uncertainties, payout est.)
  claim-agent.ts           # Playwright + computer-use loop, hard-stop before attest/submit
scripts/
  seed.ts                  # fetch curated settlement pages → extract.ts → data/settlements/*.json
  demo-data/               # sample receipts/statements for the demo
```

## Build order

1. **Scaffold** — `create-next-app`, Tailwind, deps, `lib/openai.ts`, `lib/schemas.ts`, `lib/store.ts`.
2. **Settlements** — hand-pick ~8 real open settlements (classaction.org / topclassactions); `scripts/seed.ts` runs `extract.ts` on each page's text → structured rules JSON (class period, qualifying purchase, proof required, payout, deadline, states, claim URL). Author `democorp.json` + the `/mock-claim` site (clean 3-step form: contact info → purchase details → **certification page with attest checkbox + submit**).
3. **Evidence upload** — landing page dropzone → `api/upload` → `parse-evidence.ts` (image/PDF → vendor, date, amount, items) → store.
4. **Matching** — `match.ts`: one model call per settlement with rules + purchase records → `{eligible, confidence, whyQualified, evidence:[recordIds], uncertainties[], estPayout}`. Only surface matches with evidence or plausible self-attestation.
5. **Swipe deck** — framer-motion cards: settlement name, est. payout, "why you qualify" bullets, evidence thumbnail, uncertainty flags. Right = queue claim, left = skip.
6. **Filing agent** — `claim-agent.ts`: launch Playwright, navigate to claim URL, computer-use loop (screenshot ↔ actions) filling verified info. System prompt hard rule: **never check an attestation box or click submit/certify — stop and report when the certification step is reached.** Screenshots saved per step; `claims` page polls and renders a live filmstrip.
7. **Approval gate** — at stop, UI shows final screenshot + entered data summary; button relaunches headed browser at the paused page so the user attests + submits themselves. Demo submits only on the fake DemoCorp site.
8. **Polish** — payout total counter ("$X found"), deadlines, empty states; seed demo receipts that match DemoCorp + 2–3 real settlements.

## Guardrails

- Agent never attests/submits — human-in-the-loop is a product feature, not just a demo choice.
- Live claim filing demoed against the local mock site; real settlements stop at review with a link out.
- Match card shows uncertainties explicitly (e.g. "receipt shows purchase but not the qualifying model number").

## Verification

- `npm run dev`; run `scripts/seed.ts`; spot-check 2 extracted rules JSONs against source pages.
- E2E demo path: upload `scripts/demo-data` receipts → confirm parsed records → matches include DemoCorp with evidence → swipe right → watch agent fill `/mock-claim` → verify it **stops at certification** → approve → manually submit on mock site.
- Negative test: receipt that matches no settlement produces no false match.
