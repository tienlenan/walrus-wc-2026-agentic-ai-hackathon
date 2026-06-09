import { createHash } from "node:crypto";
import { getPool } from "@daily-walrus/db";
import { isMemoryEnabled, memNamespace, rememberBulk } from "@daily-walrus/walrus";

const syncedHashes = new Map<string, string>();

interface PredictionMemoryRow {
  id: string;
  match_id: string;
  kind: string;
  payload: unknown;
  result: string;
  tx_digest: string | null;
  oracle_status: string;
  oracle_points: string | number | null;
  oracle_correct: boolean | null;
  oracle_tx_digest: string | null;
  created_at: Date;
  home: string | null;
  away: string | null;
  kickoff: Date | null;
  status: string | null;
}

function hashDocs(docs: string[]): string {
  return createHash("sha256").update(docs.join("\n---\n")).digest("hex");
}

function shortDigest(value: string | null): string {
  return value ? `${value.slice(0, 10)}...${value.slice(-6)}` : "none";
}

function formatPayload(payload: unknown): string {
  try {
    return JSON.stringify(payload);
  } catch {
    return String(payload);
  }
}

function resultLabel(row: PredictionMemoryRow): string {
  if (row.oracle_correct === true) return "correct";
  if (row.oracle_correct === false) return "wrong";
  if (row.result && row.result !== "pending") return row.result;
  return "pending";
}

export async function getUserPredictionMemoryFacts(address: string): Promise<string[]> {
  if (!process.env.DATABASE_URL || !address.startsWith("0x")) return [];

  const userResult = await getPool().query(
    `select id, sui_address, total_points, streak, best_streak, graded, correct
     from users
     where sui_address = $1`,
    [address],
  );
  const user = userResult.rows[0];
  if (!user) return [];

  const predictionResult = await getPool().query<PredictionMemoryRow>(
    `select p.id, p.match_id, p.kind, p.payload, p.result, p.tx_digest,
       p.oracle_status, p.oracle_points, p.oracle_correct, p.oracle_tx_digest, p.created_at,
       f.home, f.away, f.kickoff, f.status
     from predictions p
     left join fixtures f on f.match_id = p.match_id
     where p.user_id = $1
     order by p.created_at desc
     limit 30`,
    [user.id],
  );

  const graded = Number(user.graded ?? 0);
  const correct = Number(user.correct ?? 0);
  const accuracy = graded > 0 ? `${Math.round((correct / graded) * 1000) / 10}%` : "not graded yet";
  const docs = [
    `[Prediction record summary] Sui address ${address} has ${predictionResult.rowCount} predictions, ${graded} graded, ${correct} correct, ${user.total_points ?? 0} total points, current streak ${user.streak ?? 0}, best streak ${user.best_streak ?? 0}, accuracy ${accuracy}. If the user asks what they predicted or whether they were right, answer from these records and roast bad calls.`,
  ];

  for (const row of predictionResult.rows) {
    const match = row.home && row.away ? `${row.home} vs ${row.away}` : `match ${row.match_id}`;
    const kickoff = row.kickoff ? row.kickoff.toISOString() : "kickoff unknown";
    const points = row.oracle_points == null ? "no points yet" : `${row.oracle_points} points`;
    docs.push(
      `[Prediction record] Prediction ${row.id}: user picked ${row.kind} for ${match} (match_id ${row.match_id}, kickoff ${kickoff}, match status ${row.status ?? "unknown"}). Payload ${formatPayload(row.payload)}. Result ${resultLabel(row)}; oracle_status ${row.oracle_status}; ${points}; prediction tx ${shortDigest(row.tx_digest)}; oracle tx ${shortDigest(row.oracle_tx_digest)}. Created ${row.created_at.toISOString()}.`,
    );
  }

  return docs;
}

export async function syncUserPredictionMemory(address: string): Promise<{ synced: boolean; factCount: number }> {
  const facts = await getUserPredictionMemoryFacts(address);
  if (!isMemoryEnabled() || facts.length === 0) return { synced: false, factCount: facts.length };

  const hash = hashDocs(facts);
  if (syncedHashes.get(address) === hash) return { synced: false, factCount: facts.length };

  await rememberBulk(memNamespace(address), facts);
  syncedHashes.set(address, hash);
  return { synced: true, factCount: facts.length };
}

