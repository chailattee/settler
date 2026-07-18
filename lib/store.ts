import { eq, desc } from "drizzle-orm";
import { db, dbConfigured } from "@/lib/db";
import { purchases, classActionMatches, claims, profiles } from "@/lib/db/schema";
import type {
  NewPurchaseRow,
  PurchaseRow,
  MatchRow,
  ClaimRow,
  ProfileRow,
} from "@/lib/db/schema";
import type { PurchaseRecord } from "@/lib/types";
import type { ClassActionMatch } from "@/lib/classaction";

/** Persistence for scanned purchases and class-action matches.
 *
 *  Backed by Supabase Postgres via Drizzle (lib/db) when DATABASE_URL is set;
 *  otherwise an in-process Map so the flow is demoable with zero setup. Keyed
 *  by userId. The public JSON shapes returned here (snake_case StoredMatch /
 *  camelCase StoredPurchase) are the API contract — keep them stable. */

export type StoredPurchase = PurchaseRecord & { brand: string; user_id: string };

export interface StoredMatch {
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
  claim_potential: number;
  stage: string;
  claim_url: string | null;
  summary: string;
  payout_low: number;
  payout_high: number;
  deadline: string | null;
  purchase_ids: string[];
  why_qualified: string[];
  uncertainties: string[];
}

// --- mappers: domain <-> Drizzle rows ---------------------------------------

function toInsertPurchase(p: StoredPurchase): NewPurchaseRow {
  return {
    id: p.id,
    userId: p.user_id,
    merchant: p.merchant,
    item: p.item,
    amount: p.amount,
    date: p.date,
    source: p.source,
    evidenceLabel: p.evidenceLabel,
    brand: p.brand,
  };
}

function fromPurchaseRow(r: PurchaseRow): StoredPurchase {
  return {
    id: r.id,
    user_id: r.userId,
    merchant: r.merchant,
    item: r.item,
    amount: r.amount,
    date: r.date,
    source: (r.source as PurchaseRecord["source"]) ?? "gmail",
    evidenceLabel: r.evidenceLabel,
    brand: r.brand,
  };
}

/** Stable id from source + brand + title, so re-runs replace rather than dupe. */
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
    claim_potential: m.claimPotential,
    stage: m.stage,
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

function storedMatchToInsert(s: StoredMatch) {
  return {
    id: s.id,
    userId: s.user_id,
    brand: s.brand,
    item: s.item,
    source: s.source,
    title: s.title,
    url: s.url,
    court: s.court,
    active: s.active,
    confidence: s.confidence,
    claimPotential: s.claim_potential,
    stage: s.stage,
    claimUrl: s.claim_url,
    summary: s.summary,
    payoutLow: s.payout_low,
    payoutHigh: s.payout_high,
    deadline: s.deadline,
    purchaseIds: s.purchase_ids,
    whyQualified: s.why_qualified,
    uncertainties: s.uncertainties,
  };
}

function fromMatchRow(r: MatchRow): StoredMatch {
  return {
    id: r.id,
    user_id: r.userId,
    brand: r.brand,
    item: r.item,
    source: r.source as "courtlistener" | "web",
    title: r.title,
    url: r.url,
    court: r.court,
    active: r.active,
    confidence: r.confidence,
    claim_potential: r.claimPotential,
    stage: r.stage,
    claim_url: r.claimUrl ?? null,
    summary: r.summary,
    payout_low: r.payoutLow,
    payout_high: r.payoutHigh,
    deadline: r.deadline ?? null,
    purchase_ids: r.purchaseIds ?? [],
    why_qualified: r.whyQualified ?? [],
    uncertainties: r.uncertainties ?? [],
  };
}

// --- in-memory fallback -----------------------------------------------------

/** Hung off globalThis so it's shared across route handlers (Next bundles each
 *  route separately). Used when DATABASE_URL is unset or a DB call fails. */
const g = globalThis as typeof globalThis & {
  __settlersMem?: {
    purchases: Map<string, StoredPurchase[]>;
    matches: Map<string, StoredMatch[]>;
    claims: Map<string, ClaimRow[]>;
    profiles: Map<string, ProfileRow>;
  };
};
const mem =
  g.__settlersMem ??
  (g.__settlersMem = {
    purchases: new Map<string, StoredPurchase[]>(),
    matches: new Map<string, StoredMatch[]>(),
    claims: new Map<string, ClaimRow[]>(),
    profiles: new Map<string, ProfileRow>(),
  });

const useDb = dbConfigured();

