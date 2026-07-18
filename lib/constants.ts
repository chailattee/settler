/** Shared, dependency-free constants safe to import from both server and
 *  client code (keep this file free of server-only imports like the DB). */

/** Gmail read-only scope — the same Google client is reused for OAuth login
 *  and, once consented, for scanning receipt emails via the Gmail API. */
export const GMAIL_READONLY_SCOPE =
  "https://www.googleapis.com/auth/gmail.readonly";
