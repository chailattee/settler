import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getMatches } from "@/lib/store";

/** GET /api/matches -> class-action matches found for the signed-in user (or
 *  demo). These feed the swipe deck. */
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  const userId = session?.user?.id ?? "demo";
  const matches = await getMatches(userId);
  return Response.json({ matches });
}
