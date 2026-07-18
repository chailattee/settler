import * as db from "@/lib/supabase";
import type { PurchaseRecord } from "@/lib/types";
import type { ClassActionMatch } from "@/lib/classaction";

/** Persistence for scanned purchases and class-action matches.
 *
 *  Backed by Supabase (PostgREST) when configured; otherwise an in-process Map
 *  so the flow is demoable with zero setup. Keyed by userId so a session's data
 *  stays scoped to the signed-in user. Schema: supabase/schema.sql. */

export type StoredPurchase = PurchaseRecord & { brand: string; user_id: string };

/** DB row shape (snake_case columns; PostgREST matches JSON keys to column
 *  names exactly). */
interface PurchaseRow {
  id: string;
  user_id: string;
  merchant: string;
  item: string;
  amount: number;
  date: string;
  source: string;
  evidence_label: string;
  brand: string;
}

function toRow(p: StoredPurchase): PurchaseRow {
  return {
    id: p.id,
    user_id: p.user_id,
    merchant: p.merchant,
    item: p.item,
    amount: p.amount,
    date: p.date,
    source: p.source,
    evidence_label: p.evidenceLabel,
    brand: p.brand,
  };
}

function fromRow(r: PurchaseRow): StoredPurchase {
  return {
    id: r.id,
    user_id: r.user_id,
    merchant: r.merchant,
    item: r.item,
    amount: r.amount,
    date: r.date,
    source: (r.source as PurchaseRecord["source"]) ?? "gmail",
    evidenceLabel: r.evidence_label,
    brand: r.brand,
  };
}

interface StoredMatch {
  id: string;
  user_id: string;
  brand: string;
  item: string;
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

/** In-memory fallback store. Hung off globalThis so it's shared across route
 *  handlers (Next bundles each route separately, so a plain module-level Map
 *  would be per-route and reads from /api/matches wouldn't see the workflow's
 *  writes). Used only when Supabase is unconfigured or a DB call fails. */
const g = globalThis as typeof globalThis & {
  __settlersMem?: {
    purchases: Map<string, StoredPurchase[]>;
    matches: Map<string, StoredMatch[]>;
  };
};
const mem =
  g.__settlersMem ??
  (g.__settlersMem = {
    purchases: new Map<string, StoredPurchase[]>(),
    matches: new Map<string, StoredMatch[]>(),
  });

const useDb = db.supabaseConfigured();

/** Stable id from source + brand + title, so re-runs upsert rather than dupe. */
function matchId(userId: string, m: ClassActionMatch): string {
  const slug = `${m.brand}-${m.title}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `m_${userId}_${m.source}_${slug}`;
}

function toStoredMatch(userId: string, m: ClassActionMatch): StoredMatch {
  return {
    id: matchId(userId, m),
    user_id: userId,
    brand: m.brand,
    item: m.item,
    source: m.source,
    title: m.title,
    url: m.url,
    court: m.court,
    active: m.active,
    confidence: m.confidence,
    claim_url: m.claimUrl,
    summary: m.summary,
    payout_low: m.payoutLow,
    payout_high: m.payoutHigh,
    deadline: m.deadline,
    purchase_ids: m.purchaseIds,
    why_qualified: m.whyQualified,
    uncertainties: m.uncertainties,
  };
}

/** Remember to save into memory (used as the fallback whenever a DB call
 *  fails, e.g. schema.sql hasn't been run yet). */
function memSavePurchases(userId: string, rows: StoredPurchase[]) {
  const existing = mem.purchases.get(userId) ?? [];
  const ids = new Set(existing.map((p) => p.id));
  mem.purchases.set(userId, [...existing, ...rows.filter((r) => !ids.has(r.id))]);
}

export async function savePurchases(userId: string, purchases: StoredPurchase[]): Promise<void> {
  if (purchases.length === 0) return;
  const withUser = purchases.map((p) => ({ ...p, user_id: userId }));
  if (useDb) {
    try {
      await db.upsert("purchases", withUser.map(toRow));
      return;
    } catch (err) {
      console.warn("[store] Supabase purchases write failed, using memory:", String(err));
    }
  }
  memSavePurchases(userId, withUser);
}

export async function getPurchases(userId: string): Promise<StoredPurchase[]> {
  if (useDb) {
    try {
      const rows = await db.select<PurchaseRow>(
        "purchases",
        `select=*&user_id=eq.${userId}&order=date.desc`,
      );
      return rows.map(fromRow);
    } catch {
      /* fall through to memory */
    }
  }
  return mem.purchases.get(userId) ?? [];
}

export async function saveMatches(userId: string, matches: ClassActionMatch[]): Promise<void> {
  const rows = matches.map((m) => toStoredMatch(userId, m));
  if (rows.length === 0) return;
  if (useDb) {
    try {
      await db.upsert("class_action_matches", rows);
      return;
    } catch (err) {
      console.warn("[store] Supabase matches write failed, using memory:", String(err));
    }
  }
  mem.matches.set(userId, rows);
}

export async function getMatches(userId: string): Promise<StoredMatch[]> {
  if (useDb) {
    try {
      return await db.select<StoredMatch>(
        "class_action_matches",
        `select=*&user_id=eq.${userId}&order=confidence.desc`,
      );
    } catch {
      /* fall through to memory */
    }
  }
  return mem.matches.get(userId) ?? [];
}
