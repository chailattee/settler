import { auth } from "@/lib/auth";

/** Gmail read-only client (REST, no googleapis SDK).
 *
 *  The Google OAuth access token is minted and refreshed by better-auth, which
 *  stored the Google account (with refresh token) at login. We ask better-auth
 *  for a fresh access token, then hit the Gmail REST API directly.
 *
 *  Scope in use: https://www.googleapis.com/auth/gmail.readonly (see lib/auth). */

const GMAIL = "https://gmail.googleapis.com/gmail/v1/users/me";

/** Priority-ordered Gmail queries. We fill the scan quota from the highest-
 *  signal source first so we pull the *relevant* emails, not the inbox:
 *
 *    1. Gmail's own "purchases" ML category — order/receipt/shipping emails.
 *    2. Known US retailers / marketplaces / delivery apps that send itemised
 *       receipts listing the actual products (Instacart, Walmart, DoorDash…).
 *    3. Keyword/sender fallback — only runs if the first two don't fill `max`.
 *
 *  Recall-biased because the LLM extractor drops non-purchases downstream
 *  (isPurchase=false), but tiering means we never waste the budget on marketing
 *  noise while real receipts exist. */
export const RECEIPT_QUERIES = [
  "category:purchases",
  "from:(instacart OR walmart OR doordash OR amazon OR target OR costco OR kroger " +
    'OR "uber eats" OR ubereats OR grubhub OR shipt OR chewy OR "best buy" OR bestbuy ' +
    "OR apple OR paypal OR ebay OR etsy OR wholefoods OR safeway OR cvs OR walgreens " +
    "OR homedepot OR lowes OR wayfair OR nike OR sephora OR ulta OR seamless OR postmates)",
  'subject:(receipt OR invoice OR "order confirmation" OR "your order" OR "order #" ' +
    'OR "order placed" OR "order number" OR purchase OR "items found" OR "order delivered" ' +
    'OR "your invoice" OR "tax invoice" OR "thank you for your order" OR "your receipt" ' +
    'OR "payment received" OR "you paid") ' +
    "OR from:(orders OR receipts OR noreply OR no-reply OR auto-confirm OR billing) " +
    "OR has:attachment filename:(pdf OR receipt OR invoice)",
];

/** Kept for backwards-compat / callers wanting a single query. */
export const RECEIPT_QUERY = RECEIPT_QUERIES.join(" OR ");

export interface GmailMessage {
  id: string;
  from: string;
  subject: string;
  date: string;
  /** Best-effort plain-text body (HTML stripped). */
  text: string;
}

/** Resolve a usable Google access token for the signed-in user. Returns null
 *  if the user isn't signed in or hasn't connected Google. */
export async function getGoogleAccessToken(headers: Headers): Promise<string | null> {
  const session = await auth.api.getSession({ headers });
  if (!session?.user?.id) return null;
  try {
    const result = await auth.api.getAccessToken({
      body: { providerId: "google", userId: session.user.id },
      headers,
    });
    return (result as { accessToken?: string })?.accessToken ?? null;
  } catch {
    return null;
  }
}

