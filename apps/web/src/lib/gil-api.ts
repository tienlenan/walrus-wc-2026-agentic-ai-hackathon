// Call the Gil server (POST /api/gil/chat). Requires a verified Sui session.
// Sends the chosen reply language + roast severity + optional custom instructions so Gil answers accordingly.
import { getSession } from "./auth";
import type { WalrusOutputPointer } from "./sui-output-record";

const BASE = import.meta.env.VITE_MASTRA_URL ?? "http://localhost:4111";

export interface ChatTextPart {
  type: "text";
  text: string;
}

export interface ChatToolPart<TInput = unknown, TOutput = unknown> {
  type: `tool-${string}`;
  toolCallId: string;
  state: "partial-call" | "call" | "output-available" | "approval-requested" | "approval-responded" | "output-denied";
  input?: TInput;
  output?: TOutput;
}

export type ChatRenderPart = ChatTextPart | ChatToolPart;

export interface FixtureCard {
  matchId: string;
  stage: string | null;
  groupName: string | null;
  home: string;
  away: string;
  homeTeamCode: string | null;
  awayTeamCode: string | null;
  kickoff: string | null;
  venue: string | null;
  city: string | null;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  chainRegistered: boolean;
  predictionOpen: boolean;
  predictionStatus: string;
  predictionLockedReason: string | null;
}

export interface FixturesToolOutput {
  title: string;
  filters: Record<string, unknown>;
  fixtures: FixtureCard[];
  totalMatches: number;
}

export interface TeamProfileToolOutput {
  team: {
    code: string;
    name: string;
    groupName: string;
    confederation: string;
    flagEmoji: string;
    coach: string | null;
    coachNationality: string | null;
    walrusStatus: string;
    walrusBlobId: string | null;
    walrusObjectId: string | null;
    profileHash: string;
  };
  squadSample: Array<{
    number: number;
    position: string;
    playerName: string;
    club: string;
  }>;
  fixtures: FixtureCard[];
  squadCount: number;
}

export interface UserProof {
  txDigest: string | null;
  suiObjectId: string | null;
  blobId: string | null;
  contentHash: string | null;
  walrusStatus: string | null;
}

export interface MyGameRecordToolOutput {
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
  proof: UserProof;
}

export interface MyPredictionsToolOutput {
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
  proof: UserProof;
}

export interface MyRoastsToolOutput {
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
  proof: UserProof;
}

export interface MyMatchVotesToolOutput {
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
  proof: UserProof;
}

export interface MyOutputRecordsToolOutput {
  address: string;
  total: number;
  records: MyOutputRecordItem[];
}

export interface MyDappActionItem {
  id: string;
  actionType: "prediction" | "roast" | "match_vote" | "output_record" | "gift_reveal" | "notebook_query";
  title: string;
  summary: string;
  matchId: string | null;
  createdAt: string;
  proof: UserProof;
}

export interface MyDappActionsToolOutput {
  address: string;
  total: number;
  actions: MyDappActionItem[];
}

export interface GilReply {
  text: string;
  parts: ChatRenderPart[];
  usedMemories: string[];
  memoryEnabled: boolean;
  outputPointer: WalrusOutputPointer;
}

export interface AskOptions {
  lang?: string;
  instructions?: string;
  roastSeverity?: string;
}

export async function askGil(message: string, opts: AskOptions = {}): Promise<GilReply> {
  const session = getSession();
  if (!session?.token) throw new Error("Sign in first.");
  const headers: Record<string, string> = { "content-type": "application/json" };
  headers.Authorization = `Bearer ${session.token}`;
  const body = { message, lang: opts.lang, roastSeverity: opts.roastSeverity, instructions: opts.instructions };

  const res = await fetch(`${BASE}/api/gil/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gil API ${res.status}`);
  return (await res.json()) as GilReply;
}
