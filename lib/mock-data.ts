import type {
  Settlement,
  PurchaseRecord,
  MatchResult,
  ClaimRun,
} from "@/lib/types";

/** ~8 curated real open settlements + one safe fake (DemoCorp) that files
 *  against the local /mock-claim site. Dollar amounts are illustrative. */
export const settlements: Settlement[] = [
  {
    id: "democorp",
    name: "DemoCorp Data Breach Settlement",
    defendant: "DemoCorp Inc.",
    category: "Data breach",
    summary:
      "A 2024 breach exposed customer emails and order history. Safe demo case — files against Settlers's local mock site.",
    classPeriod: "Jan 2024 – Aug 2024",
    qualifyingPurchase: "Any DemoCorp account active during the class period",
    proofRequired: "Email address on file (auto-detected from your inbox)",
    payoutLow: 25,
    payoutHigh: 120,
    deadline: "2026-09-30",
    states: "All US",
    claimUrl: "/mock-claim",
    isMock: true,
  },
  {
    id: "fairlife",
    name: "Fairlife Nutrition Labeling Settlement",
    defendant: "Fairlife LLC",
    category: "Consumer product",
    summary:
      "Alleged misrepresentation of protein-shake nutrition claims. Buyers can claim without a receipt up to a household cap.",
    classPeriod: "Jan 2018 – Present",
    qualifyingPurchase: "Fairlife Core Power or nutrition shakes",
    proofRequired: "Self-attestation under cap; receipts raise the limit",
    payoutLow: 10,
    payoutHigh: 60,
    deadline: "2026-08-14",
    states: "All US",
    claimUrl: "https://example.com/fairlife-claim",
  },
  {
    id: "apple-siri",
    name: "Apple Siri Voice Privacy Settlement",
    defendant: "Apple Inc.",
    category: "Privacy",
    summary:
      "Siri allegedly recorded conversations without activation. Owners of Siri-enabled devices may qualify per device.",
    classPeriod: "Sep 2014 – Dec 2024",
    qualifyingPurchase: "iPhone, iPad, Apple Watch, HomePod, or Mac with Siri",
    proofRequired: "Device serial or purchase record",
    payoutLow: 20,
    payoutHigh: 100,
    deadline: "2026-07-30",
    states: "All US",
    claimUrl: "https://example.com/apple-siri-claim",
  },
  {
    id: "cash-app",
    name: "Cash App / Block Data Breach Settlement",
    defendant: "Block, Inc.",
    category: "Data breach",
    summary:
      "Unauthorized access to Cash App account data. Users can claim for out-of-pocket losses and lost time.",
    classPeriod: "2018 – 2023",
    qualifyingPurchase: "A Cash App account during the class period",
    proofRequired: "Account email; documented losses increase payout",
    payoutLow: 25,
    payoutHigh: 2500,
    deadline: "2026-11-18",
    states: "All US",
    claimUrl: "https://example.com/cashapp-claim",
  },
  {
    id: "turbotax",
    name: "Intuit TurboTax 'Free' Filing Settlement",
    defendant: "Intuit Inc.",
    category: "Financial",
    summary:
      "Users steered into paid TurboTax after being told filing was free. Payment amount depends on years affected.",
    classPeriod: "2016 – 2018",
    qualifyingPurchase: "Paid for TurboTax after using a 'free' entry point",
    proofRequired: "None — eligibility determined from settlement records",
    payoutLow: 29,
    payoutHigh: 85,
    deadline: "2026-10-05",
    states: "All US",
    claimUrl: "https://example.com/turbotax-claim",
  },
  {
    id: "meta-pixel",
    name: "Meta Pixel Healthcare Tracking Settlement",
    defendant: "Meta Platforms, Inc.",
    category: "Privacy",
    summary:
      "Health-site data allegedly shared with Meta via the tracking pixel. Class members with a Facebook account may qualify.",
    classPeriod: "2020 – 2024",
    qualifyingPurchase: "A Facebook account used with affected health portals",
    proofRequired: "Facebook account email",
    payoutLow: 15,
    payoutHigh: 90,
    deadline: "2026-12-01",
    states: "All US",
    claimUrl: "https://example.com/meta-pixel-claim",
  },
  {
    id: "ticketmaster",
    name: "Ticketmaster Data Incident Settlement",
    defendant: "Live Nation Entertainment",
    category: "Data breach",
    summary:
      "Ticketmaster account data exposed in a 2024 incident. Buyers can claim reimbursement and credit-monitoring.",
    classPeriod: "Apr 2024 – Jun 2024",
    qualifyingPurchase: "A Ticketmaster purchase during the incident window",
    proofRequired: "Order confirmation email",
    payoutLow: 18,
    payoutHigh: 150,
    deadline: "2026-09-12",
    states: "All US",
    claimUrl: "https://example.com/ticketmaster-claim",
  },
  {
    id: "chevy-bolt",
    name: "GM Chevrolet Bolt Battery Settlement",
    defendant: "General Motors LLC",
    category: "Auto",
    summary:
      "Bolt EV battery defect and reduced range. Owners and lessees can claim compensation and a range guarantee.",
    classPeriod: "2017 – 2022 model years",
    qualifyingPurchase: "Purchased or leased a Chevrolet Bolt EV/EUV",
    proofRequired: "VIN or purchase/lease agreement",
    payoutLow: 700,
    payoutHigh: 1400,
    deadline: "2026-08-28",
    states: "All US",
    claimUrl: "https://example.com/gm-bolt-claim",
  },
];

