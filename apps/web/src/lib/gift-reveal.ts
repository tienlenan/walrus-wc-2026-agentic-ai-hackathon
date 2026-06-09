import type { MyPrediction } from "./game-api";

export type GiftRevealTone = "victory-roast" | "shame-roast";

export interface GiftReveal {
  predictionId: string;
  matchId: string;
  kind: string;
  isCorrect: boolean;
  points: number | null;
  tone: GiftRevealTone;
  titleKey: string;
  lineKey: string;
  openedStorageKey: string;
}

const CORRECT_LINES = [
  "gift.line.correct.1",
  "gift.line.correct.2",
  "gift.line.correct.3",
  "gift.line.correct.4",
] as const;

const WRONG_LINES = [
  "gift.line.wrong.1",
  "gift.line.wrong.2",
  "gift.line.wrong.3",
  "gift.line.wrong.4",
] as const;

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function isGiftRevealEligible(prediction: MyPrediction): boolean {
  return prediction.oracleCorrect !== null && (prediction.oracleStatus === "recorded" || prediction.result !== "pending");
}

export function buildGiftReveal(prediction: MyPrediction, walletAddress: string): GiftReveal | null {
  if (!isGiftRevealEligible(prediction) || prediction.oracleCorrect === null) return null;

  const isCorrect = prediction.oracleCorrect;
  const lines = isCorrect ? CORRECT_LINES : WRONG_LINES;
  const lineKey = lines[hashString(`${prediction.id}:${prediction.matchId}:${isCorrect}`) % lines.length] ?? lines[0];

  return {
    predictionId: prediction.id,
    matchId: prediction.matchId,
    kind: prediction.kind,
    isCorrect,
    points: prediction.oraclePoints,
    tone: isCorrect ? "victory-roast" : "shame-roast",
    titleKey: isCorrect ? "gift.title.correct" : "gift.title.wrong",
    lineKey,
    openedStorageKey: `daily-walrus:gift-reveal:${walletAddress}:${prediction.id}`,
  };
}

export function buildGiftReveals(predictions: MyPrediction[], walletAddress: string): GiftReveal[] {
  return predictions
    .map((prediction) => buildGiftReveal(prediction, walletAddress))
    .filter((reveal): reveal is GiftReveal => reveal !== null)
    .sort((a, b) => b.predictionId.localeCompare(a.predictionId));
}
