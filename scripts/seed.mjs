// Seed demo data so the app is usable before Gmail/upload ingestion exists.
// Run: npm run seed
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const store = {
  purchases: [
    {
      id: "p1",
      source: "gmail",
      vendor: "DemoCorp",
      date: "2023-11-14",
      amountUsd: 89.99,
      items: ["DemoCorp SmartHub 2"],
      rawRef: "gmail:msg_demo_1",
    },
    {
      id: "p2",
      source: "gmail",
      vendor: "Instacart",
      date: "2024-05-02",
      amountUsd: 6.49,
      items: ["FizzCo All Natural Cola 12-pack", "FizzCo All Natural Lemon-Lime"],
      rawRef: "gmail:msg_demo_2",
    },
    {
      id: "p3",
      source: "upload",
      vendor: "Streamly",
      date: "2023-02-11",
      amountUsd: 12.99,
      items: ["Streamly Premium monthly renewal"],
      rawRef: "statement-feb-2023.pdf",
    },
  ],
  matches: [
    {
      settlementId: "democorp",
      eligible: true,
      confidence: "high",
      whyQualified: [
        "Order confirmation shows a DemoCorp purchase on Nov 14, 2023 — inside the class period",
        "Purchase amount $89.99 qualifies for the receipt-backed tier",
      ],
      evidence: ["p1"],
      uncertainties: [],
      estPayoutUsd: "up to $125",
      decision: "pending",
    },
    {
      settlementId: "fizzco-labeling",
      eligible: true,
      confidence: "medium",
      whyQualified: [
        "Instacart receipt from May 2024 includes two FizzCo 'All Natural' items",
      ],
      evidence: ["p2"],
      uncertainties: [
        "Receipt shows 2 units; claiming more requires additional receipts",
      ],
      estPayoutUsd: "$2 per unit, up to $40",
      decision: "pending",
    },
    {
      settlementId: "streamly-autorenew",
      eligible: true,
      confidence: "low",
      whyQualified: [
        "Statement shows a Streamly renewal charge in Feb 2023 — inside the class period",
      ],
      evidence: ["p3"],
      uncertainties: [
        "Requires California residency at time of charge — not verifiable from the statement",
      ],
      estPayoutUsd: "up to $32",
      decision: "pending",
    },
  ],
  claims: [],
};

const dest = path.join(process.cwd(), "data", "store.json");
await mkdir(path.dirname(dest), { recursive: true });
await writeFile(dest, JSON.stringify(store, null, 2));
console.log(`Seeded ${dest}: ${store.purchases.length} purchases, ${store.matches.length} pending matches`);
