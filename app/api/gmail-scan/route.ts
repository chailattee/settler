import { NextResponse } from "next/server";

// OWNER: teammate (Gmail ingestion)
// POST: OAuth'd Gmail search for receipt-like emails -> parse -> PurchaseRecord[]
// Append records via updateStore((s) => s.purchases.push(...records)) from lib/store.
export async function POST() {
  return NextResponse.json(
    { error: "gmail-scan not implemented yet" },
    { status: 501 }
  );
}
