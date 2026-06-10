import assert from "node:assert/strict";
import test from "node:test";
import { buildChatToolParts } from "./chat-render-parts.js";
import { inferUserActionIntent, normalizeText } from "./chat-tool-intents.js";
import {
  clampLimit,
  mapMatchVoteRow,
  mapOutputRecordRow,
  mapPredictionRow,
  mapRoastRow,
  outputRecordToAction,
  predictionToAction,
  roastToAction,
  voteToAction,
} from "./user-action-history.js";

test("clampLimit keeps user action queries bounded", () => {
  assert.equal(clampLimit(), 10);
  assert.equal(clampLimit(0), 1);
  assert.equal(clampLimit(200), 25);
  assert.equal(clampLimit(Number.NaN), 10);
});

test("user action intent detects private prediction, roast, proof, and dapp prompts", () => {
  assert.equal(inferUserActionIntent(normalizeText("toi da du doan gi?")), "my_predictions");
  assert.equal(inferUserActionIntent(normalizeText("tôi đã dự đoán gì?")), "my_predictions");
  assert.equal(inferUserActionIntent(normalizeText("who did I roast?")), "my_roasts");
  assert.equal(inferUserActionIntent(normalizeText("show my proof receipts")), "my_proofs");
  assert.equal(inferUserActionIntent(normalizeText("toi da lam gi trong dapp?")), "my_actions");
  assert.equal(inferUserActionIntent(normalizeText("tôi đã làm gì trong dapp?")), "my_actions");
  assert.equal(inferUserActionIntent(normalizeText("what is Brazil schedule?")), null);
});

test("private dapp prompts produce the expected chat tool parts", async () => {
  const databaseUrl = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  const cases = [
    ["toi da du doan gi?", "tool-getMyPredictions"],
    ["toi da roast gi?", "tool-getMyRoasts"],
    ["toi da lam gi trong dapp?", "tool-getMyDappActions"],
    ["show my proof receipts", "tool-getMyOutputRecords"],
    ["my MVP vote", "tool-getMyMatchVotes"],
    ["my score record", "tool-getMyGameRecord"],
  ] as const;

  try {
    for (const [message, expectedType] of cases) {
      const result = await buildChatToolParts({ resourceId: "0xabc", message });
      assert.deepEqual(
        result.parts.map((part) => part.type),
        [expectedType],
      );
    }
  } finally {
    if (databaseUrl) process.env.DATABASE_URL = databaseUrl;
  }
});

test("mapPredictionRow creates readable prediction and timeline DTOs", () => {
  const prediction = mapPredictionRow({
    id: "p1",
    match_id: "M001",
    kind: "winner",
    payload: { winner: "BRA" },
    result: "pending",
    chain_status: "submitted",
    tx_digest: "abc123",
    oracle_status: "pending",
    oracle_points: null,
    oracle_correct: null,
    created_at: new Date("2026-06-10T00:00:00Z"),
    home: "Brazil",
    away: "France",
    kickoff: new Date("2026-06-12T00:00:00Z"),
    match_status: "scheduled",
  });

  assert.equal(prediction.matchLabel, "Brazil vs France");
  assert.equal(prediction.pickLabel, "winner winner:BRA");
  assert.equal(prediction.proof.txDigest, "abc123");

  const action = predictionToAction(prediction);
  assert.equal(action.actionType, "prediction");
  assert.match(action.summary, /winner:BRA/);
});

test("mapRoastRow creates proof-aware roast DTO", () => {
  const roast = mapRoastRow({
    id: "r1",
    target_type: "team",
    target_name: "England",
    team_code: "ENG",
    player_number: null,
    roast_text: "Penalty spot called counsel.",
    card_title: "Gil roasts England",
    output_object_id: "0xobj",
    output_tx_digest: "txtx",
    output_hash: "hash",
    walrus_blob_id: "blob",
    walrus_status: "stored",
    created_at: "2026-06-10T00:00:00Z",
  });

  assert.equal(roast.targetName, "England");
  assert.equal(roast.proof.blobId, "blob");
  assert.equal(roastToAction(roast).actionType, "roast");
});

test("mapMatchVoteRow and mapOutputRecordRow produce timeline actions", () => {
  const vote = mapMatchVoteRow({
    id: "v1",
    match_id: "M002",
    kind: "match_mvp",
    target_label: "Haaland",
    output_object_id: "0xvote",
    output_tx_digest: "votetx",
    output_hash: "votehash",
    created_at: "2026-06-10T00:00:00Z",
    updated_at: "2026-06-10T01:00:00Z",
    home: "Norway",
    away: "Portugal",
  });
  assert.equal(vote.matchLabel, "Norway vs Portugal");
  assert.equal(voteToAction(vote).actionType, "match_vote");

  const record = mapOutputRecordRow({
    id: "o1",
    output_kind: "chat",
    resource_type: "chat_message",
    resource_id: "chat-1",
    sui_object_id: "0xchat",
    tx_digest: "chattx",
    blob_id: "chatblob",
    content_hash: "chathash",
    walrus_status: "stored",
    created_at: "2026-06-10T02:00:00Z",
  });
  const action = outputRecordToAction(record);
  assert.equal(action.actionType, "output_record");
  assert.match(action.summary, /chat_message:chat-1/);
});
