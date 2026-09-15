/**
 * A two-method window onto Postgres.
 *
 * Everything in lib/db/repo.ts is written against this, in plain
 * parameterised SQL, for one reason: the tests run the same statements
 * against an embedded Postgres (PGlite) that production runs against Neon or
 * Supabase. No mock database, no second implementation of the loyalty rules
 * that can quietly drift from the real one — if a unique index or a FOR
 * UPDATE is wrong, the test fails for the same reason production would.
 */
export type Db = {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
  /** everything inside commits together, or none of it does */
  tx<T>(fn: (db: Db) => Promise<T>): Promise<T>;
};

type PostgresSql = {
  unsafe: (text: string, params?: unknown[]) => Promise<unknown>;
  begin: <T>(fn: (sql: PostgresSql) => Promise<T>) => Promise<T>;
};

/** the `postgres` driver, as used in the app */
export function fromPostgres(sql: PostgresSql): Db {
  return {
    async query<T>(text: string, params: unknown[] = []) {
      const rows = (await sql.unsafe(text, params)) as unknown as T[];
      return rows;
    },
    tx<T>(fn: (db: Db) => Promise<T>) {
      return sql.begin((scoped) => fn(fromPostgres(scoped)));
    },
  };
}
