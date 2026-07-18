/** Shared, dependency-free constants safe to import from both server and
 *  client code (keep this file free of server-only imports like the DB). */

/** Gmail read-only scope — the same Google client is reused for OAuth login
 *  and, once consented, for scanning receipt emails via the Gmail API. */
export const GMAIL_READONLY_SCOPE =
  "https://www.googleapis.com/auth/gmail.readonly";

/** Gmail compose scope — lets us create DRAFT follow-up emails (users.drafts
 *  .create) for claims with no online form/sign-up link. We only ever create
 *  drafts, never send. Adding this scope requires users to re-consent. */
export const GMAIL_COMPOSE_SCOPE =
  "https://www.googleapis.com/auth/gmail.compose";

/** Both Gmail scopes requested at login. */
export const GMAIL_SCOPES = [GMAIL_READONLY_SCOPE, GMAIL_COMPOSE_SCOPE];
