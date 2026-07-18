import type { PurchaseRecord } from "@/lib/types";

/** Canned purchases for demoing the workflow before Google OAuth is wired up.
 *  Brands are chosen because they have real, findable dockets on CourtListener,
 *  so the class-action lookup + classification runs live end-to-end. */
export const DEMO_PURCHASES: (PurchaseRecord & { brand: string })[] = [
  {
    id: "p_demo_1",
    brand: "Fitbit",
    merchant: "Fitbit",
    item: "Fitbit Charge 6 Fitness Tracker",
    amount: 159.95,
    date: "2024-03-12",
    source: "gmail",
    evidenceLabel: "Order confirmation",
  },
  {
    id: "p_demo_2",
    brand: "Apple",
    merchant: "Apple Store",
    item: "AirPods Pro (2nd generation)",
    amount: 249.0,
    date: "2023-11-02",
    source: "gmail",
    evidenceLabel: "Receipt",
  },
  {
    id: "p_demo_3",
    brand: "Samsung",
    merchant: "Best Buy",
    item: "Samsung 65\" QLED Smart TV",
    amount: 899.99,
    date: "2024-06-21",
    source: "gmail",
    evidenceLabel: "Order confirmation",
  },
];
