import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { buildRecordScores, buildSettleMatch } from "@daily-walrus/contract";
import { getPool } from "@daily-walrus/db";
import { indexOnce } from "./event-indexer.js";
import { syncGlobalWorldCupMemory } from "./global-world-cup-memory.js";
import { getSuiGrpcClient } from "./sui-clients.js";
import { syncUserPredictionMemory } from "./user-prediction-memory.js";

type PredictionPayload = { a?: number | string; b?: number | string };

interface PredictionRow {
  id: string;
  kind: string;
  payload: PredictionPayload;
  sui_address: string;
  home_score: number | null;
  away_score: number | null;
}

export interface ManualScoreInput {
  predictionId: string;
  points: number;
  correct: boolean;
}

export interface ScoreMatchInput {
  matchId: string;
  homeScore?: number;
  awayScore?: number;
  manualScores?: ManualScoreInput[];
  execute?: boolean;
  settle?: boolean;
}

export interface ScoreEntryDto {
  predictionId: string;
  user: string;
  kind: string;
  points: number;
  correct: boolean;
  result: "correct" | "wrong";
  reason: string;
}

export interface ScoreMatchResult {
  mode: "dry_run" | "execute";
  matchId: string;
  entries: ScoreEntryDto[];
  skipped: Array<{ predictionId: string; kind: string; reason: string }>;
  txDigest: string | null;
  settleTxDigest: string | null;
  totalPoints: number;
  indexed: number;
}

function signerFromEnv(): Ed25519Keypair {
  const secret = process.env.ORACLE_WALLET_KEY ?? process.env.SESSION_WALLET_KEY;
  if (!secret) throw new Error("ORACLE_WALLET_KEY or SESSION_WALLET_KEY required for execute");
  return Ed25519Keypair.fromSecretKey(secret);
}

function digestFromResult(result: { Transaction?: { digest: string; status?: { success?: boolean; error?: unknown } }; FailedTransaction?: { digest: string; status?: { success?: boolean; error?: unknown } } }): string {
  const tx = result.Transaction ?? result.FailedTransaction;
  if (!tx) throw new Error("missing transaction result");
  if (result.FailedTransaction || tx.status?.success === false) {
    throw new Error(`transaction failed: ${String(tx.status?.error ?? "unknown")}`);
  }
  return tx.digest;
}

function toNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function outcome(home: number, away: number): "home" | "away" | "draw" {
  if (home === away) return "draw";
  return home > away ? "home" : "away";
}

function gradeScoreline(row: PredictionRow, homeScore: number, awayScore: number): ScoreEntryDto {
  const predictedHome = toNumber(row.payload?.a);
  const predictedAway = toNumber(row.payload?.b);
  if (predictedHome == null || predictedAway == null) {
    return {
      predictionId: row.id,
      user: row.sui_address,
      kind: row.kind,
      points: 0,
      correct: false,
      result: "wrong",
      reason: "bad-payload",
    };
  }

  const exact = predictedHome === homeScore && predictedAway === awayScore;
  const side = outcome(predictedHome, predictedAway) === outcome(homeScore, awayScore);
  const points = exact ? 10 : side ? 3 : 0;
  const correct = exact || side;

  return {
    predictionId: row.id,
    user: row.sui_address,
    kind: row.kind,
    points,
    correct,
    result: correct ? "correct" : "wrong",
    reason: exact ? "exact-scoreline" : side ? "correct-result" : "wrong-result",
  };
}

async function loadPendingPredictions(matchId: string): Promise<PredictionRow[]> {
  const { rows } = await getPool().query(
    `select p.id, p.kind, p.payload, u.sui_address, f.home_score, f.away_score
     from predictions p
     join users u on u.id = p.user_id
     join fixtures f on f.match_id = p.match_id
     where p.match_id = $1
       and p.result = 'pending'
       and p.oracle_status = 'pending'
     order by p.created_at asc`,
    [matchId],
  );
  return rows.map((row) => ({
    id: String(row.id),
    kind: String(row.kind),
    payload: (row.payload ?? {}) as PredictionPayload,
    sui_address: String(row.sui_address),
    home_score: toNumber(row.home_score),
    away_score: toNumber(row.away_score),
  }));
}

