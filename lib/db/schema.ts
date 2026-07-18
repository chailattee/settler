import {
  pgTable,
  text,
  boolean,
  doublePrecision,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

/** Drizzle schema — source of truth for the DB. Apply with `npm run db:push`.
 *
 *  RLS is enabled with NO policies: the backend connects with the Postgres
 *  connection string (the `postgres` role bypasses RLS), and the UI talks to
 *  our API routes rather than Supabase directly — so the public publishable
 *  key gets no access to these tables. That satisfies Supabase's security
 *  advisor without needing per-row auth (we authenticate via better-auth). */

export const purchases = pgTable(
  "purchases",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    merchant: text("merchant").notNull().default(""),
    item: text("item").notNull().default(""),
    amount: doublePrecision("amount").notNull().default(0),
    date: text("date").notNull().default(""),
    source: text("source").notNull().default("gmail"),
    evidenceLabel: text("evidence_label").notNull().default(""),
    brand: text("brand").notNull().default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("purchases_user_idx").on(t.userId)],
).enableRLS();

export const classActionMatches = pgTable(
  "class_action_matches",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    brand: text("brand").notNull().default(""),
    item: text("item").notNull().default(""),
    source: text("source").notNull().default("courtlistener"), // 'courtlistener' | 'web'
    title: text("title").notNull().default(""),
    url: text("url").notNull().default(""),
    court: text("court").notNull().default(""),
    active: boolean("active").notNull().default(true),
    confidence: doublePrecision("confidence").notNull().default(0),
    claimPotential: doublePrecision("claim_potential").notNull().default(0),
    stage: text("stage").notNull().default("unknown"),
    claimUrl: text("claim_url"),
    summary: text("summary").notNull().default(""),
    payoutLow: doublePrecision("payout_low").notNull().default(0),
    payoutHigh: doublePrecision("payout_high").notNull().default(0),
    deadline: text("deadline"),
    purchaseIds: jsonb("purchase_ids").$type<string[]>().notNull().default([]),
    whyQualified: jsonb("why_qualified").$type<string[]>().notNull().default([]),
    uncertainties: jsonb("uncertainties").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("matches_user_idx").on(t.userId)],
).enableRLS();

/** The user's fillable identity — the autofill source for claim forms. */
export const profiles = pgTable("profiles", {
  userId: text("user_id").primaryKey(),
  name: text("name").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  address: text("address").notNull().default(""),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}).enableRLS();

/** A queued claim/interest submission built from a match + autofill. */
export const claims = pgTable(
  "claims",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    matchId: text("match_id").notNull(),
    title: text("title").notNull().default(""),
    brand: text("brand").notNull().default(""),
    submitType: text("submit_type").notNull().default("watch"), // claim | interest | watch
    submitUrl: text("submit_url"),
    status: text("status").notNull().default("awaiting_approval"), // queued|filling|awaiting_approval|submitted
    instructions: text("instructions").notNull().default(""),
    deadline: text("deadline"),
    /** Auto-created Gmail draft for linkless claims (follow-up email). */
    draftId: text("draft_id"),
    draftUrl: text("draft_url"),
    enteredData: jsonb("entered_data").$type<{ label: string; value: string; source: string }[]>().notNull().default([]),
    missing: jsonb("missing").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("claims_user_idx").on(t.userId)],
).enableRLS();

export type PurchaseRow = typeof purchases.$inferSelect;
export type NewPurchaseRow = typeof purchases.$inferInsert;
export type MatchRow = typeof classActionMatches.$inferSelect;
export type NewMatchRow = typeof classActionMatches.$inferInsert;
export type ProfileRow = typeof profiles.$inferSelect;
export type ClaimRow = typeof claims.$inferSelect;
