import { getSession } from "./auth";

const BASE = import.meta.env.VITE_MASTRA_URL ?? "http://localhost:4111";
const DEMO_GAME_SNAPSHOT = import.meta.env.VITE_DEMO_GAME_SNAPSHOT === "1";
const DISABLE_GAME_STREAM = import.meta.env.VITE_DISABLE_GAME_STREAM === "1";

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

function demoGameSnapshot(): GameSnapshot {
  const now = new Date().toISOString();
  return {
    fixtures: [
      {
        matchId: "demo-arg-bra",
        stage: "group",
        groupName: "Group D",
        home: "Argentina",
        away: "Brazil",
        homeTeamCode: "ARG",
        awayTeamCode: "BRA",
        venue: "Demo Bowl",
        city: "Walrus City",
        kickoff: "2026-06-15T01:00:00.000Z",
        status: "finished",
        homeScore: 2,
        awayScore: 1,
        chainRegistered: true,
        predictionOpen: false,
        predictionStatus: "closed_finished",
        predictionClosesAt: "2026-06-15T01:00:00.000Z",
        predictionLockedReason: "demo match is settled on-chain",
      },
    ],
    leaderboard: [
      {
        userId: "demo-user",
        displayName: "0xRoastDoctor",
        suiAddress: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        totalPoints: 10,
        streak: 1,
        bestStreak: 2,
        graded: 2,
        correct: 1,
        accuracy: 50,
      },
      {
        userId: "demo-rival",
        displayName: "PenaltyIntoRowZ",
        suiAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        totalPoints: 3,
        streak: 0,
        bestStreak: 1,
        graded: 2,
        correct: 0,
        accuracy: 0,
      },
    ],
    votes: [],
    myRecord: {
      address: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      totalPoints: 10,
      streak: 1,
      bestStreak: 2,
      graded: 2,
      correct: 1,
      accuracy: 50,
      predictions: [
        {
          id: "demo-correct-scoreline",
          matchId: "demo-arg-bra",
          kind: "scoreline",
          payload: { home: 2, away: 1 },
          result: "correct",
          chainStatus: "submitted",
          txDigest: "DEMO_TX_CORRECT",
          oracleStatus: "recorded",
          oraclePoints: 10,
          oracleCorrect: true,
          oracleTxDigest: "DEMO_ORACLE_CORRECT",
          createdAt: now,
        },
        {
          id: "demo-wrong-mvp",
          matchId: "demo-arg-bra",
          kind: "match_mvp",
          payload: { target: "Ronaldo free kick committee" },
          result: "wrong",
          chainStatus: "submitted",
          txDigest: "DEMO_TX_WRONG",
          oracleStatus: "recorded",
          oraclePoints: 0,
          oracleCorrect: false,
          oracleTxDigest: "DEMO_ORACLE_WRONG",
          createdAt: now,
        },
      ],
    },
    updatedAt: now,
  };
}

export async function getGameSnapshot(): Promise<GameSnapshot> {
  if (DEMO_GAME_SNAPSHOT) return demoGameSnapshot();

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
  if (DEMO_GAME_SNAPSHOT) {
    window.setTimeout(() => onSnapshot(demoGameSnapshot()), 0);
    return () => undefined;
  }
  if (DISABLE_GAME_STREAM) {
    let cancelled = false;
    let timer: number | null = null;
    const poll = async () => {
      try {
        onSnapshot(await getGameSnapshot());
      } catch {
        onError?.();
      }
      if (!cancelled) timer = window.setTimeout(() => void poll(), 10_000);
    };
    void poll();
    return () => {
      cancelled = true;
      if (timer != null) window.clearTimeout(timer);
    };
  }

  const source = new EventSource(`${BASE}/api/game/stream`);
  source.addEventListener("snapshot", (event) => {
    onSnapshot(JSON.parse((event as MessageEvent<string>).data) as GameSnapshot);
  });
  source.onerror = () => onError?.();
  return () => source.close();
}
