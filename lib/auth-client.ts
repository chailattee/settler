import { createAuthClient } from "better-auth/react";
import { GMAIL_READONLY_SCOPE } from "@/lib/constants";

export const authClient = createAuthClient();

export const { useSession, signIn, signOut } = authClient;

/** Kick off Google sign-in, requesting Gmail read-only access in the same
 *  consent flow. On return the user lands on the matches page. */
export function connectGmail(callbackURL = "/matches") {
  return authClient.signIn.social({
    provider: "google",
    scopes: [GMAIL_READONLY_SCOPE],
    callbackURL,
  });
}
