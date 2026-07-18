import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getPurchases } from "@/lib/store";

/** GET /api/purchases -> purchases scanned for the signed-in user (or demo). */
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  const userId = session?.user?.id ?? "demo";
  const purchases = await getPurchases(userId);
  return Response.json({ purchases });
}
