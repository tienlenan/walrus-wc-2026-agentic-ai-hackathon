import { ids, Kind } from "@daily-walrus/contract";
import { getPool } from "@daily-walrus/db";
import { queryMoveEvents, type ChainEvent, type ChainEventCursor } from "./sui-events.js";

type JsonRecord = Record<string, unknown>;

const LOOP_MS = Number(process.env.WC_INDEXER_INTERVAL_MS ?? 15_000);

const eventType = (name: string) => `${ids.pkg()}::prediction_game::${name}`;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" ? (value as JsonRecord) : {};
}

function stringField(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint" || typeof value === "boolean") return String(value);
  return fallback;
}

function numberField(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function dateFromMs(ms: unknown): string | null {
  const n = Number(ms);
  return Number.isFinite(n) && n > 0 ? new Date(n).toISOString() : null;
}

function splitLabel(label: string): { home: string; away: string } {
  const parts = label.split(/\s+(?:vs|v|VS|V)\s+/).map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) return { home: parts[0]!, away: parts.slice(1).join(" vs ") };
  return { home: label || "World Cup Match", away: "TBD" };
}

function kindName(kind: number): string {
  switch (kind) {
    case Kind.Scoreline:
      return "scoreline";
    case Kind.MatchMvp:
      return "match_mvp";
    case Kind.WorstPlayer:
      return "worst_player";
    case Kind.Champion:
      return "champion";
    case Kind.Advance:
      return "advance";
    default:
      return `kind_${kind}`;
  }
}

async function getCursor(name: string): Promise<ChainEventCursor | null> {
  const { rows } = await getPool().query("select cursor from indexer_cursor where name = $1", [name]);
  const cursor = rows[0]?.cursor as ChainEventCursor | undefined;
  return cursor?.after ? cursor : null;
}

async function setCursor(name: string, cursor: ChainEventCursor): Promise<void> {
  await getPool().query(
    `insert into indexer_cursor(name, cursor, updated_at)
     values ($1, $2::jsonb, now())
     on conflict (name) do update set cursor = excluded.cursor, updated_at = now()`,
    [name, JSON.stringify(cursor)],
  );
}

async function ensureUser(address: string): Promise<string> {
  const { rows } = await getPool().query(
    `insert into users(sui_address)
     values ($1)
     on conflict (sui_address) do update set sui_address = excluded.sui_address
     returning id`,
    [address],
  );
  return rows[0].id as string;
}

async function ensureFixture(matchId: string, label?: string, kickoffMs?: unknown, round?: unknown): Promise<void> {
  const hasSpecificLabel = Boolean(label);
  const resolvedLabel = label || `Match ${matchId}`;
  const { home, away } = splitLabel(resolvedLabel);
  await getPool().query(
    `insert into fixtures(match_id, stage, home, away, kickoff, chain_registered, updated_at)
     values ($1, $2, $3, $4, $5::timestamptz, true, now())
     on conflict (match_id) do update set
       stage = coalesce(fixtures.stage, excluded.stage),
       home = case when $6 and fixtures.home in ('TBD', 'World Cup Match') then excluded.home else fixtures.home end,
       away = case when $6 and fixtures.away in ('TBD', 'World Cup Match') then excluded.away else fixtures.away end,
       kickoff = coalesce(fixtures.kickoff, excluded.kickoff),
       chain_registered = true,
       updated_at = now()`,
    [matchId, round == null ? null : `round-${String(round)}`, home, away, dateFromMs(kickoffMs), hasSpecificLabel],
  );
}

async function handleMatchRegistered(event: ChainEvent): Promise<void> {
  const json = asRecord(event.parsedJson);
  const matchId = stringField(json.match_id ?? json.matchId);
  if (!matchId) return;
  await ensureFixture(matchId, stringField(json.label, `Match ${matchId}`), json.kickoff_ms ?? json.kickoffMs, json.round);
}

async function handleMatchSettled(event: ChainEvent): Promise<void> {
  const json = asRecord(event.parsedJson);
  const matchId = stringField(json.match_id ?? json.matchId);
  if (!matchId) return;
  await ensureFixture(matchId);
  await getPool().query("update fixtures set status = 'finished', updated_at = now() where match_id = $1", [matchId]);
}