async function gfetch(token: string, path: string): Promise<Response> {
  return fetch(`${GMAIL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
}

/** List message ids matching the receipt query, capped at `max`. Pages through
 *  results (Gmail returns up to 100 ids per page) until `max` is reached. */
export async function listReceiptIds(token: string, max = 100): Promise<string[]> {
  const seen = new Set<string>();
  // Run the priority tiers in order, deduping ids, until we hit `max`. Higher
  // tiers (purchases category, known merchants) get first claim on the budget.
  for (const query of RECEIPT_QUERIES) {
    if (seen.size >= max) break;
    let pageToken = "";
    while (seen.size < max) {
      const params = new URLSearchParams({
        q: query,
        maxResults: String(Math.min(100, max - seen.size)),
      });
      if (pageToken) params.set("pageToken", pageToken);
      const res = await gfetch(token, `/messages?${params}`);
      if (!res.ok) throw new Error(`Gmail list ${res.status}: ${await res.text()}`);
      const data = (await res.json()) as {
        messages?: { id: string }[];
        nextPageToken?: string;
      };
      for (const m of data.messages ?? []) seen.add(m.id);
      if (!data.nextPageToken) break;
      pageToken = data.nextPageToken;
    }
  }
  return [...seen].slice(0, max);
}

interface Part {
  mimeType?: string;
  filename?: string;
  body?: { data?: string };
  parts?: Part[];
}

function decode(data?: string): string {
  if (!data) return "";
  try {
    return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  } catch {
    return "";
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** Walk the MIME tree and return the richest text body.
 *
 *  We prefer whichever of text/plain vs stripped-HTML is LONGER. Itemised
 *  receipts (Instacart, Walmart, DoorDash) frequently ship a sparse text/plain
 *  summary ("9 items — $42.10") while the actual product list lives only in the
 *  HTML part — so blindly preferring text/plain loses every product name. */
function extractBody(payload: Part): string {
  let plain = "";
  let html = "";
  const walk = (p: Part) => {
    if (p.mimeType === "text/plain") plain += decode(p.body?.data);
    else if (p.mimeType === "text/html") html += decode(p.body?.data);
    for (const child of p.parts ?? []) walk(child);
  };
  walk(payload);
  const stripped = stripHtml(html);
  const trimmedPlain = plain.trim();
  const body = stripped.length >= trimmedPlain.length ? stripped : trimmedPlain;
  return body.slice(0, 16000); // keep LLM prompts bounded, but fit long receipts
}

/** Fetch and parse a single message into a compact record. */
export async function getMessage(token: string, id: string): Promise<GmailMessage | null> {
  const res = await gfetch(token, `/messages/${id}?format=full`);
  if (!res.ok) return null;
  const data = (await res.json()) as {
    payload?: Part & { headers?: { name: string; value: string }[] };
    internalDate?: string;
  };
  const headers = data.payload?.headers ?? [];
  const h = (n: string) =>
    headers.find((x) => x.name.toLowerCase() === n.toLowerCase())?.value ?? "";
  return {
    id,
    from: h("from"),
    subject: h("subject"),
    date: h("date"),
    text: data.payload ? extractBody(data.payload) : "",
  };
}

/** Create a Gmail DRAFT (never sends). Used for claims with no online form/
 *  sign-up link — we compose a follow-up email the user can review and send.
 *  Requires the gmail.compose scope. Returns the draft id + a link to Gmail
 *  drafts, or null on failure. */
export async function createGmailDraft(
  token: string,
  msg: { to?: string; subject: string; body: string },
): Promise<{ id: string; url: string } | null> {
  const lines: string[] = [];
  if (msg.to) lines.push(`To: ${msg.to}`);
  // RFC 2047 encode the subject so non-ASCII survives.
  lines.push(`Subject: =?UTF-8?B?${Buffer.from(msg.subject, "utf8").toString("base64")}?=`);
  lines.push("MIME-Version: 1.0");
  lines.push('Content-Type: text/plain; charset="UTF-8"');
  lines.push("");
  lines.push(msg.body);

  const raw = Buffer.from(lines.join("\r\n"), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const res = await fetch(`${GMAIL}/drafts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ message: { raw } }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { id?: string };
  if (!data.id) return null;
  return { id: data.id, url: "https://mail.google.com/mail/u/0/#drafts" };
}

/** Full scan: list receipt ids then fetch each message (bounded concurrency). */
export async function scanReceipts(token: string, max = 100): Promise<GmailMessage[]> {
  const ids = await listReceiptIds(token, max);
  const out: GmailMessage[] = [];
  const concurrency = 5;
  for (let i = 0; i < ids.length; i += concurrency) {
    const batch = await Promise.all(ids.slice(i, i + concurrency).map((id) => getMessage(token, id)));
    for (const m of batch) if (m) out.push(m);
  }
  return out;
}
