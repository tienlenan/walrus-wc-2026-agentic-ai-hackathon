import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Run with --env-file=../../.env.local.");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 8000,
});

const network = process.env.SUI_NETWORK ?? "testnet";
const graphqlUrl =
  process.env.SUI_GRAPHQL_URL ??
  {
    mainnet: "https://graphql.mainnet.sui.io/graphql",
    testnet: "https://graphql.testnet.sui.io/graphql",
    devnet: "https://graphql.devnet.sui.io/graphql",
    localnet: "http://127.0.0.1:9125/graphql",
  }[network] ??
  "https://graphql.testnet.sui.io/graphql";
const packageId =
  process.env.WC_PACKAGE_ID ?? "0x4e62c20fc179f4492d777046dccd06eebd0cedaa83511ea8fde7b8262c6a58a5";
const skipChainHistory = process.env.SKIP_CHAIN_HISTORY !== "0";

const tables = [
  "match_votes",
  "sui_output_records",
  "roasts",
  "scoring_events",
  "score_runs",
  "predictions",
  "indexer_cursor",
  "users",
];

const eventStreams = [
  ["match_registered", "MatchRegistered"],
  ["match_settled", "MatchSettled"],
  ["prediction_submitted", "PredictionSubmitted"],
  ["scored", "Scored"],
];

const query = `
  query QueryEvents($type: String!, $first: Int!, $after: String) {
    events(first: $first, after: $after, filter: { type: $type }) {
      pageInfo { hasNextPage endCursor }
    }
  }
`;

async function fetchEndCursor(moveEventName) {
  const type = `${packageId}::prediction_game::${moveEventName}`;
  let after = null;
  let lastCursor = null;
  for (let page = 0; page < 100; page += 1) {
    const response = await fetch(graphqlUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables: { type, first: 50, after } }),
    });
    if (!response.ok) throw new Error(`GraphQL ${response.status} for ${moveEventName}`);
    const result = await response.json();
    if (result.errors?.length) throw new Error(result.errors.map((error) => error.message).join("; "));
    const pageInfo = result.data?.events?.pageInfo;
    lastCursor = pageInfo?.endCursor ?? lastCursor;
    if (!pageInfo?.hasNextPage || !pageInfo?.endCursor) break;
    after = pageInfo.endCursor;
  }
  return lastCursor;
}

async function skipHistoricalEvents() {
  for (const [name, moveEventName] of eventStreams) {
    const cursor = await fetchEndCursor(moveEventName);
    if (!cursor) continue;
    await client.query(
      `insert into indexer_cursor(name, cursor, updated_at)
       values ($1, $2::jsonb, now())
       on conflict (name) do update set cursor = excluded.cursor, updated_at = now()`,
      [name, JSON.stringify({ after: cursor })],
    );
  }
}

try {
  await client.connect();
  await client.query("begin");
  await client.query(`truncate table ${tables.join(", ")} restart identity cascade`);
  if (skipChainHistory) await skipHistoricalEvents();
  await client.query("commit");
  console.log(`Cleaned app data: ${tables.join(", ")}`);
  if (skipChainHistory) console.log("Skipped historical chain events for local mirror cleanup.");
} catch (error) {
  await client.query("rollback").catch(() => {});
  console.error("Failed to clean app data:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
