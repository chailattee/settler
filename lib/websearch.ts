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
  summary: string;
  confidence: number;
  whyQualified: string[];
  uncertainties: string[];
  payoutLow: number;
  payoutHigh: number;
  deadline: string | null;
}

const DISCOVER_SYSTEM =
  "You find class-action lawsuits and settlements relevant to a specific " +
  "purchased product, from web search results / scraped pages. Return ONLY " +
  "genuine consumer class actions or settlements about this brand+product " +
  "(ignore unrelated cases, patent/employment suits, and generic legal-ad " +
  "pages with no real case). For each: title, the source url, the official " +
  "claim-filing url (or null), whether it's still active/accepting claims, a " +
  "one-line summary, a 0..1 confidence it's relevant to the purchase, bullet " +
  "reasons the buyer might qualify, uncertainties, an individual payout low/" +
  "high estimate in USD (0 if unknown), and the claim deadline (ISO date or " +
  "null). Return an empty list if nothing relevant is found. Do not invent " +
  "cases or claim URLs.";

/** Discover class actions for one brand/item via web search. */
export async function webMatches(
  brand: string,
  item: string,
  purchaseIds: string[],
  opts: { minConfidence?: number } = {},
): Promise<ClassActionMatch[]> {
  const { minConfidence = 0.5 } = opts;
  if (!braveConfigured()) return [];

  const query = `${brand} ${item} class action lawsuit settlement claim`;
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
    .filter((l) => l.confidence >= minConfidence && l.title && l.url)
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
      whyQualified: l.whyQualified,
      uncertainties: l.uncertainties,
      claimUrl: l.claimUrl,
      summary: l.summary,
      payoutLow: l.payoutLow,
      payoutHigh: l.payoutHigh,
      deadline: l.deadline,
    }));
}
