import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getGoogleAccessToken } from "@/lib/gmail";
import { runWorkflow, runDemo } from "@/lib/workflow";
import { sseResponse } from "@/lib/events";
import { DEMO_PURCHASES } from "@/lib/demo";

/** POST /api/workflow  ->  Server-Sent Events stream of the agentic run.
 *
 *  Body (JSON, all optional):
 *    { demo?: boolean, maxEmails?: number, minConfidence?: number }
 *
 *  Behaviour:
 *    - Signed in with Google + demo!=true  -> real Gmail scan -> classify.
 *    - demo:true OR no Google token         -> canned purchases -> classify
 *                                              (still hits CourtListener live).
 *
 *  Consume the stream from the UI with fetch + a ReadableStream reader; see
 *  API_INTEGRATION.md. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    demo?: boolean;
    maxEmails?: number;
    minConfidence?: number;
  };

  const session = await auth.api.getSession({ headers: req.headers });
  const userId = session?.user?.id ?? "demo";
  const token = body.demo ? null : await getGoogleAccessToken(req.headers);

  return sseResponse(async (emit) => {
    if (token) {
      await runWorkflow(emit, {
        userId,
        token,
        maxEmails: body.maxEmails,
        minConfidence: body.minConfidence,
      });
    } else {
      if (!body.demo) {
        emit({
          type: "status",
          step: "auth",
          message: "No Gmail connection — running with demo purchases.",
        });
      }
      await runDemo(emit, {
        userId,
        purchases: DEMO_PURCHASES,
        minConfidence: body.minConfidence,
      });
    }
  });
}
