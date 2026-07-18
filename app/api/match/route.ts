import { NextResponse } from "next/server";
import { readStore, readSettlements, updateStore } from "@/lib/store";

// POST: run matching engine (purchases x settlement rules -> MatchResult[]).
// TODO: model call per settlement (lib/match.ts). Stubbed to surface store contents.
export async function POST() {
  const [store, settlements] = await Promise.all([
    readStore(),
    readSettlements(),
  ]);
  return NextResponse.json({
    todo: "matching engine not implemented",
    purchases: store.purchases.length,
    settlements: settlements.length,
    matches: store.matches,
  });
}

// GET: pending matches joined with their settlement rules — feeds the swipe deck.
export async function GET() {
  const [store, settlements] = await Promise.all([
    readStore(),
    readSettlements(),
  ]);
  const byId = new Map(settlements.map((s) => [s.id, s]));
  const cards = store.matches
    .filter((m) => m.decision === "pending")
    .map((m) => ({ match: m, settlement: byId.get(m.settlementId) ?? null }))
    .filter((c) => c.settlement);
  return NextResponse.json({ cards });
}

// PATCH { settlementId, decision: "claim" | "skip" }: record a swipe.
export async function PATCH(req: Request) {
  const { settlementId, decision } = await req.json();
  if (!settlementId || !["claim", "skip"].includes(decision)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  await updateStore((s) => {
    const match = s.matches.find((m) => m.settlementId === settlementId);
    if (match) match.decision = decision;
  });
  return NextResponse.json({ ok: true });
}
