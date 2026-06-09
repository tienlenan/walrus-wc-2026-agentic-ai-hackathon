import { getPool } from "@daily-walrus/db";
import { indexOnce, resetIndexerCursors } from "../services/event-indexer.js";

async function countRows(table: string): Promise<number> {
  const { rows } = await getPool().query(`select count(*)::int as count from ${table}`);
  return Number(rows[0]?.count ?? 0);
}

const reset = await resetIndexerCursors();
const result = await indexOnce();

console.log(
  JSON.stringify(
    {
      resetCursors: reset,
      indexed: result.indexed,
      counts: {
        fixtures: await countRows("fixtures"),
        predictions: await countRows("predictions"),
        scoringEvents: await countRows("scoring_events"),
        cursors: await countRows("indexer_cursor"),
      },
    },
    null,
    2,
  ),
);

await getPool().end();
