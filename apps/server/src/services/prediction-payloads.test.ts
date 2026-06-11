import assert from "node:assert/strict";
import test from "node:test";
import { Kind } from "@daily-walrus/contract";
import { WINNER_PAYLOAD_MARKER, hashToU32 } from "@daily-walrus/shared";
import { normalizePredictionPayload, predictionKindName } from "./prediction-payloads.js";
import { getWorldCupSnapshot } from "./world-cup-data.js";

test("advance kind with winner marker indexes as winner", () => {
  assert.equal(predictionKindName(Kind.Advance, { e: WINNER_PAYLOAD_MARKER }), "winner");
  assert.equal(predictionKindName(Kind.Advance, { e: 0 }), "advance");
});

test("winner payload resolves fixture side into an existing team", () => {
  const fixture = getWorldCupSnapshot().fixtures.find((item) => item.homeTeamCode && item.awayTeamCode);
  assert.ok(fixture);

  const payload = normalizePredictionPayload({
    kind: "winner",
    matchId: fixture.matchId,
    payload: { a: 1, e: WINNER_PAYLOAD_MARKER },
  });

  assert.equal(payload.winnerSide, "home");
  assert.equal(payload.teamCode, fixture.homeTeamCode);
  assert.equal(payload.teamName, fixture.home);
});

test("player and team payload hashes resolve to existing catalog rows", () => {
  const snapshot = getWorldCupSnapshot();
  const team = snapshot.teams.find((item) => item.squad.length > 0);
  assert.ok(team);
  const player = team.squad[0];
  assert.ok(player);

  const playerPayload = normalizePredictionPayload({
    kind: "match_mvp",
    matchId: "0",
    payload: { a: hashToU32(`player:${team.code}:${player.number}`) },
  });
  assert.equal(playerPayload.teamCode, team.code);
  assert.equal(playerPayload.playerName, player.playerName);

  const teamPayload = normalizePredictionPayload({
    kind: "champion",
    matchId: "0",
    payload: { a: hashToU32(team.code) },
  });
  assert.equal(teamPayload.teamCode, team.code);
  assert.equal(teamPayload.teamName, team.name);
});
