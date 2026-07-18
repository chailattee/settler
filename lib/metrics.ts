import type { StoredPurchase, StoredMatch } from "@/lib/api";

/** Metrics computed purely from documented API data (GET /api/purchases and
 *  /api/matches). No payout/recovery estimates — that logic isn't defined yet,
 *  so we only surface signals the backend actually provides. */
export interface Metrics {
  /** Purchases the scan extracted. */
  purchaseCount: number;
  /** Total the user spent across those purchases (PurchaseRecord.amount). */
  totalSpend: number;
  /** Distinct brands seen across purchases. */
  brandCount: number;
  /** Lawsuits/matches surfaced by the research agents. */
  lawsuitCount: number;
  /** Matches whose case is still active. */
  activeCount: number;
  /** Matches sourced from a CourtListener docket. */
  courtCount: number;
  /** Matches sourced from web search (Brave/Firecrawl). */
  webCount: number;
  /** Mean classifier confidence across matches (0..1); 0 when none. */
  avgConfidence: number;
  /** Brands ranked by purchase count, most first. */
  topBrands: { brand: string; count: number }[];
}

function brandOf(p: StoredPurchase): string {
  return (p.brand || p.merchant || "Unknown").trim();
}

export function computeMetrics(
  purchases: StoredPurchase[],
  matches: StoredMatch[],
): Metrics {
  const totalSpend = purchases.reduce((sum, p) => sum + (p.amount || 0), 0);

  const counts = new Map<string, number>();
  for (const p of purchases) {
    const b = brandOf(p);
    counts.set(b, (counts.get(b) ?? 0) + 1);
  }
  const topBrands = [...counts.entries()]
    .map(([brand, count]) => ({ brand, count }))
    .sort((a, b) => b.count - a.count);

  const activeCount = matches.filter((m) => m.active).length;
  const courtCount = matches.filter((m) => m.source === "courtlistener").length;
  const webCount = matches.filter((m) => m.source === "web").length;
  const avgConfidence =
    matches.length === 0
      ? 0
      : matches.reduce((s, m) => s + (m.confidence || 0), 0) / matches.length;

  return {
    purchaseCount: purchases.length,
    totalSpend,
    brandCount: counts.size,
    lawsuitCount: matches.length,
    activeCount,
    courtCount,
    webCount,
    avgConfidence,
    topBrands,
  };
}
