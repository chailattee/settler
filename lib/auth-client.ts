import { createAuthClient } from "better-auth/react";
import { GMAIL_SCOPES } from "@/lib/constants";

export const authClient = createAuthClient();

export const { useSession, signIn, signOut } = authClient;

/** Kick off Google sign-in, requesting Gmail read (receipt scan) + compose
 *  (draft follow-up emails) in the same consent flow. On return the user lands
 *  on the scan page. */
export function connectGmail(callbackURL = "/scan") {
  return authClient.signIn.social({
    provider: "google",
    scopes: GMAIL_SCOPES,
    callbackURL,
  });
}
