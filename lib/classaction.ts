import { chatJSON } from "@/lib/openrouter";
import { searchClassActions, type ClassActionCase } from "@/lib/courtlistener";

/** Class-action discovery from CourtListener.
 *
 *  Per brand: CourtListener returns recent dockets captioned with the brand; an
 *  LLM screener keeps only genuine CONSUMER class actions relevant to the
 *  purchase AND assesses whether there's a realistic path to CLAIM a current or
 *  future settlement (dropping patent/IP, employment, securities suits, and
 *  same-name-different-company false positives).
 *
 *  Note we deliberately do NOT require the docket to be legally "open": many of
 *  the most claimable settlements come from cases that are terminated in court
 *  but still have an OPEN claims window. The screener + web source judge the
 *  actual claim stage.
 *
 *  Web search is the parallel discovery source (see lib/websearch.ts); both
 *  emit the same unified `ClassActionMatch` shape. */

/** Where a lawsuit sits on the road to a claimable payout. */
export type ClaimStage =
  | "settlement_open" // settlement reached, claims being accepted now
  | "settlement_upcoming" // settlement likely/pending, claims not open yet
  | "ongoing" // active litigation, no settlement yet
  | "resolved" // over, claims window closed
  | "unknown";

/** A single class-action lawsuit matched to a purchase, from either source. */
export interface ClassActionMatch {
  /** Purchase records (ids) backing this match. */
  purchaseIds: string[];
  brand: string;
  /** The specific purchased item this lawsuit is about. */
  item: string;
  source: "courtlistener" | "web";
  /** Case name (CourtListener) or settlement/lawsuit name (web). */
  title: string;
  /** Docket URL (CourtListener) or lawsuit/news URL (web). */
  url: string;
  /** Court, for CourtListener cases; "" for web. */
  court: string;
  /** Docket still open in court. */
  active: boolean;
  /** LLM confidence this is a relevant consumer class action, 0..1. */
  confidence: number;
  /** Likelihood the buyer can actually claim a current/future settlement, 0..1.
   *  This is the primary ranking signal — a claimable settlement beats an
   *  early-stage suit years from any payout. */
  claimPotential: number;
  stage: ClaimStage;
  whyQualified: string[];
  uncertainties: string[];
  /** Official claim-filing site, when known (mainly web-sourced). */
  claimUrl: string | null;
  summary: string;
  /** Individual payout estimate in USD; 0 if unknown. */
  payoutLow: number;
  payoutHigh: number;
  deadline: string | null; // ISO date — claim deadline when known
}

export interface Classification {
  isConsumerClassAction: boolean;
  /** A class/collective action (not an individual suit). */
  isClassAction: boolean;
  relevantToPurchase: boolean;
  confidence: number;
  claimPotential: number;
  stage: ClaimStage;
  whyQualified: string[];
  uncertainties: string[];
}

const STAGES: ClaimStage[] = [
  "settlement_open",
  "settlement_upcoming",
  "ongoing",
  "resolved",
  "unknown",
];

const CLASSIFY_SCHEMA = {
  name: "case_classification",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      isConsumerClassAction: { type: "boolean" },
      isClassAction: { type: "boolean" },
      relevantToPurchase: { type: "boolean" },
      confidence: { type: "number" },
      claimPotential: { type: "number" },
      stage: { type: "string", enum: STAGES },
      whyQualified: { type: "array", items: { type: "string" } },
      uncertainties: { type: "array", items: { type: "string" } },
    },
    required: [
      "isConsumerClassAction",
      "isClassAction",
      "relevantToPurchase",
      "confidence",
      "claimPotential",
      "stage",
      "whyQualified",
      "uncertainties",
    ],
  },
} as const;

