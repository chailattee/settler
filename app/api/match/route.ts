import { NextResponse } from "next/server";
import { readStore, readSettlements } from "@/lib/store";

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

export async function GET() {
  const store = await readStore();
  return NextResponse.json({ matches: store.matches });
}
