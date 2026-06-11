export type PredictionKind =
  | "winner"
  | "scoreline"
  | "match_mvp"
  | "worst_player"
  | "champion"
  | "advance"
  | "tournament";

export const WINNER_PAYLOAD_MARKER = 1;

export const PREDICTION_POINTS: Record<Exclude<PredictionKind, "tournament">, number> = {
  winner: 4,
  scoreline: 10,
  match_mvp: 8,
  worst_player: 6,
  champion: 20,
  advance: 5,
};

export function hashToU32(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
