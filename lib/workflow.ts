import { listReceiptIds, getMessage } from "@/lib/gmail";
import { extractFromEmail } from "@/lib/extract";
import { courtListenerMatches, type ClassActionMatch } from "@/lib/classaction";
import { webMatches, braveConfigured } from "@/lib/websearch";
import { savePurchases, saveMatches, type StoredPurchase } from "@/lib/store";
import type { Emit } from "@/lib/events";
import type { PurchaseRecord } from "@/lib/types";

/** The end-to-end pipeline, emitting streaming events at every step:
 *
 *    Gmail scan -> receipt extraction -> per-product class-action lookup from
 *    BOTH CourtListener and web search -> merge/dedup -> list.
 *
 *  The route wraps this in an SSE stream; the emitted events drive the UI's
 *  live activity feed. Persistence happens as data is produced. (Filing is a
 *  later flow — this stops at listing the lawsuits.) */

type BrandPurchase = PurchaseRecord & { brand: string };

export interface WorkflowOpts {
  userId: string;
  token: string;
  maxEmails?: number;
  minConfidence?: number;
}

export async function runWorkflow(emit: Emit, opts: WorkflowOpts): Promise<void> {
  const { userId, token, maxEmails = 30, minConfidence = 0.5 } = opts;

  // 1. Gmail scan --------------------------------------------------------
  emit({ type: "status", step: "gmail", message: "Scanning your inbox for receipts…" });
  const ids = await listReceiptIds(token, maxEmails);
  emit({ type: "status", step: "gmail", message: `Found ${ids.length} receipt-like emails.` });

  // 2. Extraction --------------------------------------------------------
  const purchases: BrandPurchase[] = [];
  for (let i = 0; i < ids.length; i++) {
    const msg = await getMessage(token, ids[i]);
    emit({ type: "gmail_scanning", scanned: i + 1, total: ids.length });
    if (!msg) continue;
    let found: BrandPurchase[] = [];
    try {
      found = await extractFromEmail(msg);
    } catch {
      continue;
    }
    for (const p of found) {
      purchases.push(p);
      emit({ type: "purchase_found", purchase: p });
    }
  }

  emit({
    type: "status",
    step: "extract",
    message: `Extracted ${purchases.length} purchases from ${ids.length} emails.`,
  });

  await matchPurchases(emit, { userId, purchases, minConfidence });
}

/** Group purchases by normalised brand. */
function groupByBrand(purchases: BrandPurchase[]): Map<string, BrandPurchase[]> {
  const byBrand = new Map<string, BrandPurchase[]>();
  for (const p of purchases) {
    const key = (p.brand || p.merchant).toLowerCase();
    if (!key) continue;
    byBrand.set(key, [...(byBrand.get(key) ?? []), p]);
  }
  return byBrand;
}

/** Drop near-duplicate lawsuits (e.g. the same case found via both sources).
 *  CourtListener is authoritative, so it wins ties. */
function dedupe(matches: ClassActionMatch[]): ClassActionMatch[] {
  const norm = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(/\s+/).filter(Boolean).slice(0, 5).join(" ");
  const seen = new Map<string, ClassActionMatch>();
  for (const m of matches) {
    const key = `${m.brand.toLowerCase()}::${norm(m.title)}`;
    const existing = seen.get(key);
    if (!existing || (existing.source === "web" && m.source === "courtlistener")) {
      seen.set(key, m);
    }
  }
  return [...seen.values()].sort((a, b) => b.confidence - a.confidence);
}

/** The per-product class-action lookup half of the pipeline (CourtListener +
 *  web). Reused by the real Gmail workflow and the demo route. */
export async function matchPurchases(
  emit: Emit,
  opts: { userId: string; purchases: BrandPurchase[]; minConfidence?: number },
): Promise<void> {
  const { userId, purchases, minConfidence = 0.5 } = opts;

  await savePurchases(
    userId,
    purchases.map((p) => ({ ...p, user_id: userId }) as StoredPurchase),
  );

  const all: ClassActionMatch[] = [];

  for (const [, group] of groupByBrand(purchases)) {
    const brand = group[0].brand || group[0].merchant;
    const item = group.map((p) => p.item).join(", ");
    const purchaseIds = group.map((p) => p.id);

    const sources = braveConfigured() ? "CourtListener + web" : "CourtListener";
    emit({ type: "brand_lookup", brand, message: `Searching ${sources} for “${item}”…` });

    // Run both discovery sources in parallel.
    const [clMatches, wMatches] = await Promise.all([
      courtListenerMatches(brand, item, purchaseIds, { minConfidence }),
      webMatches(brand, item, purchaseIds, { minConfidence }),
    ]);

    const merged = dedupe([...clMatches, ...wMatches]);
    for (const m of merged) {
      all.push(m);
      emit({
        type: "match",
        brand: m.brand,
        source: m.source,
        title: m.title,
        url: m.url,
        claimUrl: m.claimUrl,
        active: m.active,
        confidence: m.confidence,
        summary: m.summary,
        whyQualified: m.whyQualified,
        uncertainties: m.uncertainties,
      });
    }
  }

  const matches = dedupe(all);
  await saveMatches(userId, matches);
  emit({ type: "done", purchases: purchases.length, matches: matches.length });
}
