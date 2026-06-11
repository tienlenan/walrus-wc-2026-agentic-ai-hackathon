import { getPool } from "@daily-walrus/db";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 25;

export type UserActionType = "prediction" | "roast" | "match_vote" | "output_record" | "gift_reveal" | "notebook_query";

export interface UserProofDto {
  txDigest: string | null;
  suiObjectId: string | null;
  blobId: string | null;
  contentHash: string | null;
  walrusStatus: string | null;
}

export interface MyGameRecordOutput {
  address: string;
  exists: boolean;
  totalPoints: number;
  streak: number;
  bestStreak: number;
  graded: number;
  correct: number;
  accuracy: number | null;
}

export interface MyPredictionItem {
  id: string;
  matchId: string;
  matchLabel: string;
  kind: string;
  payload: unknown;
  pickLabel: string;
  result: string;
  chainStatus: string | null;
  oracleStatus: string;
  oraclePoints: number | null;
  oracleCorrect: boolean | null;
  kickoff: string | null;
  matchStatus: string | null;
  createdAt: string;
  proof: UserProofDto;
}

export interface MyPredictionsOutput {
  address: string;
  total: number;
  predictions: MyPredictionItem[];
}

export interface MyRoastItem {
  id: string;
  targetType: string;
  targetName: string;
  teamCode: string | null;
  playerNumber: number | null;
  roastText: string;
  cardTitle: string;
  createdAt: string;
  proof: UserProofDto;
}

export interface MyRoastsOutput {
  address: string;
  total: number;
  roasts: MyRoastItem[];
}

export interface MyMatchVoteItem {
  id: string;
  matchId: string;
  matchLabel: string;
  kind: string;
  targetLabel: string;
  createdAt: string;
  updatedAt: string;
  proof: UserProofDto;
}

export interface MyMatchVotesOutput {
  address: string;
  total: number;
  votes: MyMatchVoteItem[];
}

export interface MyOutputRecordItem {
  id: string;
  outputKind: string;
  resourceType: string;
  resourceId: string;
  createdAt: string;
  proof: UserProofDto;
}

export interface MyOutputRecordsOutput {
  address: string;
  total: number;
  records: MyOutputRecordItem[];
}

export interface UserActionTimelineItem {
  id: string;
  actionType: UserActionType;
  title: string;
  summary: string;
  matchId: string | null;
  createdAt: string;
  proof: UserProofDto;
}

export interface MyDappActionsOutput {
  address: string;
  total: number;
  actions: UserActionTimelineItem[];
}

type Row = Record<string, unknown>;

export function clampLimit(limit?: number): number {
  const value = Number(limit ?? DEFAULT_LIMIT);
  if (!Number.isFinite(value)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(Math.trunc(value), MAX_LIMIT));
}

function assertSuiAddress(address: string): string {
  const normalized = address.trim().toLowerCase();
  if (!normalized.startsWith("0x")) throw new Error("verified Sui address required");
  return normalized;
}

function emptyProof(): UserProofDto {
  return { txDigest: null, suiObjectId: null, blobId: null, contentHash: null, walrusStatus: null };
}

function str(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint" || typeof value === "boolean") return String(value);
  return fallback;
}

function nullableStr(value: unknown): string | null {
  const text = str(value).trim();
  return text ? text : null;
}

function num(value: unknown): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function bool(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function iso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return new Date(0).toISOString();
}

function nullableIso(value: unknown): string | null {
  if (value == null) return null;
  return iso(value);
}

function matchLabel(row: Row): string {
  const home = nullableStr(row.home);
  const away = nullableStr(row.away);
  return home && away ? `${home} vs ${away}` : `match ${str(row.match_id, "unknown")}`;
}

export function formatPredictionPayload(kind: string, payload: unknown): string {
  if (!payload || typeof payload !== "object") return String(payload ?? "empty pick");
  const record = payload as Record<string, unknown>;
  if (kind === "scoreline" && record.homeScore != null && record.awayScore != null) {
    return `${kind} ${String(record.homeScore)}-${String(record.awayScore)}`;
  }
  if (record.targetLabel != null) return `${kind} ${String(record.targetLabel)}`;
  const keys = [
    "winner",
    "winnerSide",
    "team",
    "teamCode",
    "teamName",
    "homeScore",
    "awayScore",
    "champion",
    "target",
    "player",
    "playerName",
    "value",
  ];
  const parts = keys
    .filter((key) => record[key] != null)
    .map((key) => `${key}:${String(record[key])}`);
  return parts.length ? `${kind} ${parts.join(" ")}` : `${kind} ${JSON.stringify(payload)}`;
}

