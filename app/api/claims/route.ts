import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getMatchById, getPurchases, getProfile, saveClaim, getClaims } from "@/lib/store";
import {
  prepareClaim,
  buildPacket,
  buildFollowupEmail,
  type Identity,
  type AutofillField,
} from "@/lib/claim";
import { getGoogleAccessToken, createGmailDraft } from "@/lib/gmail";
import type { ClaimRow } from "@/lib/db/schema";

/** Attach a copy-paste packet + deep link to a stored claim row. */
function withPacket(c: ClaimRow) {
  return {
    ...c,
    packet: buildPacket({
      title: c.title,
      brand: c.brand,
      submitType: c.submitType as "claim" | "interest" | "watch",
      submitUrl: c.submitUrl,
      instructions: c.instructions,
      deadline: c.deadline,
      enteredData: c.enteredData as AutofillField[],
      missing: c.missing,
    }),
  };
}

/** GET /api/claims -> the user's queued claims (feeds the claims tab). */
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  const userId = session?.user?.id ?? "demo";
  const claims = await getClaims(userId);
  return Response.json({ claims: claims.map(withPacket) });
}

/** POST /api/claims { matchId } -> discover where to file + autofill a draft,
 *  queue it, and return the prepared claim. Never submits. */
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  const userId = session?.user?.id ?? "demo";

  const body = (await req.json().catch(() => ({}))) as { matchId?: string };
  if (!body.matchId) {
    return Response.json({ error: "matchId is required" }, { status: 400 });
  }

  const match = await getMatchById(userId, body.matchId);
  if (!match) {
    return Response.json({ error: "match not found" }, { status: 404 });
  }

  // Identity: session name/email, enriched with a saved profile (address/phone).
  const profile = await getProfile(userId);
  const identity: Identity = {
    name: profile?.name || session?.user?.name,
    email: profile?.email || session?.user?.email,
    phone: profile?.phone,
    address: profile?.address,
  };

  // Purchases behind this match (evidence to autofill).
  const all = await getPurchases(userId);
  const purchases = all.filter((p) => match.purchase_ids.includes(p.id));

  const draft = await prepareClaim(match, purchases, identity);

  // No online form/sign-up link? Auto-create a Gmail DRAFT the user can send to
  // register interest (to class counsel if we found a contact, else blank To).
  // Requires the gmail.compose scope; silently skipped without a token.
  let draftId: string | null = null;
  let draftUrl: string | null = null;
  if (!draft.submission.submitUrl) {
    const token = await getGoogleAccessToken(req.headers);
    if (token) {
      const email = buildFollowupEmail(match, purchases, identity, draft.submission.contactEmail);
      const created = await createGmailDraft(token, email).catch(() => null);
      if (created) {
        draftId = created.id;
        draftUrl = created.url;
      }
    }
  }

  const row: ClaimRow = {
    id: `c_${userId}_${match.id}`,
    userId,
    matchId: match.id,
    title: match.title,
    brand: match.brand,
    submitType: draft.submission.submitType,
    submitUrl: draft.submission.submitUrl,
    // Autofilled and waiting for the human to review + submit — never auto-filed.
    status: draft.submission.submitType === "watch" ? "queued" : "awaiting_approval",
    instructions: draft.submission.instructions,
    deadline: draft.submission.deadline,
    draftId,
    draftUrl,
    enteredData: draft.enteredData,
    missing: draft.missing,
    createdAt: new Date(),
  };
  await saveClaim(row);

  return Response.json({ claim: withPacket(row), requiredFields: draft.submission.requiredFields });
}