function buildEntries(
  rows: PredictionRow[],
  input: ScoreMatchInput,
): { entries: ScoreEntryDto[]; skipped: ScoreMatchResult["skipped"] } {
  const manual = new Map((input.manualScores ?? []).map((score) => [score.predictionId, score]));
  const entries: ScoreEntryDto[] = [];
  const skipped: ScoreMatchResult["skipped"] = [];

  for (const row of rows) {
    const manualScore = manual.get(row.id);
    if (manualScore) {
      entries.push({
        predictionId: row.id,
        user: row.sui_address,
        kind: row.kind,
        points: Math.max(0, Math.floor(manualScore.points)),
        correct: Boolean(manualScore.correct),
        result: manualScore.correct ? "correct" : "wrong",
        reason: "manual-score",
      });
      continue;
    }

    if (row.kind !== "scoreline") {
      skipped.push({ predictionId: row.id, kind: row.kind, reason: "manual-score-required" });
      continue;
    }

    const homeScore = input.homeScore ?? row.home_score;
    const awayScore = input.awayScore ?? row.away_score;
    if (homeScore == null || awayScore == null) {
      skipped.push({ predictionId: row.id, kind: row.kind, reason: "match-result-required" });
      continue;
    }

    entries.push(gradeScoreline(row, homeScore, awayScore));
  }

  return { entries, skipped };
}

async function createScoreRun(input: ScoreMatchInput, entries: ScoreEntryDto[], mode: "dry_run" | "execute"): Promise<string> {
  const { rows } = await getPool().query(
    `insert into score_runs(match_id, mode, status, prediction_ids, entries_count, total_points)
     values ($1, $2, $3, $4::jsonb, $5, $6)
     returning id`,
    [
      input.matchId,
      mode,
      mode === "execute" ? "planned" : "recorded",
      JSON.stringify(entries.map((entry) => entry.predictionId)),
      entries.length,
      entries.reduce((sum, entry) => sum + entry.points, 0),
    ],
  );
  return String(rows[0].id);
}

async function reserveEntries(runId: string, entries: ScoreEntryDto[]): Promise<void> {
  const ids = entries.map((entry) => entry.predictionId);
  const { rowCount } = await getPool().query(
    `update predictions
     set oracle_status = 'reserved',
         oracle_error = null
     where id = any($1::uuid[])
       and oracle_status = 'pending'
     returning id`,
    [ids],
  );
  if (rowCount !== entries.length) throw new Error("some predictions were already reserved or scored");

  await getPool().query(
    `update score_runs
     set status = 'reserved', updated_at = now()
     where id = $1`,
    [runId],
  );
}

async function releaseEntries(entries: ScoreEntryDto[], error: string): Promise<void> {
  await getPool().query(
    `update predictions
     set oracle_status = 'pending',
         oracle_error = $2
     where id = any($1::uuid[])
       and oracle_status = 'reserved'`,
    [entries.map((entry) => entry.predictionId), error.slice(0, 500)],
  );
}

async function markEntriesRecorded(entries: ScoreEntryDto[], txDigest: string): Promise<void> {
  for (const entry of entries) {
    await getPool().query(
      `update predictions
       set result = $2,
           scored_at = now(),
           oracle_status = 'recorded',
           oracle_points = $3,
           oracle_correct = $4,
           oracle_tx_digest = $5,
           oracle_error = null,
           oracle_scored_at = now()
       where id = $1`,
      [entry.predictionId, entry.result, entry.points, entry.correct, txDigest],
    );
  }
}

async function updateFixtureResult(input: ScoreMatchInput): Promise<void> {
  if (input.homeScore == null || input.awayScore == null) return;
  await getPool().query(
    `update fixtures
     set status = 'finished',
         home_score = $2,
         away_score = $3,
         updated_at = now()
     where match_id = $1`,
    [input.matchId, input.homeScore, input.awayScore],
  );
}

async function syncScheduleMemoryAfterScore(matchId: string): Promise<void> {
  try {
    await syncGlobalWorldCupMemory({ reason: `score:${matchId}`, force: true });
  } catch (error) {
    console.error("[score] global memory sync failed:", error instanceof Error ? error.message : error);
  }
}

