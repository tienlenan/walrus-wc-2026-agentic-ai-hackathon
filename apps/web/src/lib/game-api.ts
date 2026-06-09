import { getSession } from "./auth";

const BASE = import.meta.env.VITE_MASTRA_URL ?? "http://localhost:4111";

export interface Fixture {
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

export interface LeaderboardRow {
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

export interface MyPrediction {
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

export interface MyRecord {
  address: string;
  totalPoints: number;
  streak: number;
  bestStreak: number;
  graded: number;
  correct: number;
  accuracy: number | null;
  predictions: MyPrediction[];
}

export interface MatchVoteLeader {
  targetHash: number;
  targetLabel: string;
  votes: number;
}

export interface MatchVote {
  matchId: string;
  kind: "match_mvp" | "worst_player";
  targetHash: number;
  targetLabel: string;
  outputObjectId: string | null;
  outputTxDigest: string | null;
  outputHash: string | null;
}

export interface MatchVoteSummary {
  matchId: string;
  kind: "match_mvp" | "worst_player";
  leaders: MatchVoteLeader[];
  myVote: MatchVote | null;
}

export interface GameSnapshot {
  fixtures: Fixture[];
  leaderboard: LeaderboardRow[];
  votes: MatchVoteSummary[];
  myRecord: MyRecord | null;
  updatedAt: string;
}

export async function getGameSnapshot(): Promise<GameSnapshot> {
  const headers: Record<string, string> = {};
  const session = getSession();
  if (session?.token) headers.Authorization = `Bearer ${session.token}`;

  const res = await fetch(`${BASE}/api/game/snapshot`, { headers });
  if (!res.ok) throw new Error(`snapshot ${res.status}`);
  return (await res.json()) as GameSnapshot;
}

export async function saveMatchVote(input: {
  matchId: string;
  kind: "match_mvp" | "worst_player";
  targetLabel: string;
  outputObjectId?: string | null;
  outputTxDigest?: string | null;
  outputHash?: string | null;
}): Promise<MatchVote> {
  const session = getSession();
  if (!session?.token) throw new Error("Sign in first.");
  const res = await fetch(`${BASE}/api/game/vote`, {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${session.token}` },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`vote ${res.status}`);
  const data = (await res.json()) as { vote: MatchVote };
  return data.vote;
}

export function subscribeGameSnapshot(
  onSnapshot: (snapshot: GameSnapshot) => void,
  onError?: () => void,
): () => void {
  const source = new EventSource(`${BASE}/api/game/stream`);
  source.addEventListener("snapshot", (event) => {
    onSnapshot(JSON.parse((event as MessageEvent<string>).data) as GameSnapshot);
  });
  source.onerror = () => onError?.();
  return () => source.close();
}
