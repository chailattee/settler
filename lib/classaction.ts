import { chatJSON } from "@/lib/openrouter";
import { searchClassActions, type ClassActionCase } from "@/lib/courtlistener";
import type { PurchaseRecord } from "@/lib/types";

/** Class-action discovery from CourtListener.
 *
 *  Per brand: CourtListener returns active dockets captioned with the brand;
 *  an LLM classifier keeps only genuine CONSUMER class actions relevant to what
 *  was bought (dropping patent/IP, employment, securities suits, and same-name-
 *  different-company false positives).
 *
 *  Web search is the parallel discovery source (see lib/websearch.ts); both
 *  emit the same unified `ClassActionMatch` shape so the workflow can merge and
 *  list them together. */

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
  /** Still open / accepting claims. */
  active: boolean;
  /** LLM confidence this is a relevant consumer class action, 0..1. */
  confidence: number;
  whyQualified: string[];
  uncertainties: string[];
  /** Official claim-filing site, when known (mainly web-sourced). */
  claimUrl: string | null;
  summary: string;
  /** Individual payout estimate in USD; 0 if unknown. */
  payoutLow: number;
  payoutHigh: number;
  deadline: string | null; // ISO date
}

export interface Classification {
  isConsumerClassAction: boolean;
  relevantToPurchase: boolean;
  confidence: number;
  whyQualified: string[];
  uncertainties: string[];
}

const CLASSIFY_SCHEMA = {
  name: "case_classification",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      isConsumerClassAction: { type: "boolean" },
      relevantToPurchase: { type: "boolean" },
      confidence: { type: "number" },
      whyQualified: { type: "array", items: { type: "string" } },
      uncertainties: { type: "array", items: { type: "string" } },
    },
    required: [
      "isConsumerClassAction",
      "relevantToPurchase",
      "confidence",
      "whyQualified",
      "uncertainties",
    ],
  },
} as const;

const CLASSIFY_SYSTEM =
  "You are a class-action eligibility screener. Given a purchased product and a " +
  "lawsuit docket, decide: (1) is it a CONSUMER class action (not patent/IP, " +
  "employment, securities, or shareholder litigation)? (2) is it plausibly " +
  "about the product the person bought (right company, right product line)? " +
  "Give a confidence 0..1, concise bullet reasons the buyer might qualify, and " +
  "explicit uncertainties (e.g. 'class period unknown', 'may be a different " +
  "product line'). Be skeptical of same-name-different-company matches.";

export async function classifyCase(
  brand: string,
  item: string,
  c: ClassActionCase,
): Promise<Classification> {
  const user =
    `Purchased brand: ${brand}\nProduct: ${item}\n\n` +
    `Lawsuit:\n- Case: ${c.caseName}\n- Court: ${c.court}\n` +
    `- Filed: ${c.dateFiled ?? "unknown"} (status: ${c.active ? "OPEN" : "terminated"})\n` +
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
    whyQualified: cls.whyQualified,
    uncertainties: cls.uncertainties,
    claimUrl: null,
    summary: c.cause || "",
    payoutLow: 0,
    payoutHigh: 0,
    deadline: null,
  };
}

/** Discover + classify class actions for one brand/item from CourtListener. */
export async function courtListenerMatches(
  brand: string,
  item: string,
  purchaseIds: string[],
  opts: { minConfidence?: number; perBrand?: number } = {},
): Promise<ClassActionMatch[]> {
  const { minConfidence = 0.5, perBrand = 5 } = opts;
  let cases: ClassActionCase[];
  try {
    cases = await searchClassActions(brand, { activeOnly: true, limit: perBrand });
  } catch {
    return [];
  }

  const out: ClassActionMatch[] = [];
  for (const c of cases) {
    let cls: Classification;
    try {
      cls = await classifyCase(brand, item, c);
    } catch {
      continue;
    }
    if (cls.isConsumerClassAction && cls.relevantToPurchase && cls.confidence >= minConfidence) {
      out.push(caseToMatch(c, brand, item, purchaseIds, cls));
    }
  }
  return out;
}
