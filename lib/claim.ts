import { chatJSON } from "@/lib/openrouter";
import { braveSearch, firecrawlScrape, braveConfigured } from "@/lib/websearch";
import type { StoredMatch, StoredPurchase } from "@/lib/store";

/** Claim preparation: for a matched lawsuit, find WHERE to act (an official
 *  settlement claim form, or a "register interest / join" page for cases without
 *  a settlement yet) and AUTOFILL as much of it as we can from the user's
 *  identity + the purchase evidence.
 *
 *  We never submit — the output is a draft the human reviews, attests, and
 *  files themselves (claims are signed under penalty of perjury). */

export type SubmitType = "claim" | "interest" | "watch";

export interface Submission {
  /** claim = official settlement claim form; interest = law-firm sign-up for an
   *  ongoing case; watch = nothing to do yet. */
  submitType: SubmitType;
  submitUrl: string | null;
  /** Field labels the form asks for (best effort). */
  requiredFields: string[];
  instructions: string;
  deadline: string | null;
}

export interface AutofillField {
  label: string;
  value: string;
  source: "identity" | "purchase" | "case";
}

export interface ClaimDraft {
  submission: Submission;
  /** Prefilled fields — same {label,value} shape the claims UI renders. */
  enteredData: AutofillField[];
  /** Field labels we couldn't fill; the user must supply these. */
  missing: string[];
}

export interface Identity {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

const SUBMISSION_SCHEMA = {
  name: "claim_submission",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      submitType: { type: "string", enum: ["claim", "interest", "watch"] },
      submitUrl: { type: ["string", "null"] },
      requiredFields: { type: "array", items: { type: "string" } },
      instructions: { type: "string" },
      deadline: { type: ["string", "null"] },
    },
    required: ["submitType", "submitUrl", "requiredFields", "instructions", "deadline"],
  },
} as const;

const SUBMISSION_SYSTEM =
  "You determine how a consumer can act on a class action relevant to their " +
  "purchase, from web search/scraped pages. Decide submitType:\n" +
  "- 'claim': there is an OPEN official settlement with a claim form the buyer " +
  "can file now. submitUrl = the official claim-filing page (a settlement " +
  "administrator site, not a news article).\n" +
  "- 'interest': no settlement to claim yet, but the plaintiff law firm has a " +
  "'join'/'sign up'/'register'/'contact us' page to register interest for a " +
  "future recovery. submitUrl = that sign-up page.\n" +
  "- 'watch': nothing actionable exists yet. submitUrl = null.\n" +
  "Also return requiredFields (labels the form asks for, e.g. 'Full name', " +
  "'Email', 'Proof of purchase', 'Amount', 'Claimant ID'), one-line " +
  "instructions, and the claim deadline (ISO date or null). Never invent a URL — " +
  "use null if you don't see a real one.";

/** Find the claim/interest destination for a match. */
export async function discoverSubmission(match: StoredMatch): Promise<Submission> {
  // If web discovery already found an official claim URL for an open settlement,
  // trust it directly.
  if (match.claim_url && match.stage === "settlement_open") {
    return {
      submitType: "claim",
      submitUrl: match.claim_url,
      requiredFields: ["Full name", "Email", "Mailing address", "Proof of purchase"],
      instructions: "File on the official settlement site; attach your receipt as proof of purchase.",
      deadline: match.deadline,
    };
  }

  if (!braveConfigured()) {
    return {
      submitType: match.stage === "settlement_open" ? "claim" : "watch",
      submitUrl: match.claim_url ?? null,
      requiredFields: [],
      instructions: match.claim_url
        ? "Open the linked page to file."
        : "Web search is not configured, so no submission link was found.",
      deadline: match.deadline,
    };
  }

  const intent =
    match.stage === "ongoing" || match.stage === "settlement_upcoming"
      ? "join sign up register interest attorney"
      : "settlement claim form file a claim";
  const query = `${match.brand} ${match.title} class action ${intent}`;

  const results = await braveSearch(query, 6).catch(() => []);
  if (results.length === 0) {
    return {
      submitType: "watch",
      submitUrl: null,
      requiredFields: [],
      instructions: "No submission or sign-up page found yet.",
      deadline: match.deadline,
    };
  }

  const top = results.slice(0, 3);
  const scraped = await Promise.all(top.map((r) => firecrawlScrape(r.url).catch(() => "")));
  const context = top
    .map((r, i) => `\n\n## ${r.title} (${r.url})\n${scraped[i] || r.description}`)
    .join("");

  try {
    return await chatJSON<Submission>(
      [
        { role: "system", content: SUBMISSION_SYSTEM },
        {
          role: "user",
          content:
            `Lawsuit: ${match.title} (brand ${match.brand}, stage ${match.stage})\n` +
            `Case URL: ${match.url}\n\nWeb context:\n${context}`.slice(0, 14000),
        },
      ],
      SUBMISSION_SCHEMA,
    );
  } catch {
    return {
      submitType: match.stage === "settlement_open" ? "claim" : "watch",
      submitUrl: match.claim_url ?? null,
      requiredFields: [],
      instructions: "Couldn't parse a submission page; open the case link to check manually.",
      deadline: match.deadline,
    };
  }
}

