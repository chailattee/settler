import { env } from "@/lib/env";

/** Minimal Supabase data client over PostgREST (REST), no SDK.
 *
 *  We only need select / insert / upsert / delete for a handful of tables, so
 *  a fetch wrapper is lighter than pulling in @supabase/supabase-js and avoids
 *  touching package.json while the tree is being reinstalled.
 *
 *  Table schema lives in supabase/schema.sql — run it once in the Supabase SQL
 *  editor before using these routes. */

function headers(extra?: Record<string, string>): Record<string, string> {
  const key = env.supabaseKey();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

function url(table: string, query = ""): string {
  return `${env.supabaseUrl()}/rest/v1/${table}${query ? `?${query}` : ""}`;
}

async function handle(res: Response, ctx: string) {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Supabase ${ctx} ${res.status}: ${body.slice(0, 500)}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

/** Select rows. `query` is a raw PostgREST query string, e.g.
 *  "select=*&user_id=eq.123&order=date.desc". */
export async function select<T>(table: string, query = "select=*"): Promise<T[]> {
  const res = await fetch(url(table, query), { headers: headers(), cache: "no-store" });
  return handle(res, `select ${table}`);
}

/** Insert rows, returning the inserted representation. */
export async function insert<T>(table: string, rows: T | T[]): Promise<T[]> {
  const res = await fetch(url(table), {
    method: "POST",
    headers: headers({ Prefer: "return=representation" }),
    body: JSON.stringify(Array.isArray(rows) ? rows : [rows]),
  });
  return handle(res, `insert ${table}`);
}

/** Upsert on the primary key (or a unique index). */
export async function upsert<T>(table: string, rows: T | T[]): Promise<T[]> {
  const res = await fetch(url(table), {
    method: "POST",
    headers: headers({ Prefer: "return=representation,resolution=merge-duplicates" }),
    body: JSON.stringify(Array.isArray(rows) ? rows : [rows]),
  });
  return handle(res, `upsert ${table}`);
}

/** Patch rows matched by `filter` (a PostgREST query string). */
export async function update<T>(table: string, filter: string, patch: Partial<T>): Promise<T[]> {
  const res = await fetch(url(table, filter), {
    method: "PATCH",
    headers: headers({ Prefer: "return=representation" }),
    body: JSON.stringify(patch),
  });
  return handle(res, `update ${table}`);
}

/** True if Supabase env is configured. Lets routes fall back to in-memory. */
export function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}
