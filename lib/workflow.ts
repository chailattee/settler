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
 *  Extraction and lawsuit lookup are PIPELINED: each brand's analysis starts the
 *  moment that brand is first discovered, overlapping with the rest of the inbox
 *  scan rather than waiting for it to finish. LLM concurrency is bounded
 *  globally in lib/openrouter, so this stays fast without tripping rate limits.
 *
 *  The route wraps this in an SSE stream; emitted events drive the UI's live
 *  activity feed. (Filing is a later flow — this stops at listing the lawsuits.) */

type BrandPurchase = PurchaseRecord & { brand: string };

export interface WorkflowOpts {
  userId: string;
  token: string;
  maxEmails?: number;
  minConfidence?: number;
}

/** Simple async concurrency limiter (no dependency). */
function limiter(max: number) {
  let active = 0;
  const queue: (() => void)[] = [];
  const pump = () => {
    while (active < max && queue.length) {
      active++;
      queue.shift()!();
    }
  };
  return <T>(fn: () => Promise<T>): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      queue.push(() =>
        fn()
          .then(resolve, reject)
          .finally(() => {
            active--;
            pump();
          }),
      );
      pump();
    });
}

const BRAND_CONCURRENCY = 4;

export async function runWorkflow(emit: Emit, opts: WorkflowOpts): Promise<void> {
  const { userId, token, maxEmails = 100, minConfidence = 0.5 } = opts;
  const sources = braveConfigured() ? "CourtListener + web" : "CourtListener";

  // 1. Gmail scan --------------------------------------------------------
  emit({ type: "status", step: "gmail", message: "Scanning your inbox for receipts…" });
  const ids = await listReceiptIds(token, maxEmails);
  emit({ type: "status", step: "gmail", message: `Found ${ids.length} receipt-like emails.` });

  // 2. Extraction + analysis, pipelined ----------------------------------
  // Each brand's lookup is scheduled as soon as the brand first appears, so
  // lawsuit discovery overlaps with the remaining inbox scan.
  const purchases: BrandPurchase[] = [];
  const brandPurchases = new Map<string, BrandPurchase[]>();
  const scheduled = new Set<string>();
  const runBrand = limiter(BRAND_CONCURRENCY);
  const analyses: Promise<ClassActionMatch[]>[] = [];

  const scheduleBrand = (key: string) => {
    if (scheduled.has(key)) return;
    scheduled.add(key);
    // Read the (possibly grown) group lazily when the limiter runs it, so
    // later purchases of the same brand are included.
    analyses.push(runBrand(() => analyzeBrand(emit, brandPurchases.get(key)!, minConfidence, sources)));
  };

  const EXTRACT_CONCURRENCY = 8;
  let scanned = 0;
  for (let i = 0; i < ids.length; i += EXTRACT_CONCURRENCY) {
    const batch = ids.slice(i, i + EXTRACT_CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (id) => {
        const msg = await getMessage(token, id);
        if (!msg) return [] as BrandPurchase[];
        try {
          return await extractFromEmail(msg);
        } catch {
          return [] as BrandPurchase[];
        }
      }),
    );
    for (const found of results) {
      emit({ type: "gmail_scanning", scanned: ++scanned, total: ids.length });
      for (const p of found) {
        purchases.push(p);
        emit({ type: "purchase_found", purchase: p });
        const key = (p.brand || p.merchant).toLowerCase();
        if (!key) continue;
        brandPurchases.set(key, [...(brandPurchases.get(key) ?? []), p]);
        scheduleBrand(key);
      }
    }
  }

  emit({
    type: "status",
    step: "extract",
    message: `Extracted ${purchases.length} purchases from ${ids.length} emails; matching…`,
  });

  await savePurchases(
    userId,
    purchases.map((p) => ({ ...p, user_id: userId }) as StoredPurchase),
  );

  const all = (await Promise.all(analyses)).flat();
  const matches = dedupe(all);
  await saveMatches(userId, matches);
  emit({ type: "done", purchases: purchases.length, matches: matches.length });
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

/** Look up + screen class actions for one brand group, emitting match events. */
async function analyzeBrand(
  emit: Emit,
  group: BrandPurchase[],
  minConfidence: number,
  sources: string,
): Promise<ClassActionMatch[]> {
  const brand = group[0].brand || group[0].merchant;
  const item = group.map((p) => p.item).join(", ");
  const purchaseIds = group.map((p) => p.id);

  emit({ type: "brand_lookup", brand, message: `Searching ${sources} for “${item}”…` });

  const [clMatches, wMatches] = await Promise.all([
    courtListenerMatches(brand, item, purchaseIds, { minConfidence }),
    webMatches(brand, item, purchaseIds, { minConfidence }),
  ]);

  const merged = dedupe([...clMatches, ...wMatches]);
  for (const m of merged) {
    emit({
      type: "match",
      brand: m.brand,
      source: m.source,
      title: m.title,
      url: m.url,
      claimUrl: m.claimUrl,
      active: m.active,
      stage: m.stage,
      claimPotential: m.claimPotential,
      confidence: m.confidence,
      summary: m.summary,
      whyQualified: m.whyQualified,
      uncertainties: m.uncertainties,
    });
  }
  return merged;
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
  // Rank by claim potential first (a claimable settlement beats an early-stage
  // suit), then by relevance confidence.
  return [...seen.values()].sort(
    (a, b) => b.claimPotential - a.claimPotential || b.confidence - a.confidence,
  );
}

/** The per-product class-action lookup half of the pipeline (CourtListener +
 *  web). Used by the demo route, which supplies all purchases up front. Brands
 *  are analysed with bounded concurrency. */
export async function matchPurchases(
  emit: Emit,
  opts: { userId: string; purchases: BrandPurchase[]; minConfidence?: number },
): Promise<void> {
  const { userId, purchases, minConfidence = 0.5 } = opts;
  const sources = braveConfigured() ? "CourtListener + web" : "CourtListener";

  await savePurchases(
    userId,
    purchases.map((p) => ({ ...p, user_id: userId }) as StoredPurchase),
  );

  const runBrand = limiter(BRAND_CONCURRENCY);
  const groups = [...groupByBrand(purchases).values()];
  const all = (
    await Promise.all(groups.map((g) => runBrand(() => analyzeBrand(emit, g, minConfidence, sources))))
  ).flat();

  const matches = dedupe(all);
  await saveMatches(userId, matches);
  emit({ type: "done", purchases: purchases.length, matches: matches.length });
}
