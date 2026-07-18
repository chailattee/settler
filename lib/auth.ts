import { betterAuth } from "better-auth";
import Database from "better-sqlite3";
import path from "node:path";
import { GMAIL_READONLY_SCOPE } from "@/lib/constants";

export { GMAIL_READONLY_SCOPE };

export const auth = betterAuth({
  // A single file-based SQLite DB is plenty for a hackathon: it holds users,
  // sessions, and the OAuth account rows (incl. Google access/refresh tokens).
  database: new Database(path.join(process.cwd(), "data", "auth.db")),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      // Request Gmail read access up front alongside profile/email, and force
      // Google to return a refresh token so we can re-scan later without a
      // fresh consent screen.
      scope: [GMAIL_READONLY_SCOPE],
      accessType: "offline",
      prompt: "select_account consent",
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
});

export type Session = typeof auth.$Infer.Session;
