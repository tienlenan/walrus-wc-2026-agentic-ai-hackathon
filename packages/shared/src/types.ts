// Domain types dùng chung giữa server, web, db.

export type PredictionKind = "winner" | "scoreline" | "tournament";
export type PredictionResult = "pending" | "correct" | "wrong";
export type FixtureStatus = "scheduled" | "live" | "finished";

export interface User {
  id: string;
  suiAddress: string;
  memwalAccountId?: string;
  displayName?: string;
  favoriteTeam?: string;
  createdAt: string;
}

export interface Fixture {
  matchId: string;
  stage?: string;
  home: string;
  away: string;
  kickoff?: string;
  status: FixtureStatus;
  homeScore?: number;
  awayScore?: number;
}

export interface Prediction {
  id: string;
  userId: string;
  matchId: string;
  kind: PredictionKind;
  payload: Record<string, unknown>;
  createdAt: string;
  lockedAt?: string;
  result: PredictionResult;
  scoredAt?: string;
}

/** Con trỏ tới blob/đối tượng trên Walrus (verify on-chain). */
export interface WalrusPointer {
  kind: "profile" | "predictions" | "memory";
  blobId: string;
  objectId?: string;
  epoch?: number;
  hash?: string;
}

/** Một mẩu ký ức Gil lưu qua Walrus Memory. */
export interface MemoryFact {
  text: string;
  tags?: string[];
}

export interface UserRecord {
  graded: number;
  correct: number;
  accuracy: number; // %
}
