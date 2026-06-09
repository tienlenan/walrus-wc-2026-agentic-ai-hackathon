import { ids } from "@daily-walrus/contract";
import { getPool } from "@daily-walrus/db";
import { getVoteSummaries, type MatchVoteSummaryDto } from "./game-votes.js";
import { queryMoveEvents } from "./sui-events.js";

export interface FixtureDto {
  matchId: string;
  stage: string | null;
  groupName: string | null;
  home: string;
  away: string;
  homeTeamCode: string | null;
  awayTeamCode: string | null;
  venue: string | null;
  city: string | null;
  kickoff: string | null;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  chainRegistered: boolean;
  predictionOpen: boolean;
  predictionStatus: "open" | "not_onchain" | "closed_finished" | "closed_kickoff" | "unknown";
  predictionClosesAt: string | null;
  predictionLockedReason: string | null;
}

export interface LeaderboardRowDto {
  userId: string;
  displayName: string | null;
  suiAddress: string;
  totalPoints: number;
  streak: number;
  bestStreak: number;
  graded: number;
  correct: number;
  accuracy: number | null;
}

export interface MyPredictionDto {
  id: string;
  matchId: string;
  kind: string;
  payload: unknown;
  result: string;
  chainStatus: string | null;
  txDigest: string | null;
  oracleStatus: string;
  oraclePoints: number | null;
  oracleCorrect: boolean | null;
  oracleTxDigest: string | null;
  createdAt: string;
}

export interface MyRecordDto {
  address: string;
  totalPoints: number;
  streak: number;
  bestStreak: number;
  graded: number;
  correct: number;
  accuracy: number | null;
  predictions: MyPredictionDto[];
}

export interface GameSnapshotDto {
  fixtures: FixtureDto[];
  leaderboard: LeaderboardRowDto[];
  votes: MatchVoteSummaryDto[];
  myRecord: MyRecordDto | null;
  updatedAt: string;
}

type JsonRecord = Record<string, unknown>;

const eventType = (name: string) => `${ids.pkg()}::prediction_game::${name}`;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" ? (value as JsonRecord) : {};
}

function str(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint" || typeof value === "boolean") return String(value);
  return fallback;
}

function num(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function dateFromMs(value: unknown): string | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? new Date(n).toISOString() : null;
}

function splitLabel(label: string): { home: string; away: string } {
  const parts = label.split(/\s+(?:vs|v|VS|V)\s+/).map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) return { home: parts[0]!, away: parts.slice(1).join(" vs ") };
  return { home: label || "World Cup Match", away: "TBD" };
}

function predictionGate(fixture: {
  kickoff: string | null;
  status: string;
  chainRegistered: boolean;
}): Pick<FixtureDto, "predictionOpen" | "predictionStatus" | "predictionClosesAt" | "predictionLockedReason"> {
  if (!fixture.chainRegistered) {
    return {
      predictionOpen: false,
      predictionStatus: "not_onchain",
      predictionClosesAt: fixture.kickoff,
      predictionLockedReason: "match is not registered on-chain",
    };
  }
  if (fixture.status === "finished") {
    return {
      predictionOpen: false,
      predictionStatus: "closed_finished",
      predictionClosesAt: fixture.kickoff,
      predictionLockedReason: "match is settled on-chain",
    };
  }
  if (!fixture.kickoff) {
    return {
      predictionOpen: false,
      predictionStatus: "unknown",
      predictionClosesAt: null,
      predictionLockedReason: "kickoff lock is missing",
    };
  }
  if (Date.now() >= new Date(fixture.kickoff).getTime()) {
    return {
      predictionOpen: false,
      predictionStatus: "closed_kickoff",
      predictionClosesAt: fixture.kickoff,
      predictionLockedReason: "kickoff lock has passed",
    };
  }
  return {
    predictionOpen: true,
    predictionStatus: "open",
    predictionClosesAt: fixture.kickoff,
    predictionLockedReason: null,
  };
}

async function fixturesFromChain(): Promise<FixtureDto[]> {
  const result = await queryMoveEvents({ type: eventType("MatchRegistered"), first: 120 });

  return result.events.map((event) => {
    const json = asRecord(event.parsedJson);
    const matchId = str(json.match_id ?? json.matchId);
    const label = str(json.label, `Match ${matchId}`);
    const { home, away } = splitLabel(label);
    const fixture = {
      matchId,
      stage: json.round == null ? null : `round-${str(json.round)}`,
      groupName: null,
      home,
      away,
      homeTeamCode: null,
      awayTeamCode: null,
      venue: null,
      city: null,
      kickoff: dateFromMs(json.kickoff_ms ?? json.kickoffMs),
      status: "scheduled",
      homeScore: null,
      awayScore: null,
      chainRegistered: true,
    };
    return { ...fixture, ...predictionGate(fixture) };
  });
}

