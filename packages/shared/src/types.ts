// Domain types shared by server, web, and db.

import type { PredictionKind } from "./predictions.js";

export type { PredictionKind } from "./predictions.js";
export type PredictionResult = "pending" | "correct" | "wrong";
export type FixtureStatus = "scheduled" | "live" | "finished";
export type RoastSeverity = "light" | "standard" | "savage";

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

/** Pointer to a Walrus blob/object for on-chain verification. */
export interface WalrusPointer {
  kind: "profile" | "predictions" | "memory";
  blobId: string;
  objectId?: string;
  epoch?: number;
  hash?: string;
}

/** A memory fact stored by Gil through Walrus Memory. */
export interface MemoryFact {
  text: string;
  tags?: string[];
}

export interface UserRecord {
  graded: number;
  correct: number;
  accuracy: number; // %
}
