// Apply sql/schema.sql lên Supabase. Chạy: pnpm --filter @daily-walrus/db db:push
import pg from "pg";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const sql = await readFile(join(here, "..", "sql", "schema.sql"), "utf8");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("✗ DATABASE_URL chưa set (cần --env-file=../../.env.local)");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 8000,
});

try {
  await client.connect();
  await client.query(sql);
  console.log("✓ Đã apply schema.sql");
  const t = await client.query(
    "select tablename from pg_tables where schemaname = 'public' order by 1",
  );
  console.log("  tables:", t.rows.map((r) => r.tablename).join(", ") || "(none)");
  const v = await client.query(
    "select table_name from information_schema.views where table_schema = 'public' order by 1",
  );
  console.log("  views :", v.rows.map((r) => r.table_name).join(", ") || "(none)");
} catch (e) {
  console.error("✗ FAIL:", e.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
