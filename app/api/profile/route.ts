import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getProfile, saveProfile } from "@/lib/store";

/** GET /api/profile -> the user's autofill identity (falls back to session
 *  name/email when no profile is saved yet). */
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  const userId = session?.user?.id ?? "demo";
  const profile = await getProfile(userId);
  return Response.json({
    profile: {
      name: profile?.name || session?.user?.name || "",
      email: profile?.email || session?.user?.email || "",
      phone: profile?.phone || "",
      address: profile?.address || "",
    },
  });
}

/** POST /api/profile { name?, email?, phone?, address? } -> upsert the identity
 *  used to autofill claim forms. */
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  const userId = session?.user?.id ?? "demo";
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  await saveProfile(userId, body);
  return Response.json({ ok: true });
}
