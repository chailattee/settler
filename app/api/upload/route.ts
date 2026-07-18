import { NextResponse } from "next/server";

// OWNER: teammate (receipt upload ingestion)
// POST multipart form -> vision parse (PDF/image) -> PurchaseRecord[]
// Append records via updateStore((s) => s.purchases.push(...records)) from lib/store.
export async function POST() {
  return NextResponse.json(
    { error: "upload not implemented yet" },
    { status: 501 }
  );
}