function memSavePurchases(userId: string, rows: StoredPurchase[]) {
  const existing = mem.purchases.get(userId) ?? [];
  const ids = new Set(existing.map((p) => p.id));
  mem.purchases.set(userId, [...existing, ...rows.filter((r) => !ids.has(r.id))]);
}

// --- public API -------------------------------------------------------------

export async function savePurchases(userId: string, list: StoredPurchase[]): Promise<void> {
  if (list.length === 0) return;
  const withUser = list.map((p) => ({ ...p, user_id: userId }));
  if (useDb) {
    try {
      await db!.insert(purchases).values(withUser.map(toInsertPurchase)).onConflictDoNothing();
      return;
    } catch (err) {
      console.warn("[store] DB purchases write failed, using memory:", String(err));
    }
  }
  memSavePurchases(userId, withUser);
}

export async function getPurchases(userId: string): Promise<StoredPurchase[]> {
  if (useDb) {
    try {
      const rows = await db!
        .select()
        .from(purchases)
        .where(eq(purchases.userId, userId))
        .orderBy(desc(purchases.date));
      return rows.map(fromPurchaseRow);
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
      // Each run replaces this user's matches with the fresh deduped set.
      await db!.transaction(async (tx) => {
        await tx.delete(classActionMatches).where(eq(classActionMatches.userId, userId));
        await tx.insert(classActionMatches).values(rows.map(storedMatchToInsert));
      });
      return;
    } catch (err) {
      console.warn("[store] DB matches write failed, using memory:", String(err));
    }
  }
  mem.matches.set(userId, rows);
}

export async function getMatches(userId: string): Promise<StoredMatch[]> {
  if (useDb) {
    try {
      const rows = await db!
        .select()
        .from(classActionMatches)
        .where(eq(classActionMatches.userId, userId))
        .orderBy(desc(classActionMatches.claimPotential), desc(classActionMatches.confidence));
      return rows.map(fromMatchRow);
    } catch {
      /* fall through to memory */
    }
  }
  return mem.matches.get(userId) ?? [];
}

export async function getMatchById(userId: string, matchId: string): Promise<StoredMatch | null> {
  const all = await getMatches(userId);
  return all.find((m) => m.id === matchId) ?? null;
}

// --- profiles (autofill identity) -------------------------------------------

export async function getProfile(userId: string): Promise<ProfileRow | null> {
  if (useDb) {
    try {
      const rows = await db!.select().from(profiles).where(eq(profiles.userId, userId));
      return rows[0] ?? null;
    } catch {
      /* fall through */
    }
  }
  return mem.profiles.get(userId) ?? null;
}

export async function saveProfile(
  userId: string,
  patch: Partial<Pick<ProfileRow, "name" | "email" | "phone" | "address">>,
): Promise<void> {
  const row = {
    userId,
    name: patch.name ?? "",
    email: patch.email ?? "",
    phone: patch.phone ?? "",
    address: patch.address ?? "",
  };
  if (useDb) {
    try {
      await db!
        .insert(profiles)
        .values(row)
        .onConflictDoUpdate({ target: profiles.userId, set: patch });
      return;
    } catch (err) {
      console.warn("[store] DB profile write failed, using memory:", String(err));
    }
  }
  const existing = mem.profiles.get(userId);
  mem.profiles.set(userId, { ...(existing ?? row), ...patch, userId } as ProfileRow);
}

// --- claims -----------------------------------------------------------------

export async function saveClaim(row: ClaimRow): Promise<void> {
  if (useDb) {
    try {
      await db!.insert(claims).values(row).onConflictDoUpdate({
        target: claims.id,
        set: {
          submitType: row.submitType,
          submitUrl: row.submitUrl,
          status: row.status,
          instructions: row.instructions,
          deadline: row.deadline,
          enteredData: row.enteredData,
          missing: row.missing,
        },
      });
      return;
    } catch (err) {
      console.warn("[store] DB claim write failed, using memory:", String(err));
    }
  }
  const list = (mem.claims.get(row.userId) ?? []).filter((c) => c.id !== row.id);
  mem.claims.set(row.userId, [row, ...list]);
}

export async function getClaims(userId: string): Promise<ClaimRow[]> {
  if (useDb) {
    try {
      return await db!
        .select()
        .from(claims)
        .where(eq(claims.userId, userId))
        .orderBy(desc(claims.createdAt));
    } catch {
      /* fall through */
    }
  }
  return mem.claims.get(userId) ?? [];
}
