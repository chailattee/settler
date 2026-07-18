import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/lib/db/schema";

/** Drizzle client over a Supabase Postgres connection (postgres.js driver).
 *
 *  DATABASE_URL is the Supabase connection string — use a pooler URL
 *  (…pooler.supabase.com). `prepare: false` keeps it compatible with the
 *  transaction pooler (port 6543); it's harmless on the session pooler (5432).
 *
 *  Cached on globalThis so Next dev's hot-reload doesn't open a new pool per
 *  request. Null when DATABASE_URL is unset — the store then falls back to its
 *  in-memory map. */

const url = process.env.DATABASE_URL;

const g = globalThis as typeof globalThis & {
  __settlersDb?: ReturnType<typeof drizzle<typeof schema>>;
  __settlersSql?: ReturnType<typeof postgres>;
};

function make() {
  const sql = (g.__settlersSql ??= postgres(url!, { prepare: false }));
  return (g.__settlersDb ??= drizzle(sql, { schema }));
}

export const db = url ? make() : null;

export function dbConfigured(): boolean {
  return db !== null;
}
