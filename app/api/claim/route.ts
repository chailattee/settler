import { NextResponse } from "next/server";
import { readStore } from "@/lib/store";

// POST { settlementId }: start filing agent (lib/claim-agent.ts, Playwright + computer use).
// Hard rule: agent never attests/submits — stops at certification for human approval.
export async function POST() {
  return NextResponse.json(
    { error: "claim agent not implemented yet" },
    { status: 501 }
  );
}

// GET: poll claim runs (status + step screenshots) for the live filmstrip.
export async function GET() {
  const store = await readStore();
  return NextResponse.json({ claims: store.claims });
}
