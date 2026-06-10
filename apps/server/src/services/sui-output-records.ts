import { getPool } from "@daily-walrus/db";

const OUTPUT_KINDS = new Set(["chat", "roast", "match_vote", "notebook_query", "profile_pointer"]);
const RESOURCE_TYPES = new Set(["chat_message", "roast", "match_vote", "notebook_query", "team_profile", "gift_reveal", "daily_briefing"]);

export interface RegisterOutputInput {
  outputKind?: string;
  resourceType?: string;
  resourceId?: string;
  suiObjectId?: string | null;
  txDigest?: string;
  blobId?: string | null;
  contentHash?: string;
  walrusStatus?: string;
}

export interface SuiOutputRecordDto {
  id: string;
  outputKind: string;
  resourceType: string;
  resourceId: string;
  suiObjectId: string | null;
  txDigest: string;
  blobId: string | null;
  contentHash: string;
  walrusStatus: string;
  createdAt: string;
}

export async function ensureUser(address: string): Promise<string> {
  const { rows } = await getPool().query(
    `insert into users(sui_address)
     values ($1)
     on conflict (sui_address) do update set sui_address = excluded.sui_address
     returning id`,
    [address],
  );
  return rows[0].id as string;
}

function cleanId(value: unknown, label: string): string {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${label} required`);
  return text.slice(0, 180);
}

function cleanHex(value: unknown, label: string): string {
  const text = cleanId(value, label).toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(text)) throw new Error(`${label} must be sha256 hex`);
  return text;
}

export async function registerSuiOutputRecord(address: string, input: RegisterOutputInput): Promise<SuiOutputRecordDto> {
  if (!address.startsWith("0x")) throw new Error("verified Sui session required");

  const outputKind = cleanId(input.outputKind, "outputKind");
  const resourceType = cleanId(input.resourceType, "resourceType");
  if (!OUTPUT_KINDS.has(outputKind)) throw new Error("unsupported outputKind");
  if (!RESOURCE_TYPES.has(resourceType)) throw new Error("unsupported resourceType");

  const resourceId = cleanId(input.resourceId, "resourceId");
  const txDigest = cleanId(input.txDigest, "txDigest");
  const contentHash = cleanHex(input.contentHash, "contentHash");
  const suiObjectId = input.suiObjectId ? cleanId(input.suiObjectId, "suiObjectId") : null;
  const blobId = input.blobId ? cleanId(input.blobId, "blobId") : null;
  const walrusStatus = cleanId(input.walrusStatus || "not_configured", "walrusStatus");
  const userId = await ensureUser(address);

  const { rows } = await getPool().query(
    `insert into sui_output_records(
       user_id, output_kind, resource_type, resource_id, sui_object_id,
       tx_digest, blob_id, content_hash, walrus_status
     )
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     on conflict (tx_digest) do update set
       sui_object_id = excluded.sui_object_id,
       blob_id = excluded.blob_id,
       content_hash = excluded.content_hash,
       walrus_status = excluded.walrus_status
     returning id, output_kind, resource_type, resource_id, sui_object_id,
       tx_digest, blob_id, content_hash, walrus_status, created_at`,
    [userId, outputKind, resourceType, resourceId, suiObjectId, txDigest, blobId, contentHash, walrusStatus],
  );

  if (resourceType === "roast") {
    await getPool().query(
      `update roasts
       set output_object_id = $2, output_tx_digest = $3, output_hash = $4,
           walrus_blob_id = $5, walrus_status = $6
       where id = $1 and resource_id = $7`,
      [resourceId, suiObjectId, txDigest, contentHash, blobId, walrusStatus, address],
    );
  }

  const row = rows[0];
  return {
    id: String(row.id),
    outputKind: String(row.output_kind),
    resourceType: String(row.resource_type),
    resourceId: String(row.resource_id),
    suiObjectId: row.sui_object_id ?? null,
    txDigest: String(row.tx_digest),
    blobId: row.blob_id ?? null,
    contentHash: String(row.content_hash),
    walrusStatus: String(row.walrus_status),
    createdAt: new Date(row.created_at).toISOString(),
  };
}