async function handlePredictionSubmitted(event: ChainEvent): Promise<void> {
  const json = asRecord(event.parsedJson);
  const owner = stringField(json.owner);
  const matchId = stringField(json.match_id ?? json.matchId);
  const predictionId = stringField(json.prediction_id ?? json.predictionId);
  if (!owner || !matchId || !predictionId) return;

  await ensureFixture(matchId);
  const userId = await ensureUser(owner);
  const kind = numberField(json.kind);
  const payload = {
    a: numberField(json.a),
    b: numberField(json.b),
    c: numberField(json.c),
    d: numberField(json.d),
    e: numberField(json.e),
  };

  await getPool().query(
    `insert into predictions(user_id, match_id, kind, payload, chain_prediction_id, tx_digest, chain_status, created_at)
     values ($1, $2, $3, $4::jsonb, $5, $6, 'submitted', coalesce($7::timestamptz, now()))
     on conflict (chain_prediction_id) do update set
       user_id = excluded.user_id,
       match_id = excluded.match_id,
       kind = excluded.kind,
       payload = excluded.payload,
       tx_digest = excluded.tx_digest,
       chain_status = 'submitted'`,
    [
      userId,
      matchId,
      kindName(kind),
      JSON.stringify(payload),
      predictionId,
      event.id.txDigest,
      dateFromMs(json.created_ms ?? json.createdMs),
    ],
  );
}

async function handleScored(event: ChainEvent): Promise<void> {
  const json = asRecord(event.parsedJson);
  const owner = stringField(json.owner);
  if (!owner) return;

  const eventId = `${event.id.txDigest}:${event.id.eventSeq}`;
  const points = numberField(json.points);
  const correct = Boolean(json.correct);
  const streak = numberField(json.streak);
  const totalPoints = numberField(json.total_points ?? json.totalPoints);
  const scoredAt = dateFromMs(json.scored_ms ?? json.scoredMs);

  await ensureUser(owner);

  const inserted = await getPool().query(
    `insert into scoring_events(event_id, owner_address, points, correct, streak, total_points, scored_ms, tx_digest, event_seq)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     on conflict (event_id) do nothing`,
    [
      eventId,
      owner,
      points,
      correct,
      streak,
      totalPoints,
      numberField(json.scored_ms ?? json.scoredMs, 0),
      event.id.txDigest,
      event.id.eventSeq,
    ],
  );
  if (inserted.rowCount !== 1) return;

  await getPool().query(
    `update users
     set total_points = $2,
         streak = $3,
         best_streak = greatest(best_streak, $3),
         graded = graded + 1,
         correct = correct + $4,
         last_scored_at = coalesce($5::timestamptz, now())
     where sui_address = $1`,
    [owner, totalPoints, streak, correct ? 1 : 0, scoredAt],
  );
}

async function indexEventStream(name: string, moveEventName: string, handler: (event: ChainEvent) => Promise<void>): Promise<number> {
  let cursor = await getCursor(name);
  let indexed = 0;

  for (let page = 0; page < 20; page += 1) {
    const result = await queryMoveEvents({ type: eventType(moveEventName), after: cursor?.after ?? null, first: 50 });

    for (const event of result.events) {
      await handler(event);
      cursor = event.cursor;
      await setCursor(name, cursor);
      indexed += 1;
    }

    if (!result.hasNextPage || !result.nextCursor) break;
    cursor = result.nextCursor;
  }

  return indexed;
}

export async function indexOnce(): Promise<{ indexed: number }> {
  if (!process.env.DATABASE_URL) return { indexed: 0 };
  let indexed = 0;
  indexed += await indexEventStream("match_registered", "MatchRegistered", handleMatchRegistered);
  indexed += await indexEventStream("match_settled", "MatchSettled", handleMatchSettled);
  indexed += await indexEventStream("prediction_submitted", "PredictionSubmitted", handlePredictionSubmitted);
  indexed += await indexEventStream("scored", "Scored", handleScored);
  return { indexed };
}

export async function resetIndexerCursors(): Promise<number> {
  if (!process.env.DATABASE_URL) return 0;
  const { rowCount } = await getPool().query(
    "delete from indexer_cursor where name = any($1::text[])",
    [["match_registered", "match_settled", "prediction_submitted", "scored"]],
  );
  return rowCount ?? 0;
}

export function startEventIndexer(): void {
  if (!process.env.DATABASE_URL || process.env.WC_INDEXER_DISABLED === "1") {
    console.log("[indexer] disabled (DATABASE_URL missing or WC_INDEXER_DISABLED=1)");
    return;
  }

  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      const { indexed } = await indexOnce();
      if (indexed > 0) console.log(`[indexer] indexed ${indexed} event(s)`);
    } catch (error) {
      console.error("[indexer] failed:", error instanceof Error ? error.message : error);
    } finally {
      running = false;
    }
  };

  void run();
  setInterval(() => void run(), LOOP_MS);
}
