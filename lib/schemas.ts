import { z } from "zod";

// Shared contracts between evidence ingestion (teammates), matching, and filing.

export const PurchaseRecord = z.object({
  id: z.string(),
  source: z.enum(["gmail", "upload"]),
  vendor: z.string(),
  date: z.string(), // ISO 8601
  amountUsd: z.number().nullable(),
  items: z.array(z.string()),
  rawRef: z.string().nullable(), // gmail message id or uploaded filename
});
export type PurchaseRecord = z.infer<typeof PurchaseRecord>;

export const EligibilityRules = z.object({
  id: z.string(), // slug, matches filename in data/settlements/
  name: z.string(),
  defendant: z.string(),
  summary: z.string(),
  classPeriodStart: z.string().nullable(),
  classPeriodEnd: z.string().nullable(),
  qualifyingCriteria: z.array(z.string()),
  proofRequired: z.enum(["none", "self_attestation", "receipt"]),
  estPayoutUsd: z.string(), // e.g. "$25" or "up to $250"
  deadline: z.string().nullable(),
  eligibleStates: z.array(z.string()), // empty = nationwide
  claimUrl: z.string(),
  sourceUrl: z.string(),
});
export type EligibilityRules = z.infer<typeof EligibilityRules>;

export const MatchResult = z.object({
  settlementId: z.string(),
  eligible: z.boolean(),
  confidence: z.enum(["high", "medium", "low"]),
  whyQualified: z.array(z.string()),
  evidence: z.array(z.string()), // PurchaseRecord ids
  uncertainties: z.array(z.string()),
  estPayoutUsd: z.string(),
  decision: z.enum(["pending", "claim", "skip"]).default("pending"),
});
export type MatchResult = z.infer<typeof MatchResult>;

export const ClaimRun = z.object({
  id: z.string(),
  settlementId: z.string(),
  status: z.enum(["running", "awaiting_approval", "approved", "error"]),
  steps: z.array(
    z.object({ note: z.string(), screenshot: z.string().nullable() })
  ),
  enteredData: z.record(z.string(), z.string()),
  startedAt: z.string(),
});
export type ClaimRun = z.infer<typeof ClaimRun>;