export function mapPredictionRow(row: Row): MyPredictionItem {
  const kind = str(row.kind, "prediction");
  const payload = row.payload ?? {};
  return {
    id: str(row.id),
    matchId: str(row.match_id),
    matchLabel: matchLabel(row),
    kind,
    payload,
    pickLabel: formatPredictionPayload(kind, payload),
    result: str(row.result, "pending"),
    chainStatus: nullableStr(row.chain_status),
    oracleStatus: str(row.oracle_status, "pending"),
    oraclePoints: num(row.oracle_points),
    oracleCorrect: bool(row.oracle_correct),
    kickoff: nullableIso(row.kickoff),
    matchStatus: nullableStr(row.match_status),
    createdAt: iso(row.created_at),
    proof: {
      ...emptyProof(),
      txDigest: nullableStr(row.tx_digest),
    },
  };
}

export function mapRoastRow(row: Row): MyRoastItem {
  return {
    id: str(row.id),
    targetType: str(row.target_type, "unknown"),
    targetName: str(row.target_name, "Unknown target"),
    teamCode: nullableStr(row.team_code),
    playerNumber: num(row.player_number),
    roastText: str(row.roast_text),
    cardTitle: str(row.card_title, `Gil roasts ${str(row.target_name, "target")}`),
    createdAt: iso(row.created_at),
    proof: {
      txDigest: nullableStr(row.output_tx_digest),
      suiObjectId: nullableStr(row.output_object_id),
      blobId: nullableStr(row.walrus_blob_id),
      contentHash: nullableStr(row.output_hash),
      walrusStatus: nullableStr(row.walrus_status),
    },
  };
}

export function mapMatchVoteRow(row: Row): MyMatchVoteItem {
  return {
    id: str(row.id),
    matchId: str(row.match_id),
    matchLabel: matchLabel(row),
    kind: str(row.kind),
    targetLabel: str(row.target_label),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at ?? row.created_at),
    proof: {
      txDigest: nullableStr(row.output_tx_digest),
      suiObjectId: nullableStr(row.output_object_id),
      blobId: null,
      contentHash: nullableStr(row.output_hash),
      walrusStatus: nullableStr(row.output_tx_digest) ? "recorded" : null,
    },
  };
}

export function mapOutputRecordRow(row: Row): MyOutputRecordItem {
  return {
    id: str(row.id),
    outputKind: str(row.output_kind),
    resourceType: str(row.resource_type),
    resourceId: str(row.resource_id),
    createdAt: iso(row.created_at),
    proof: {
      txDigest: nullableStr(row.tx_digest),
      suiObjectId: nullableStr(row.sui_object_id),
      blobId: nullableStr(row.blob_id),
      contentHash: nullableStr(row.content_hash),
      walrusStatus: nullableStr(row.walrus_status),
    },
  };
}

export function predictionToAction(item: MyPredictionItem): UserActionTimelineItem {
  const scored = item.oracleCorrect === null ? "pending" : item.oracleCorrect ? "correct" : "wrong";
  return {
    id: `prediction:${item.id}`,
    actionType: "prediction",
    title: `Prediction: ${item.matchLabel}`,
    summary: `${item.pickLabel}; result ${scored}; ${item.oraclePoints ?? 0} points`,
    matchId: item.matchId,
    createdAt: item.createdAt,
    proof: item.proof,
  };
}

export function roastToAction(item: MyRoastItem): UserActionTimelineItem {
  return {
    id: `roast:${item.id}`,
    actionType: "roast",
    title: `Roast: ${item.targetName}`,
    summary: item.roastText,
    matchId: null,
    createdAt: item.createdAt,
    proof: item.proof,
  };
}

