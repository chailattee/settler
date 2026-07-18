import { chatJSON } from "@/lib/openrouter";
import type { ClassActionMatch } from "@/lib/classaction";

/** Web-search discovery of class-action lawsuits: Brave (search) + Firecrawl
 *  (scrape to markdown).
 *
 *  This is the parallel discovery source to CourtListener. CourtListener has
 *  authoritative dockets but no settlement/claim details; the open web has the
 *  settlement sites, news write-ups, and "how to claim" pages. We search for a
 *  brand+product, scrape the top results, and have the LLM extract any relevant
 *  class actions as unified `ClassActionMatch` records (source: "web").
 *
 *  Both keys are optional — if BRAVE_API_KEY is unset, webMatches() returns []
 *  and the workflow falls back to CourtListener only. */

const BRAVE = "https://api.search.brave.com/res/v1/web/search";
const FIRECRAWL = "https://api.firecrawl.dev/v1/scrape";

export interface WebResult {
  title: string;
  url: string;
  description: string;
}

export function braveConfigured(): boolean {
  return Boolean(process.env.BRAVE_API_KEY);
}

export function firecrawlConfigured(): boolean {
  return Boolean(process.env.FIRECRAWL_API_KEY);
}

/** Brave web search. Returns [] if unconfigured. */
export async function braveSearch(query: string, count = 6): Promise<WebResult[]> {
  const key = process.env.BRAVE_API_KEY;
  if (!key) return [];
  const params = new URLSearchParams({ q: query, count: String(count) });
  const res = await fetch(`${BRAVE}?${params}`, {
    headers: { Accept: "application/json", "X-Subscription-Token": key },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Brave ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    web?: { results?: { title: string; url: string; description: string }[] };
  };
  return (data.web?.results ?? []).map((r) => ({
    title: r.title,
    url: r.url,
    description: r.description,
  }));
}

/** Firecrawl scrape -> markdown. Returns "" if unconfigured or on failure. */
export async function firecrawlScrape(url: string): Promise<string> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return "";
  const res = await fetch(FIRECRAWL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
  });
  if (!res.ok) return "";
  const data = (await res.json()) as { data?: { markdown?: string } };
  return (data.data?.markdown ?? "").slice(0, 8000);
}

const DISCOVER_SCHEMA = {
  name: "web_lawsuit_discovery",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      lawsuits: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string" },
            url: { type: "string" },
            claimUrl: { type: ["string", "null"] },
            active: { type: "boolean" },
            stage: {
              type: "string",
              enum: ["settlement_open", "settlement_upcoming", "ongoing", "resolved", "unknown"],
            },
            claimPotential: { type: "number" },
            summary: { type: "string" },
            confidence: { type: "number" },
            whyQualified: { type: "array", items: { type: "string" } },
            uncertainties: { type: "array", items: { type: "string" } },
            payoutLow: { type: "number" },
            payoutHigh: { type: "number" },
            deadline: { type: ["string", "null"] },
          },
          required: [
            "title",
            "url",
            "claimUrl",
            "active",
            "stage",
            "claimPotential",
            "summary",
            "confidence",
            "whyQualified",
            "uncertainties",
            "payoutLow",
            "payoutHigh",
            "deadline",
          ],
        },
      },
    },
    required: ["lawsuits"],
  },
} as const;

interface WebLawsuit {
  title: string;
  url: string;
  claimUrl: string | null;
  active: boolean;
  stage: "settlement_open" | "settlement_upcoming" | "ongoing" | "resolved" | "unknown";
  claimPotential: number;
  summary: string;
  confidence: number;
  whyQualified: string[];
  uncertainties: string[];
  payoutLow: number;
  payoutHigh: number;
  deadline: string | null;
}

const DISCOVER_SYSTEM =
  "You find consumer class actions/settlements relevant to a specific purchased " +
  "product where the buyer could CLAIM money — from web search results / scraped " +
  "pages. Prioritise settlements with an OPEN or UPCOMING claims window over " +
  "old, closed cases. Return ONLY genuine consumer cases about this brand+" +
  "product (ignore unrelated cases, patent/employment suits, and generic " +
  "legal-ad pages with no real case). For each return:\n" +
  "- title, url (source), claimUrl (official claim-filing site or null)\n" +
  "- active (still accepting claims), stage ('settlement_open' = claims open " +
  "now, 'settlement_upcoming' = settlement pending/proposed, 'ongoing' = active " +
  "suit no settlement yet, 'resolved' = closed, 'unknown')\n" +
  "- claimPotential (0..1): realistic likelihood THIS buyer can claim a current " +
  "or future payout (near 1 for open settlements matching the product, near 0 " +
  "for closed/off-target)\n" +
  "- confidence (0..1 relevant to the purchase), summary, whyQualified, " +
  "uncertainties, payoutLow/High in USD (0 if unknown), deadline (ISO date or " +
  "null).\n" +
  "Return an empty list if nothing relevant. Never invent cases, claim URLs, or " +
  "deadlines.";

/** Discover class actions for one brand/item via web search. */
export async function webMatches(
  brand: string,
  item: string,
  purchaseIds: string[],
  opts: { minConfidence?: number } = {},
): Promise<ClassActionMatch[]> {
  const { minConfidence = 0.5 } = opts;
  if (!braveConfigured()) return [];

  // Bias the query toward open, claimable settlements and the sites that track
  // them (settlement administrators + class-action trackers).
  const query =
    `${brand} ${item} class action settlement claim ` +
    `("open settlement" OR "how to claim" OR "claim form" OR "class members" OR proof of purchase)`;
  let results: WebResult[];
  try {
    results = await braveSearch(query, 6);
  } catch {
    return [];
  }
  if (results.length === 0) return [];

  // Scrape the top few results for depth (Firecrawl optional); fall back to
  // Brave snippets when the scraper isn't configured.
  let context = "";
  for (const r of results.slice(0, 3)) {
    const md = await firecrawlScrape(r.url);
    context += `\n\n## ${r.title} (${r.url})\n${md || r.description}`;
  }

  let parsed: { lawsuits: WebLawsuit[] };
  try {
    parsed = await chatJSON<{ lawsuits: WebLawsuit[] }>(
      [
        { role: "system", content: DISCOVER_SYSTEM },
        {
          role: "user",
          content: `Purchased: ${brand} — ${item}\n\nWeb context:\n${context}`.slice(0, 14000),
        },
      ],
      DISCOVER_SCHEMA,
    );
  } catch {
    return [];
  }

  return parsed.lawsuits
    .filter((l) => l.confidence >= minConfidence && l.claimPotential > 0.1 && l.title && l.url)
    .map((l) => ({
      purchaseIds,
      brand,
      item,
      source: "web" as const,
      title: l.title,
      url: l.url,
      court: "",
      active: l.active,
      confidence: l.confidence,
      claimPotential: l.claimPotential,
      stage: l.stage,
      whyQualified: l.whyQualified,
      uncertainties: l.uncertainties,
      claimUrl: l.claimUrl,
      summary: l.summary,
      payoutLow: l.payoutLow,
      payoutHigh: l.payoutHigh,
      deadline: l.deadline,
    }));
}