/** Build the autofill draft from identity + the purchases behind this match. */
export function buildAutofill(
  match: StoredMatch,
  purchases: StoredPurchase[],
  identity: Identity,
): { enteredData: AutofillField[]; missing: string[] } {
  const filled: AutofillField[] = [];
  const missing: string[] = [];

  const add = (label: string, value: string | null | undefined, source: AutofillField["source"]) => {
    if (value && value.trim()) filled.push({ label, value: value.trim(), source });
    else missing.push(label);
  };

  // Claimant identity
  add("Full name", identity.name, "identity");
  add("Email", identity.email, "identity");
  add("Mailing address", identity.address, "identity");
  add("Phone", identity.phone, "identity");

  // Purchase evidence (a claim usually needs proof of the qualifying purchase)
  const items = purchases.map((p) => p.item).filter(Boolean);
  const merchants = [...new Set(purchases.map((p) => p.merchant).filter(Boolean))];
  const total = purchases.reduce((s, p) => s + (p.amount || 0), 0);
  const dates = purchases.map((p) => p.date).filter(Boolean).sort();

  add("Product(s) purchased", items.join("; "), "purchase");
  add("Retailer", merchants.join(", "), "purchase");
  add("Purchase date", dates[0] ?? "", "purchase");
  add("Amount", total > 0 ? `$${total.toFixed(2)}` : "", "purchase");

  // Case reference
  add("Settlement / case", match.title, "case");

  return { enteredData: filled, missing };
}

/** Build a copy-paste-ready packet: a labeled block the user pastes field-by-
 *  field into the real form, plus the deep link and what's still needed. This
 *  is the Phase-2 "how the draft gets onto the form" — no browser automation. */
export function buildPacket(input: {
  title: string;
  brand: string;
  submitType: SubmitType;
  submitUrl: string | null;
  instructions: string;
  deadline: string | null;
  enteredData: AutofillField[];
  missing: string[];
}): string {
  const lines: string[] = [];
  lines.push(`# ${input.title}`);
  if (input.instructions) lines.push("", input.instructions);

  if (input.enteredData.length) {
    lines.push("", "## Copy these into the form", "");
    const width = Math.max(...input.enteredData.map((f) => f.label.length));
    for (const f of input.enteredData) lines.push(`${f.label.padEnd(width)} : ${f.value}`);
  }

  if (input.missing.length) {
    lines.push("", "## You still need to add", ...input.missing.map((m) => `- ${m}`));
  }

  lines.push("");
  if (input.submitType === "watch" || !input.submitUrl) {
    lines.push("No claim or sign-up page is available yet — we'll keep watching this case.");
  } else {
    const verb = input.submitType === "claim" ? "File your claim here" : "Register your interest here";
    lines.push(`${verb}: ${input.submitUrl}`);
    if (input.deadline) lines.push(`Deadline: ${input.deadline}`);
    lines.push("", "Review every field, then attest and submit yourself.");
  }

  return lines.join("\n");
}

/** Prepare a full claim draft: discover where to act + autofill it. */
export async function prepareClaim(
  match: StoredMatch,
  purchases: StoredPurchase[],
  identity: Identity,
): Promise<ClaimDraft> {
  const submission = await discoverSubmission(match);
  const { enteredData, missing } = buildAutofill(match, purchases, identity);
  return { submission, enteredData, missing };
}
