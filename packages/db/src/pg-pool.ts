import pg from "pg";

let pool: pg.Pool | undefined;

/**
 * Shared Postgres pool (Supabase). Lazy singleton.
 * Reads DATABASE_URL from env. SSL is required with Supabase.
 */
export function getPool(): pg.Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not set");
    pool = new pg.Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return pool;
}
