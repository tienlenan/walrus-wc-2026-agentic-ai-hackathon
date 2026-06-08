import pg from "pg";

let pool: pg.Pool | undefined;

/**
 * Shared Postgres pool (Supabase). Lazy singleton.
 * Đọc DATABASE_URL từ env. SSL bắt buộc với Supabase.
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
