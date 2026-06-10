// Public roast feed read path. Deliberately free of the AI stack (gil/@mastra/core)
// so GET /api/roasts never pays the agent import cost; creation lives in roast-engine.
import { getPool } from "@daily-walrus/db";
import { isMemoryEnabled } from "@daily-walrus/walrus";
import type { WalrusBlobPointer } from "./walrus-blob.js";

export interface RoastDto {
  id: string;
  targetType: "team" | "player";
  targetId: string;
  targetName: string;
  teamCode: string | null;
  playerNumber: number | null;
  roastText: string;
  cardTitle: string;
  imageUrl: string | null;
  sourceContext: unknown;
  outputObjectId: string | null;
  outputTxDigest: string | null;
  outputHash: string | null;
  walrusBlobId: string | null;
  walrusStatus: string;
  outputPointer: WalrusBlobPointer;
  createdAt: string;
  memoryEnabled: boolean;
}

export async function listRoasts(limit = 20): Promise<RoastDto[]> {
  if (!process.env.DATABASE_URL) return [];
  const { rows } = await getPool().query(
    `select id, target_type, target_id, target_name, team_code, player_number, roast_text,
       card_title, image_url, source_context, output_object_id, output_tx_digest,
       output_hash, walrus_blob_id, walrus_status, created_at
     from roasts
     order by created_at desc
     limit $1`,
    [Math.max(1, Math.min(50, limit))],
  );
  return rows.map((row) => ({
    id: String(row.id),
    targetType: row.target_type,
    targetId: String(row.target_id),
    targetName: String(row.target_name),
    teamCode: row.team_code ?? null,
    playerNumber: row.player_number == null ? null : Number(row.player_number),
    roastText: String(row.roast_text),
    cardTitle: String(row.card_title ?? `Gil roasts ${row.target_name}`),
    imageUrl: row.image_url ?? null,
    sourceContext: row.source_context ?? {},
    outputObjectId: row.output_object_id ?? null,
    outputTxDigest: row.output_tx_digest ?? null,
    outputHash: row.output_hash ?? null,
    walrusBlobId: row.walrus_blob_id ?? null,
    walrusStatus: String(row.walrus_status ?? "not_configured"),
    outputPointer: {
      status: row.walrus_status ?? "not_configured",
      blobId: row.walrus_blob_id ?? null,
      objectId: null,
      hash: String(row.output_hash ?? ""),
    },
    createdAt: new Date(row.created_at).toISOString(),
    memoryEnabled: isMemoryEnabled(),
  }));
}
