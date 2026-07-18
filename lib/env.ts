/** Centralised env access for the backend. Everything here is server-only.
 *
 *  The whole backend is deliberately built on `fetch` (no SDKs) so it adds no
 *  npm dependencies — OpenRouter, Supabase (PostgREST), Gmail and CourtListener
 *  are all plain REST. That keeps the API layer decoupled from whatever the UI
 *  side is installing. */

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Missing env var ${name}. Add it to .env.local (see API.md "Required env").`,
    );
  }
  return v;
}

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const env = {
  // --- OpenRouter (LLM) ---
  openrouterKey: () => required("OPENROUTER_API_KEY"),
  // Any OpenRouter model slug. Defaults to Haiku 4.5 (fast + cheap, plenty for
  // receipt extraction and case classification). Override via OPENROUTER_MODEL.
  openrouterModel: () => optional("OPENROUTER_MODEL", "anthropic/claude-haiku-4.5"),

  // --- Supabase (data, via PostgREST) ---
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL"),
  /** Prefer the service-role key for server-side writes (bypasses RLS). Falls
   *  back to the publishable/anon key — which only works if the relevant tables
   *  have permissive RLS (fine for a hackathon with RLS disabled). */
  supabaseKey: () =>
    optional("SUPABASE_SERVICE_ROLE_KEY") ||
    optional("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ||
    required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),

  // --- CourtListener (class-action lookup) ---
  /** Optional. Without a token you get low anonymous rate limits; with one you
   *  get Free Law Project's authenticated quota. Get one at
   *  courtlistener.com/profile/api-token/ */
  courtListenerToken: () =>
    optional("COURTLISTENER_API_TOKEN") || optional("COURTLISTENER_TOKEN"),
} as const;