async function syncUserMemoriesAfterScore(entries: ScoreEntryDto[]): Promise<void> {
  const users = [...new Set(entries.map((entry) => entry.user).filter((user) => user.startsWith("0x")))];
  const results = await Promise.allSettled(users.map((user) => syncUserPredictionMemory(user)));
  for (const result of results) {
    if (result.status === "rejected") {
      console.error("[score] user prediction memory sync failed:", result.reason instanceof Error ? result.reason.message : result.reason);
    }
  }
}

export async function scoreMatch(input: ScoreMatchInput): Promise<ScoreMatchResult> {
  const matchId = String(input.matchId ?? "").trim();
  if (!matchId) throw new Error("matchId required");

  const rows = await loadPendingPredictions(matchId);
  const { entries, skipped } = buildEntries(rows, { ...input, matchId });
  const totalPoints = entries.reduce((sum, entry) => sum + entry.points, 0);
  const mode = input.execute ? "execute" : "dry_run";

  if (!input.execute) {
    if (entries.length > 0) await createScoreRun({ ...input, matchId }, entries, "dry_run");
    return { mode, matchId, entries, skipped, txDigest: null, settleTxDigest: null, totalPoints, indexed: 0 };
  }

  const runId = await createScoreRun({ ...input, matchId }, entries, "execute");
  if (entries.length === 0) {
    await updateFixtureResult({ ...input, matchId });
    let settleTxDigest: string | null = null;
    if (input.settle) {
      const signer = signerFromEnv();
      const sui = getSuiGrpcClient();
      const settleResult = await sui.signAndExecuteTransaction({
        transaction: buildSettleMatch(BigInt(matchId)),
        signer,
        include: { effects: true, events: true },
      });
      settleTxDigest = digestFromResult(settleResult);
    }
    await getPool().query(
      `update score_runs
       set status = 'recorded',
           settle_tx_digest = $2,
           updated_at = now()
       where id = $1`,
      [runId, settleTxDigest],
    );
    const { indexed } = await indexOnce();
    await syncScheduleMemoryAfterScore(matchId);
    return { mode, matchId, entries, skipped, txDigest: null, settleTxDigest, totalPoints, indexed };
  }

  await reserveEntries(runId, entries);

  let txDigest: string | null = null;
  let settleTxDigest: string | null = null;
  try {
    await updateFixtureResult({ ...input, matchId });
    const signer = signerFromEnv();
    const sui = getSuiGrpcClient();
    const tx = buildRecordScores({
      users: entries.map((entry) => entry.user),
      points: entries.map((entry) => entry.points),
      correct: entries.map((entry) => entry.correct),
    });
    const scoreResult = await sui.signAndExecuteTransaction({
      transaction: tx,
      signer,
      include: { effects: true, events: true },
    });
    txDigest = digestFromResult(scoreResult);
    await markEntriesRecorded(entries, txDigest);

    if (input.settle) {
      try {
        const settleResult = await sui.signAndExecuteTransaction({
          transaction: buildSettleMatch(BigInt(matchId)),
          signer,
          include: { effects: true, events: true },
        });
        settleTxDigest = digestFromResult(settleResult);
      } catch (error) {
        console.warn("[score] settle failed:", error instanceof Error ? error.message : error);
      }
    }

    await getPool().query(
      `update score_runs
       set status = 'recorded',
           tx_digest = $2,
           settle_tx_digest = $3,
           updated_at = now()
       where id = $1`,
      [runId, txDigest, settleTxDigest],
    );

    const { indexed } = await indexOnce();
    await syncScheduleMemoryAfterScore(matchId);
    await syncUserMemoriesAfterScore(entries);
    return { mode, matchId, entries, skipped, txDigest, settleTxDigest, totalPoints, indexed };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await releaseEntries(entries, message);
    await getPool().query(
      `update score_runs
       set status = 'failed',
           tx_digest = $2,
           error = $3,
           updated_at = now()
       where id = $1`,
      [runId, txDigest, message.slice(0, 500)],
    );
    throw error;
  }
}
