import { defineConfig } from "drizzle-kit";
import { readFileSync } from "node:fs";

/** drizzle-kit doesn't load .env.local automatically, so pull DATABASE_URL from
 *  it (or the process env) before configuring. Use `npm run db:push`. */
if (!process.env.DATABASE_URL) {
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const m = line.match(/^\s*DATABASE_URL\s*=\s*(.+)\s*$/);
      if (m) process.env.DATABASE_URL = m[1].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* no .env.local — rely on process env */
  }
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  // Only manage OUR tables. Without this, drizzle-kit push would try to
  // reconcile (and offer to drop) every other table in the public schema —
  // e.g. auth tables or anything the UI side created. Never let it.
  tablesFilter: ["purchases", "class_action_matches", "profiles", "claims"],
});
