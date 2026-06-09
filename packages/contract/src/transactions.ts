// PTB builders for wc_predict. Returns an unsigned Transaction — for sponsored or direct signing.
import { Transaction } from "@mysten/sui/transactions";
import { ids, SUI_CLOCK } from "./ids.js";

const target = (fn: string) => `${ids.pkg()}::prediction_game::${fn}`;

/** User submits 1 prediction (owned). kind per Kind; payload packs a..e. */
export function buildSubmitPrediction(input: {
  matchId: bigint | number;
  kind: number;
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
}): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: target("submit_prediction"),
    arguments: [
      tx.object(ids.registry()),
      tx.pure.u64(input.matchId),
      tx.pure.u8(input.kind),
      tx.pure.u32(input.a),
      tx.pure.u32(input.b),
      tx.pure.u32(input.c),
      tx.pure.u32(input.d),
      tx.pure.u32(input.e),
      tx.object(SUI_CLOCK),
    ],
  });
  return tx;
}

/** Admin registers 1 match (with a kickoff lock). */
export function buildRegisterMatch(input: {
  matchId: bigint | number;
  label: string;
  kickoffMs: bigint | number;
  round: number;
}): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: target("register_match"),
    arguments: [
      tx.object(ids.adminCap()),
      tx.object(ids.registry()),
      tx.pure.u64(input.matchId),
      tx.pure.string(input.label),
      tx.pure.u64(input.kickoffMs),
      tx.pure.u8(input.round),
    ],
  });
  return tx;
}

/** Oracle marks a match as settled. */
export function buildSettleMatch(matchId: bigint | number): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: target("settle_match"),
    arguments: [tx.object(ids.oracleCap()), tx.object(ids.registry()), tx.pure.u64(matchId), tx.object(SUI_CLOCK)],
  });
  return tx;
}

/** Oracle writes a batch of scores (server scores off-chain → writes on-chain). */
export function buildRecordScores(input: {
  users: string[];
  points: (bigint | number)[];
  correct: boolean[];
}): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: target("record_scores"),
    arguments: [
      tx.object(ids.oracleCap()),
      tx.object(ids.scoreboard()),
      tx.pure.vector("address", input.users),
      tx.pure.vector("u64", input.points),
      tx.pure.vector("bool", input.correct),
      tx.object(SUI_CLOCK),
    ],
  });
  return tx;
}

/** User creates an owned Sui object that points to a Walrus blob/hash for app output. */
export function buildSubmitOutputRecord(input: {
  kind: number;
  blobId?: string | null;
  contentHash: string;
}): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: target("submit_output_record"),
    arguments: [
      tx.pure.u8(input.kind),
      tx.pure.string(input.blobId ?? ""),
      tx.pure.string(input.contentHash),
      tx.object(SUI_CLOCK),
    ],
  });
  return tx;
}