const CLASSIFY_SYSTEM =
  "You screen lawsuits for whether a consumer who bought a product could CLAIM " +
  "money from them. Given a purchase and a lawsuit docket, decide:\n" +
  "1. isConsumerClassAction: a consumer class/collective action (NOT patent/IP, " +
  "employment, securities, shareholder, antitrust-between-companies, or " +
  "contract disputes between businesses).\n" +
  "2. isClassAction: a class or collective action that a member of the public " +
  "could join — not a one-off individual suit.\n" +
  "3. relevantToPurchase: plausibly covers the exact product bought (right " +
  "company/brand, right product line and era). Be skeptical of same-name-" +
  "different-company matches.\n" +
  "4. stage: where it is on the road to a payout — 'settlement_open' (settlement " +
  "reached, claims open NOW), 'settlement_upcoming' (settlement pending/likely, " +
  "claims not yet open), 'ongoing' (active litigation, no settlement yet), " +
  "'resolved' (over and claims window closed), or 'unknown'.\n" +
  "5. claimPotential (0..1): realistic likelihood THIS buyer could claim a " +
  "current or future settlement. Weight it toward open/upcoming settlements and " +
  "strong consumer class actions; near 0 for resolved-and-closed, individual, " +
  "or off-target cases.\n" +
  "Also give confidence (0..1 that it's a relevant consumer class action), " +
  "concise reasons the buyer might qualify, and explicit uncertainties " +
  "(e.g. 'class period unknown', 'settlement not yet reached').";

export async function classifyCase(
  brand: string,
  item: string,
  c: ClassActionCase,
  today: string,
): Promise<Classification> {
  const user =
    `Today: ${today}\nPurchased brand: ${brand}\nProduct: ${item}\n\n` +
    `Lawsuit:\n- Case: ${c.caseName}\n- Court: ${c.court}\n` +
    `- Filed: ${c.dateFiled ?? "unknown"}\n` +
    `- Court status: ${c.active ? "open docket" : `terminated ${c.dateTerminated ?? ""}`}\n` +
    `- Cause: ${c.cause || "n/a"}\n- Nature of suit: ${c.suitNature || "n/a"}`;

  return chatJSON<Classification>(
    [
      { role: "system", content: CLASSIFY_SYSTEM },
      { role: "user", content: user },
    ],
    CLASSIFY_SCHEMA,
  );
}

/** Turn a classified CourtListener case into a unified match. */
export function caseToMatch(
  c: ClassActionCase,
  brand: string,
  item: string,
  purchaseIds: string[],
  cls: Classification,
): ClassActionMatch {
  return {
    purchaseIds,
    brand,
    item,
    source: "courtlistener",
    title: c.caseName,
    url: c.url,
    court: c.court,
    active: c.active,
    confidence: cls.confidence,
    claimPotential: cls.claimPotential,
    stage: cls.stage,
    whyQualified: cls.whyQualified,
    uncertainties: cls.uncertainties,
    claimUrl: null,
    summary: c.cause || "",
    payoutLow: 0,
    payoutHigh: 0,
    deadline: c.dateTerminated,
  };
}

/** Discover + screen class actions for one brand/item from CourtListener. */
export async function courtListenerMatches(
  brand: string,
  item: string,
  purchaseIds: string[],
  opts: { minConfidence?: number; perBrand?: number; today?: string } = {},
): Promise<ClassActionMatch[]> {
  const { minConfidence = 0.5, perBrand = 8, today = new Date().toISOString().slice(0, 10) } = opts;
  let cases: ClassActionCase[];
  try {
    // Include recently-terminated cases too — settled cases are prime claim
    // targets. Recency is bounded inside searchClassActions.
    cases = await searchClassActions(brand, { activeOnly: false, limit: perBrand });
  } catch {
    return [];
  }

  const out: ClassActionMatch[] = [];
  for (const c of cases) {
    let cls: Classification;
    try {
      cls = await classifyCase(brand, item, c, today);
    } catch {
      continue;
    }
    // Keep genuine, relevant consumer class actions that a buyer could join and
    // that carry some claim potential.
    if (
      cls.isConsumerClassAction &&
      cls.isClassAction &&
      cls.relevantToPurchase &&
      cls.confidence >= minConfidence &&
      cls.claimPotential > 0.1
    ) {
      out.push(caseToMatch(c, brand, item, purchaseIds, cls));
    }
  }
  return out;
}
