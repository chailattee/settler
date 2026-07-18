import type { AgentEvent } from "@/lib/events";
import type { PurchaseRecord } from "@/lib/types";

/** Client-side data layer for the Settlers backend. Pure `fetch`, safe to import
 *  from client components (no server-only deps). Endpoints and shapes are
 *  documented in API_INTEGRATION.md. */

/** Row returned by GET /api/matches (snake_case). Mirrors StoredMatch in
 *  lib/store.ts. */
export interface StoredMatch {
  id: string;
  user_id: string;
  brand: string;
  item?: string;
  source: "courtlistener" | "web";
  title: string;
  url: string;
  court: string;
  active: boolean;
  confidence: number;
  claim_url: string | null;
  summary: string;
  payout_low: number;
  payout_high: number;
  deadline: string | null;
  purchase_ids: string[];
  why_qualified: string[];
  uncertainties: string[];
}

/** Row returned by GET /api/purchases. PurchaseRecord + brand + user_id. */
export type StoredPurchase = PurchaseRecord & {
  brand: string;
  user_id: string;
};

/** Normalized shape the swipe deck / match card renders, bridging the backend's
 *  docket-based match to the UI. Curated fields (payout, category, deadline)
 *  are optional because the class-action pipeline doesn't produce them. */
export interface MatchView {
  id: string;
  title: string;
  defendant: string;
  subtitle?: string;
  summary?: string;
  category?: string;
  confidence: number;
  /** Estimated individual payout range, when known (0 = unknown). */
  payoutLow?: number;
  payoutHigh?: number;
  /** Where the user goes to file — enriched claim site or the case docket. */
  claimUrl?: string;
  deadline?: string;
  isMock?: boolean;
  active?: boolean;
  whyQualified: string[];
  uncertainties: string[];
  evidence: PurchaseRecord[];
}

/** Map a persisted backend match + the user's purchases into a MatchView. */
export function toMatchView(
  m: StoredMatch,
  purchases: PurchaseRecord[],
): MatchView {
  const byId = new Map(purchases.map((p) => [p.id, p]));
  const evidence = (m.purchase_ids ?? [])
    .map((id) => byId.get(id))
    .filter((p): p is PurchaseRecord => Boolean(p));

  const hasPayout = m.payout_high > 0;

  return {
    id: m.id,
    title: m.title,
    defendant: m.brand,
    subtitle: m.court,
    summary: m.summary || undefined,
    confidence: m.confidence,
    payoutLow: hasPayout ? m.payout_low : undefined,
    payoutHigh: hasPayout ? m.payout_high : undefined,
    claimUrl: m.claim_url ?? m.url,
    deadline: m.deadline ?? undefined,
    active: m.active,
    whyQualified: m.why_qualified ?? [],
    uncertainties: m.uncertainties ?? [],
    evidence,
  };
}

/** Representative payout for totals — midpoint of the range, else 0. */
export function matchPayoutMid(v: MatchView): number {
  if (v.payoutHigh == null) return 0;
  return Math.round(((v.payoutLow ?? 0) + v.payoutHigh) / 2);
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return (await res.json()) as T;
}

export async function fetchMatches(): Promise<StoredMatch[]> {
  const { matches } = await getJson<{ matches: StoredMatch[] }>("/api/matches");
  return matches ?? [];
}

export async function fetchPurchases(): Promise<StoredPurchase[]> {
  const { purchases } = await getJson<{ purchases: StoredPurchase[] }>(
    "/api/purchases",
  );
  return purchases ?? [];
}

export interface WorkflowBody {
  demo?: boolean;
  maxEmails?: number;
  minConfidence?: number;
}

/** POST /api/workflow and stream AgentEvents to `onEvent`. Resolves when the
 *  stream closes. Pass an AbortSignal to cancel (e.g. on unmount). */
export async function runWorkflow(
  onEvent: (event: AgentEvent) => void,
  body: WorkflowBody = {},
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch("/api/workflow", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    throw new Error(`/api/workflow -> ${res.status}`);
  }

  const reader = res.body.getReader();
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
      if (!line) continue;
      try {
        onEvent(JSON.parse(line.slice(6)) as AgentEvent);
      } catch {
        // ignore malformed frame
      }
    }
  }
}