async function fixturesFromDb(): Promise<FixtureDto[]> {
  const { rows } = await getPool().query(
    `select match_id, stage, group_name, home, away, home_team_code, away_team_code,
       venue, city, kickoff, status, home_score, away_score, chain_registered
     from fixtures
     order by kickoff nulls last, match_id`,
  );
  return rows.map((r) => {
    const fixture = {
      matchId: String(r.match_id),
      stage: (r.stage as string | null) ?? null,
      groupName: (r.group_name as string | null) ?? null,
      home: String(r.home),
      away: String(r.away),
      homeTeamCode: (r.home_team_code as string | null) ?? null,
      awayTeamCode: (r.away_team_code as string | null) ?? null,
      venue: (r.venue as string | null) ?? null,
      city: (r.city as string | null) ?? null,
      kickoff: r.kickoff ? new Date(r.kickoff).toISOString() : null,
      status: String(r.status),
      homeScore: num(r.home_score),
      awayScore: num(r.away_score),
      chainRegistered: Boolean(r.chain_registered),
    };
    return { ...fixture, ...predictionGate(fixture) };
  });
}

async function leaderboardFromDb(): Promise<LeaderboardRowDto[]> {
  const { rows } = await getPool().query(
    `select user_id, display_name, sui_address, total_points, streak, best_streak, graded, correct, accuracy
     from leaderboard
     order by total_points desc, accuracy desc nulls last, graded desc
     limit 25`,
  );
  return rows.map((r) => ({
    userId: String(r.user_id),
    displayName: (r.display_name as string | null) ?? null,
    suiAddress: String(r.sui_address),
    totalPoints: Number(r.total_points ?? 0),
    streak: Number(r.streak ?? 0),
    bestStreak: Number(r.best_streak ?? 0),
    graded: Number(r.graded ?? 0),
    correct: Number(r.correct ?? 0),
    accuracy: num(r.accuracy),
  }));
}

async function myRecordFromDb(address: string): Promise<MyRecordDto> {
  const { rows } = await getPool().query(
    `select id, sui_address, total_points, streak, best_streak, graded, correct
     from users
     where sui_address = $1`,
    [address],
  );
  const user = rows[0];
  if (!user) {
    return {
      address,
      totalPoints: 0,
      streak: 0,
      bestStreak: 0,
      graded: 0,
      correct: 0,
      accuracy: null,
      predictions: [],
    };
  }

  const predictionRows = await getPool().query(
    `select id, match_id, kind, payload, result, chain_status, tx_digest,
       oracle_status, oracle_points, oracle_correct, oracle_tx_digest, created_at
     from predictions
     where user_id = $1
     order by created_at desc
     limit 20`,
    [user.id],
  );
  const graded = Number(user.graded ?? 0);
  const correct = Number(user.correct ?? 0);

  return {
    address,
    totalPoints: Number(user.total_points ?? 0),
    streak: Number(user.streak ?? 0),
    bestStreak: Number(user.best_streak ?? 0),
    graded,
    correct,
    accuracy: graded > 0 ? Math.round((correct / graded) * 1000) / 10 : null,
    predictions: predictionRows.rows.map((r) => ({
      id: String(r.id),
      matchId: String(r.match_id),
      kind: String(r.kind),
      payload: r.payload,
      result: String(r.result),
      chainStatus: (r.chain_status as string | null) ?? null,
      txDigest: (r.tx_digest as string | null) ?? null,
      oracleStatus: String(r.oracle_status ?? "pending"),
      oraclePoints: num(r.oracle_points),
      oracleCorrect: (r.oracle_correct as boolean | null) ?? null,
      oracleTxDigest: (r.oracle_tx_digest as string | null) ?? null,
      createdAt: new Date(r.created_at).toISOString(),
    })),
  };
}

export async function getGameSnapshot(address?: string | null): Promise<GameSnapshotDto> {
  let fixtures: FixtureDto[] = [];
  let leaderboard: LeaderboardRowDto[] = [];
  let votes: MatchVoteSummaryDto[] = [];
  let myRecord: MyRecordDto | null = null;

  if (process.env.DATABASE_URL) {
    try {
      fixtures = await fixturesFromDb();
      leaderboard = await leaderboardFromDb();
      votes = await getVoteSummaries(
        fixtures.map((fixture) => fixture.matchId),
        address?.startsWith("0x") ? address : null,
      );
      if (address?.startsWith("0x")) myRecord = await myRecordFromDb(address);
    } catch (error) {
      console.error("[game] db snapshot failed:", error instanceof Error ? error.message : error);
    }
  }

  if (fixtures.length === 0) {
    try {
      fixtures = await fixturesFromChain();
    } catch (error) {
      console.error("[game] chain fixture fallback failed:", error instanceof Error ? error.message : error);
    }
  }

  return { fixtures, leaderboard, votes, myRecord, updatedAt: new Date().toISOString() };
}
