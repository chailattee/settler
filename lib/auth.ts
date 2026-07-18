import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { GMAIL_READONLY_SCOPE } from "@/lib/constants";

export { GMAIL_READONLY_SCOPE };

/** Better Auth persists users, sessions, and the Google OAuth account rows
 *  (incl. access/refresh tokens). We use the same Supabase Postgres as the rest
 *  of the app via a raw pg Pool — a file-based SQLite can't run on Vercel's
 *  read-only filesystem. The pool connects lazily, so importing this module is
 *  safe at build time even when DATABASE_URL is unset. */
const connectionString = process.env.DATABASE_URL;
const isLocal =
  !connectionString || /@(localhost|127\.0\.0\.1)/.test(connectionString);

// Reuse a single pool across hot-reloads and serverless invocations.
const g = globalThis as typeof globalThis & { __settlersAuthPool?: Pool };
const pool =
  g.__settlersAuthPool ??
  (g.__settlersAuthPool = new Pool({
    connectionString,
    max: 3,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
  }));

export const auth = betterAuth({
  database: pool,
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
    // Long-lived, rolling session: the cookie lasts 30 days, and any visit
    // more than a day old silently extends it, so active users stay signed in
    // without ever re-authenticating. The cookie is persistent (survives
    // browser restarts); a fixed BETTER_AUTH_SECRET is what keeps it valid
    // across deploys and serverless cold starts.
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // roll the expiry on activity, at most daily
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
});

export type Session = typeof auth.$Infer.Session;