export function voteToAction(item: MyMatchVoteItem): UserActionTimelineItem {
  return {
    id: `match_vote:${item.id}`,
    actionType: "match_vote",
    title: `Vote: ${item.kind.replace(/_/g, " ")}`,
    summary: `${item.targetLabel} for ${item.matchLabel}`,
    matchId: item.matchId,
    createdAt: item.updatedAt,
    proof: item.proof,
  };
}

export function outputRecordToAction(item: MyOutputRecordItem): UserActionTimelineItem {
  const actionType: UserActionType =
    item.resourceType === "gift_reveal" ? "gift_reveal" : item.resourceType === "notebook_query" ? "notebook_query" : "output_record";
  return {
    id: `output_record:${item.id}`,
    actionType,
    title: `Proof: ${item.outputKind.replace(/_/g, " ")}`,
    summary: `${item.resourceType}:${item.resourceId}`,
    matchId: null,
    createdAt: item.createdAt,
    proof: item.proof,
  };
}

function emptyRecord(address: string): MyGameRecordOutput {
  return { address, exists: false, totalPoints: 0, streak: 0, bestStreak: 0, graded: 0, correct: 0, accuracy: null };
}

export async function getMyGameRecord(addressInput: string): Promise<MyGameRecordOutput> {
  const address = assertSuiAddress(addressInput);
  if (!process.env.DATABASE_URL) return emptyRecord(address);
  const { rows } = await getPool().query(
    `select sui_address, total_points, streak, best_streak, graded, correct
     from users
     where sui_address = $1`,
    [address],
  );
  const row = rows[0] as Row | undefined;
  if (!row) return emptyRecord(address);
  const graded = num(row.graded) ?? 0;
  const correct = num(row.correct) ?? 0;
  return {
    address,
    exists: true,
    totalPoints: num(row.total_points) ?? 0,
    streak: num(row.streak) ?? 0,
    bestStreak: num(row.best_streak) ?? 0,
    graded,
    correct,
    accuracy: graded > 0 ? Math.round((correct / graded) * 1000) / 10 : null,
  };
}

export async function getMyPredictions(
  addressInput: string,
  filters: { matchId?: string; kind?: string; result?: string; limit?: number } = {},
): Promise<MyPredictionsOutput> {
  const address = assertSuiAddress(addressInput);
  const limit = clampLimit(filters.limit);
  if (!process.env.DATABASE_URL) return { address, total: 0, predictions: [] };
  const params: unknown[] = [address];
  const where = ["u.sui_address = $1"];
  if (filters.matchId) {
    params.push(filters.matchId);
    where.push(`p.match_id = $${params.length}`);
  }
  if (filters.kind) {
    params.push(filters.kind);
    where.push(`p.kind = $${params.length}`);
  }
  if (filters.result) {
    params.push(filters.result);
    where.push(`p.result = $${params.length}`);
  }
  params.push(limit);
  const { rows } = await getPool().query(
    `select p.id, p.match_id, p.kind, p.payload, p.result, p.chain_status, p.tx_digest,
       p.oracle_status, p.oracle_points, p.oracle_correct, p.created_at,
       f.home, f.away, f.kickoff, f.status as match_status
     from predictions p
     join users u on u.id = p.user_id
     left join fixtures f on f.match_id = p.match_id
     where ${where.join(" and ")}
     order by p.created_at desc
     limit $${params.length}`,
    params,
  );
  const predictions = (rows as Row[]).map(mapPredictionRow);
  return { address, total: predictions.length, predictions };
}

export async function getMyRoasts(
  addressInput: string,
  filters: { targetType?: string; teamCode?: string; targetName?: string; limit?: number } = {},
): Promise<MyRoastsOutput> {
  const address = assertSuiAddress(addressInput);
  const limit = clampLimit(filters.limit);
  if (!process.env.DATABASE_URL) return { address, total: 0, roasts: [] };
  const params: unknown[] = [address];
  const where = ["resource_id = $1"];
  if (filters.targetType) {
    params.push(filters.targetType);
    where.push(`target_type = $${params.length}`);
  }
  if (filters.teamCode) {
    params.push(filters.teamCode.toUpperCase());
    where.push(`team_code = $${params.length}`);
  }
  if (filters.targetName) {
    params.push(`%${filters.targetName}%`);
    where.push(`target_name ilike $${params.length}`);
  }
  params.push(limit);
  const { rows } = await getPool().query(
    `select id, target_type, target_id, target_name, team_code, player_number, roast_text,
       card_title, output_object_id, output_tx_digest, output_hash, walrus_blob_id,
       walrus_status, created_at
     from roasts
     where ${where.join(" and ")}
     order by created_at desc
     limit $${params.length}`,
    params,
  );
  const roasts = (rows as Row[]).map(mapRoastRow);
  return { address, total: roasts.length, roasts };
}

