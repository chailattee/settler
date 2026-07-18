import { auth } from "@/lib/auth";

/** Gmail read-only client (REST, no googleapis SDK).
 *
 *  The Google OAuth access token is minted and refreshed by better-auth, which
 *  stored the Google account (with refresh token) at login. We ask better-auth
 *  for a fresh access token, then hit the Gmail REST API directly.
 *
 *  Scope in use: https://www.googleapis.com/auth/gmail.readonly (see lib/auth). */

const GMAIL = "https://gmail.googleapis.com/gmail/v1/users/me";

/** Search query that targets receipts / order confirmations without dumping the
 *  whole inbox. Kept broad enough to catch major merchants. */
export const RECEIPT_QUERY =
  'subject:(receipt OR "order confirmation" OR "your order" OR invoice OR "order #") ' +
  'OR from:(orders OR receipts OR no-reply OR noreply OR auto-confirm)';

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

/** List message ids matching the receipt query, capped at `max`. */
export async function listReceiptIds(token: string, max = 60): Promise<string[]> {
  const ids: string[] = [];
  let pageToken = "";
  while (ids.length < max) {
    const params = new URLSearchParams({
      q: RECEIPT_QUERY,
      maxResults: String(Math.min(100, max - ids.length)),
    });
    if (pageToken) params.set("pageToken", pageToken);
    const res = await gfetch(token, `/messages?${params}`);
    if (!res.ok) throw new Error(`Gmail list ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as {
      messages?: { id: string }[];
      nextPageToken?: string;
    };
    for (const m of data.messages ?? []) ids.push(m.id);
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }
  return ids.slice(0, max);
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

/** Walk the MIME tree, preferring text/plain, falling back to stripped HTML. */
function extractBody(payload: Part): string {
  let plain = "";
  let html = "";
  const walk = (p: Part) => {
    if (p.mimeType === "text/plain") plain += decode(p.body?.data);
    else if (p.mimeType === "text/html") html += decode(p.body?.data);
    for (const child of p.parts ?? []) walk(child);
  };
  walk(payload);
  const body = plain.trim() || stripHtml(html);
  return body.slice(0, 8000); // keep LLM prompts bounded
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

/** Full scan: list receipt ids then fetch each message (bounded concurrency). */
export async function scanReceipts(token: string, max = 40): Promise<GmailMessage[]> {
  const ids = await listReceiptIds(token, max);
  const out: GmailMessage[] = [];
  const concurrency = 5;
  for (let i = 0; i < ids.length; i += concurrency) {
    const batch = await Promise.all(ids.slice(i, i + concurrency).map((id) => getMessage(token, id)));
    for (const m of batch) if (m) out.push(m);
  }
  return out;
}
