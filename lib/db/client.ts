import "server-only";

import postgres from "postgres";

/**
 * The database handle.
 *
 * Plain Postgres over the `postgres` driver, so this runs unchanged on Neon,
 * Supabase, Vercel Postgres or a box in a cupboard — there is no provider SDK
 * anywhere in the codebase to migrate away from later.
 *
 * `server-only` at the top makes importing this from a client component a
 * build error rather than a leaked connection string.
 */
declare global {
  var __parisBitesSql: postgres.Sql | undefined;
}

export type Sql = postgres.Sql;

/** true when a database is configured; the site still sells without one */
export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * Lazily opened, and cached on globalThis so `next dev`'s module reloading
 * cannot leak a new pool on every edit. Serverless invocations reuse the
 * warm one; `max: 1` keeps a burst of lambdas from exhausting Postgres.
 */
export function db(): Sql {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  if (!globalThis.__parisBitesSql) {
    // every hosted Postgres wants TLS; a local one has no certificate at all
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);

    globalThis.__parisBitesSql = postgres(url, {
      max: 1,
      /* Opening a connection costs a TCP handshake, a TLS handshake and
         authentication — measured at ~3.8s to a database on the other side of
         the world, against 340ms for a query on an open one. The old 20s idle
         timeout meant the admin panel paid that almost every time somebody
         confirmed an order, because a minute passes between taps. Holding the
         connection for half an hour turns all of those into warm requests.

         Safe on serverless: an idle instance is frozen or recycled by the
         platform long before this matters, and the pooler reclaims anything
         left behind. */
      idle_timeout: 1800,
      connect_timeout: 10,
      prepare: false, // transaction poolers (Supavisor, pgbouncer) reject prepares
      ssl: local ? false : "require",
    });
  }
  return globalThis.__parisBitesSql;
}
