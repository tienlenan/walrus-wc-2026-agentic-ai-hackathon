// Test kết nối Postgres (Supabase). Chạy: pnpm --filter @daily-walrus/db test:connection
import pg from "pg";

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
  const { rows } = await client.query("select version() as v, current_database() as db");
  console.log("✓ Kết nối Supabase OK");
  console.log("  database:", rows[0].db);
  console.log("  server  :", String(rows[0].v).split(" on ")[0]);
  const t = await client.query(
    "select tablename from pg_tables where schemaname = 'public' order by 1",
  );
  console.log(
    "  public tables:",
    t.rows.length ? t.rows.map((r) => r.tablename).join(", ") : "(chưa có — chạy db:push)",
  );
} catch (e) {
  console.error("✗ FAIL:", e.message);
  if (/ENETUNREACH|ETIMEDOUT|EAI_AGAIN|EHOSTUNREACH/.test(String(e.message))) {
    console.error("  → direct connection là IPv6. Đổi DATABASE_URL sang Session pooler (IPv4).");
  }
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
