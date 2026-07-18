/** Shared domain types for Settlers. In the hackathon build these back mock
 *  data; the real app fills them from Gmail scans + the OpenAI matching engine. */

export type SettlementCategory =
  | "Data breach"
  | "Consumer product"
  | "Privacy"
  | "Financial"
  | "Auto"
  | "Tech";

export interface Settlement {
  id: string;
  name: string;
  defendant: string;
  category: SettlementCategory;
  /** One-line hook of what the case is about. */
  summary: string;
  classPeriod: string;
  qualifyingPurchase: string;
  proofRequired: string;
  /** Low/high dollar estimate of an individual payout. */
  payoutLow: number;
  payoutHigh: number;
  deadline: string; // ISO date
  states: "All US" | string[];
  claimUrl: string;
  /** True only for the safe DemoCorp settlement that files against /mock-claim. */
  isMock?: boolean;
}

export interface PurchaseRecord {
  id: string;
  merchant: string;
  item: string;
  amount: number;
  date: string; // ISO date
  source: "gmail" | "upload";
  /** Short label for the evidence chip, e.g. "Order confirmation". */
  evidenceLabel: string;
}

export interface MatchResult {
  id: string;
  settlementId: string;
  confidence: number; // 0..1
  estPayout: number;
  whyQualified: string[];
  /** IDs of PurchaseRecords backing this match. */
  evidence: string[];
  uncertainties: string[];
}

export type ClaimStatus =
  | "queued"
  | "filling"
  | "awaiting_approval"
  | "submitted";

export interface ClaimStep {
  label: string;
  /** Emoji stand-in for a screenshot in the mock filmstrip. */
  thumb: string;
  done: boolean;
}

export interface ClaimRun {
  id: string;
  settlementId: string;
  status: ClaimStatus;
  progress: number; // 0..100
  steps: ClaimStep[];
  enteredData: { label: string; value: string }[];
}
