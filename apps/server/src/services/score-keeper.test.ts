import assert from "node:assert/strict";
import test from "node:test";
import { buildEntries, defaultPointsForKind, gradeScoreline, gradeWinner, type PredictionRow } from "./score-keeper.js";

function row(input: Partial<PredictionRow>): PredictionRow {
  return {
    id: input.id ?? "prediction-1",
    kind: input.kind ?? "scoreline",
    payload: input.payload ?? {},
    sui_address: input.sui_address ?? "0xabc",
    home_score: input.home_score ?? null,
    away_score: input.away_score ?? null,
  };
}

test("scoreline scoring gives exact-score and result-only points", () => {
  const exact = gradeScoreline(row({ payload: { homeScore: 2, awayScore: 1 } }), 2, 1);
  assert.equal(exact.points, 10);
  assert.equal(exact.correct, true);
  assert.equal(exact.reason, "exact-scoreline");

  const side = gradeScoreline(row({ payload: { homeScore: 3, awayScore: 0 } }), 1, 0);
  assert.equal(side.points, 3);
  assert.equal(side.correct, true);
  assert.equal(side.reason, "correct-result");
});

test("winner scoring uses the separate winner point rule", () => {
  const winner = gradeWinner(row({ kind: "winner", payload: { winnerSide: "away" } }), 0, 1);
  assert.equal(winner.points, 4);
  assert.equal(winner.correct, true);
  assert.equal(winner.reason, "correct-winner");

  const wrong = gradeWinner(row({ kind: "winner", payload: { winnerSide: "draw" } }), 2, 1);
  assert.equal(wrong.points, 0);
  assert.equal(wrong.correct, false);
});

test("manual scoring can use default points per prediction kind", () => {
  assert.equal(defaultPointsForKind("champion"), 20);
  assert.equal(defaultPointsForKind("match_mvp"), 8);

  const { entries, skipped } = buildEntries(
    [
      row({ id: "champion-1", kind: "champion" }),
      row({ id: "mvp-1", kind: "match_mvp" }),
    ],
    { matchId: "1", manualScores: [{ predictionId: "champion-1", correct: true }] },
  );

  assert.equal(entries[0]?.points, 20);
  assert.equal(entries[0]?.result, "correct");
  assert.equal(skipped[0]?.reason, "manual-score-required:8pt");
});

test("buildEntries auto-grades scoreline and winner from match result", () => {
  const { entries, skipped } = buildEntries(
    [
      row({ id: "score-1", kind: "scoreline", payload: { homeScore: 1, awayScore: 1 } }),
      row({ id: "winner-1", kind: "winner", payload: { winnerSide: "draw" } }),
    ],
    { matchId: "1", homeScore: 1, awayScore: 1 },
  );

  assert.equal(skipped.length, 0);
  assert.deepEqual(
    entries.map((entry) => [entry.predictionId, entry.points, entry.reason]),
    [
      ["score-1", 10, "exact-scoreline"],
      ["winner-1", 4, "correct-winner"],
    ],
  );
});

test("buildEntries skips auto-grading when match result is missing", () => {
  const { entries, skipped } = buildEntries(
    [
      row({ id: "score-1", kind: "scoreline", payload: { homeScore: 0, awayScore: 0 }, home_score: null, away_score: null }),
      row({ id: "winner-1", kind: "winner", payload: { winnerSide: "draw" }, home_score: null, away_score: null }),
    ],
    { matchId: "1" },
  );

  assert.equal(entries.length, 0);
  assert.deepEqual(
    skipped.map((entry) => [entry.predictionId, entry.reason]),
    [
      ["score-1", "match-result-required"],
      ["winner-1", "match-result-required"],
    ],
  );
});
