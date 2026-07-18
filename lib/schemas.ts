import { z } from "zod";

/**
 * Payment Attributes — fields saved for each explicit purchase.
 * Missing values are null (shown as "none" in the UI).
 */
export const PaymentAttributesSchema = z.object({
  brand: z.string().nullable(),
  product: z.string().nullable(),
  purchaseItem: z.string().nullable(),
  transactionDate: z.string().nullable(),
  location: z.string().nullable(),
  receiptId: z.string().nullable(),
  typeOfPurchase: z.string().nullable(),
});

export type PaymentAttributes = z.infer<typeof PaymentAttributesSchema>;

export const ExtractFileResultSchema = z.object({
  hasExplicitPurchases: z.boolean(),
  purchases: z.array(PaymentAttributesSchema),
  skipReason: z.string().nullable(),
});

export type ExtractFileResult = z.infer<typeof ExtractFileResultSchema>;

export const PAYMENT_ATTRIBUTE_KEYS = [
  "brand",
  "product",
  "purchaseItem",
  "transactionDate",
  "location",
  "receiptId",
  "typeOfPurchase",
] as const satisfies ReadonlyArray<keyof PaymentAttributes>;