export const purchases: PurchaseRecord[] = [
  {
    id: "p1",
    merchant: "DemoCorp",
    item: "Annual membership renewal",
    amount: 79,
    date: "2024-03-11",
    source: "gmail",
    evidenceLabel: "Order confirmation",
  },
  {
    id: "p2",
    merchant: "Target",
    item: "Fairlife Core Power 4-pack",
    amount: 11.49,
    date: "2023-06-02",
    source: "gmail",
    evidenceLabel: "E-receipt",
  },
  {
    id: "p3",
    merchant: "Apple",
    item: "iPhone 14 Pro",
    amount: 999,
    date: "2022-10-18",
    source: "gmail",
    evidenceLabel: "Invoice",
  },
  {
    id: "p4",
    merchant: "Ticketmaster",
    item: "Concert tickets (x2)",
    amount: 214.5,
    date: "2024-05-09",
    source: "gmail",
    evidenceLabel: "Order confirmation",
  },
  {
    id: "p5",
    merchant: "Intuit TurboTax",
    item: "Deluxe federal + state",
    amount: 59,
    date: "2018-04-04",
    source: "upload",
    evidenceLabel: "PDF receipt",
  },
  {
    id: "p6",
    merchant: "Cash App",
    item: "Account statement",
    amount: 0,
    date: "2022-01-20",
    source: "gmail",
    evidenceLabel: "Statement",
  },
];

export const matches: MatchResult[] = [
  {
    id: "m1",
    settlementId: "democorp",
    confidence: 0.97,
    estPayout: 90,
    whyQualified: [
      "Active DemoCorp membership found in your inbox",
      "Renewal on 2024-03-11 falls inside the class period",
    ],
    evidence: ["p1"],
    uncertainties: [],
  },
  {
    id: "m2",
    settlementId: "ticketmaster",
    confidence: 0.91,
    estPayout: 60,
    whyQualified: [
      "Ticketmaster order on 2024-05-09 is within the incident window",
      "Order confirmation email available as proof",
    ],
    evidence: ["p4"],
    uncertainties: ["Reimbursement amount depends on documented losses"],
  },
  {
    id: "m3",
    settlementId: "fairlife",
    confidence: 0.74,
    estPayout: 24,
    whyQualified: [
      "Fairlife Core Power purchase found on a Target e-receipt",
      "No receipt needed under the household cap",
    ],
    evidence: ["p2"],
    uncertainties: [
      "Receipt shows the 4-pack but not the exact flavor line named in the notice",
    ],
  },
  {
    id: "m4",
    settlementId: "apple-siri",
    confidence: 0.68,
    estPayout: 50,
    whyQualified: [
      "iPhone 14 Pro purchase confirms a Siri-enabled device",
      "Eligible for a per-device payment",
    ],
    evidence: ["p3"],
    uncertainties: [
      "Settlement caps the number of devices per claimant at five",
    ],
  },
  {
    id: "m5",
    settlementId: "turbotax",
    confidence: 0.82,
    estPayout: 45,
    whyQualified: [
      "TurboTax Deluxe receipt from the 2018 filing season",
      "Matches the 'free-to-paid' pattern in the settlement",
    ],
    evidence: ["p5"],
    uncertainties: [],
  },
  {
    id: "m6",
    settlementId: "cash-app",
    confidence: 0.6,
    estPayout: 75,
    whyQualified: [
      "Cash App account statement found in your inbox",
      "Account was active during the breach window",
    ],
    evidence: ["p6"],
    uncertainties: [
      "Higher payouts require documented out-of-pocket losses you haven't provided",
    ],
  },
];

/** Seeded claim queue — DemoCorp is mid-filing and paused at the attest gate. */
export const claimRuns: ClaimRun[] = [
  {
    id: "c1",
    settlementId: "democorp",
    status: "awaiting_approval",
    progress: 100,
    steps: [
      { label: "Open claim site", thumb: "🌐", done: true },
      { label: "Fill contact info", thumb: "📇", done: true },
      { label: "Enter purchase details", thumb: "🧾", done: true },
      { label: "Reach certification page", thumb: "✍️", done: true },
    ],
    enteredData: [
      { label: "Full name", value: "Alex Rivera" },
      { label: "Email", value: "alex.rivera@gmail.com" },
      { label: "Member ID", value: "DC-4471-8829" },
      { label: "Purchase date", value: "Mar 11, 2024" },
      { label: "Claimed amount", value: "$90.00" },
    ],
  },
  {
    id: "c2",
    settlementId: "ticketmaster",
    status: "filling",
    progress: 45,
    steps: [
      { label: "Open claim site", thumb: "🌐", done: true },
      { label: "Fill contact info", thumb: "📇", done: true },
      { label: "Enter order number", thumb: "🎟️", done: false },
      { label: "Reach certification page", thumb: "✍️", done: false },
    ],
    enteredData: [
      { label: "Full name", value: "Alex Rivera" },
      { label: "Email", value: "alex.rivera@gmail.com" },
    ],
  },
  {
    id: "c3",
    settlementId: "turbotax",
    status: "queued",
    progress: 0,
    steps: [
      { label: "Open claim site", thumb: "🌐", done: false },
      { label: "Fill contact info", thumb: "📇", done: false },
      { label: "Enter filing year", thumb: "📅", done: false },
      { label: "Reach certification page", thumb: "✍️", done: false },
    ],
    enteredData: [],
  },
];

export function getSettlement(id: string): Settlement | undefined {
  return settlements.find((s) => s.id === id);
}

export function getPurchase(id: string): PurchaseRecord | undefined {
  return purchases.find((p) => p.id === id);
}