export async function getMyMatchVotes(
  addressInput: string,
  filters: { matchId?: string; kind?: string; limit?: number } = {},
): Promise<MyMatchVotesOutput> {
  const address = assertSuiAddress(addressInput);
  const limit = clampLimit(filters.limit);
  if (!process.env.DATABASE_URL) return { address, total: 0, votes: [] };
  const params: unknown[] = [address];
  const where = ["u.sui_address = $1"];
  if (filters.matchId) {
    params.push(filters.matchId);
    where.push(`v.match_id = $${params.length}`);
  }
  if (filters.kind) {
    params.push(filters.kind);
    where.push(`v.kind = $${params.length}`);
  }
  params.push(limit);
  const { rows } = await getPool().query(
    `select v.id, v.match_id, v.kind, v.target_label, v.output_object_id,
       v.output_tx_digest, v.output_hash, v.created_at, v.updated_at,
       f.home, f.away
     from match_votes v
     join users u on u.id = v.user_id
     left join fixtures f on f.match_id = v.match_id
     where ${where.join(" and ")}
     order by v.updated_at desc
     limit $${params.length}`,
    params,
  );
  const votes = (rows as Row[]).map(mapMatchVoteRow);
  return { address, total: votes.length, votes };
}

export async function getMyOutputRecords(
  addressInput: string,
  filters: { outputKind?: string; resourceType?: string; limit?: number } = {},
): Promise<MyOutputRecordsOutput> {
  const address = assertSuiAddress(addressInput);
  const limit = clampLimit(filters.limit);
  if (!process.env.DATABASE_URL) return { address, total: 0, records: [] };
  const params: unknown[] = [address];
  const where = ["u.sui_address = $1"];
  if (filters.outputKind) {
    params.push(filters.outputKind);
    where.push(`r.output_kind = $${params.length}`);
  }
  if (filters.resourceType) {
    params.push(filters.resourceType);
    where.push(`r.resource_type = $${params.length}`);
  }
  params.push(limit);
  const { rows } = await getPool().query(
    `select r.id, r.output_kind, r.resource_type, r.resource_id, r.sui_object_id,
       r.tx_digest, r.blob_id, r.content_hash, r.walrus_status, r.created_at
     from sui_output_records r
     join users u on u.id = r.user_id
     where ${where.join(" and ")}
     order by r.created_at desc
     limit $${params.length}`,
    params,
  );
  const records = (rows as Row[]).map(mapOutputRecordRow);
  return { address, total: records.length, records };
}

export async function getMyDappActions(addressInput: string, filters: { limit?: number } = {}): Promise<MyDappActionsOutput> {
  const address = assertSuiAddress(addressInput);
  const limit = clampLimit(filters.limit);
  const [predictionOutput, roastOutput, voteOutput, recordOutput] = await Promise.all([
    getMyPredictions(address, { limit }),
    getMyRoasts(address, { limit }),
    getMyMatchVotes(address, { limit }),
    getMyOutputRecords(address, { limit }),
  ]);
  const domainKeys = new Set([
    ...roastOutput.roasts.map((roast) => `roast:${roast.id}`),
    ...voteOutput.votes.map((vote) => `match_vote:${vote.id}`),
  ]);
  const proofActions = recordOutput.records
    .filter((record) => !domainKeys.has(`${record.resourceType}:${record.resourceId}`))
    .map(outputRecordToAction);
  const actions = [
    ...predictionOutput.predictions.map(predictionToAction),
    ...roastOutput.roasts.map(roastToAction),
    ...voteOutput.votes.map(voteToAction),
    ...proofActions,
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
  return { address, total: actions.length, actions };
}
