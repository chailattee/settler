import { chatJSON } from "@/lib/openrouter";
import type { GmailMessage } from "@/lib/gmail";
import type { PurchaseRecord } from "@/lib/types";

/** Turn raw receipt emails into structured purchase records via the LLM.
 *
 *  The brand/merchant field is what downstream class-action lookup keys on, so
 *  we ask the model to normalise it to the manufacturer or store brand
 *  (e.g. "Fitbit", "Apple", "Samsung") rather than a payment processor. */

interface ExtractedPurchase {
  /** Normalised brand/manufacturer, best guess. "" if none found. */
  brand: string;
  /** Store/merchant the item was bought from (may equal brand). */
  merchant: string;
  item: string;
  amount: number;
  date: string; // ISO date, best effort
  isPurchase: boolean;
}

const SCHEMA = {
  name: "receipt_extraction",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      purchases: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            brand: { type: "string" },
            merchant: { type: "string" },
            item: { type: "string" },
            amount: { type: "number" },
            date: { type: "string" },
            isPurchase: { type: "boolean" },
          },
          required: ["brand", "merchant", "item", "amount", "date", "isPurchase"],
        },
      },
    },
    required: ["purchases"],
  },
} as const;

const SYSTEM =
  "You extract product purchases from receipt/order-confirmation emails. " +
  "For each distinct product line item return: brand (the manufacturer or " +
  "store brand — normalise to a clean, searchable name like 'Fitbit', " +
  "'Apple', 'Samsung'; never a payment processor like PayPal/Stripe), " +
  "merchant (where it was bought), item (short product description), amount " +
  "(USD number, 0 if unknown), date (ISO YYYY-MM-DD, best guess from the " +
  "email). Set isPurchase=false for shipping/marketing/newsletter emails that " +
  "aren't actual purchases. Only include real purchased products.";

function idFor(msgId: string, i: number): string {
  return `p_${msgId}_${i}`;
}

/** Extract purchases from a single email. */
export async function extractFromEmail(
  msg: GmailMessage,
): Promise<(PurchaseRecord & { brand: string })[]> {
  const user =
    `From: ${msg.from}\nSubject: ${msg.subject}\nDate: ${msg.date}\n\n${msg.text}`.slice(0, 8000);

  const { purchases } = await chatJSON<{ purchases: ExtractedPurchase[] }>(
    [
      { role: "system", content: SYSTEM },
      { role: "user", content: user },
    ],
    SCHEMA,
  );

  return purchases
    .filter((p) => p.isPurchase && (p.brand || p.merchant) && p.item)
    .map((p, i) => ({
      id: idFor(msg.id, i),
      merchant: p.merchant || p.brand,
      item: p.item,
      amount: Number.isFinite(p.amount) ? p.amount : 0,
      date: p.date || "",
      source: "gmail" as const,
      evidenceLabel: "Order confirmation",
      // brand is not part of the shared PurchaseRecord type; stash it so the
      // matcher can key on it without re-deriving.
      brand: p.brand || p.merchant,
    })) as (PurchaseRecord & { brand: string })[];
}

/** Extract across many emails, tolerating per-email failures. */
export async function extractPurchases(
  msgs: GmailMessage[],
): Promise<(PurchaseRecord & { brand: string })[]> {
  const results: (PurchaseRecord & { brand: string })[] = [];
  const concurrency = 4;
  for (let i = 0; i < msgs.length; i += concurrency) {
    const batch = await Promise.allSettled(
      msgs.slice(i, i + concurrency).map((m) => extractFromEmail(m)),
    );
    for (const r of batch) {
      if (r.status === "fulfilled")
        results.push(...(r.value as (PurchaseRecord & { brand: string })[]));
    }
  }
  return results;
}
