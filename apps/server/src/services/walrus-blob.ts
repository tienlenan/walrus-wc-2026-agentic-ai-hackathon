import { createHash } from "node:crypto";

export interface WalrusBlobPointer {
  status: "not_configured" | "published" | "already_certified" | "failed";
  blobId: string | null;
  objectId: string | null;
  hash: string;
  error?: string;
}

interface WalrusStoreResponse {
  newlyCreated?: {
    blobObject?: {
      id?: string;
      blobId?: string;
    };
  };
  alreadyCertified?: {
    blobId?: string;
  };
}

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => [key, normalize(item)]),
  );
}

function stableJson(value: unknown): string {
  return JSON.stringify(normalize(value));
}

export function contentHash(value: unknown): string {
  const body = typeof value === "string" ? value : stableJson(value);
  return createHash("sha256").update(body).digest("hex");
}

export async function publishJsonBlob(kind: string, value: unknown): Promise<WalrusBlobPointer> {
  const hash = contentHash(value);
  const publisher = process.env.WALRUS_PUBLISHER_URL?.replace(/\/$/, "");
  if (!publisher) return { status: "not_configured", blobId: null, objectId: null, hash };

  const epochs = Number(process.env.WALRUS_BLOB_EPOCHS ?? 12);
  const url = `${publisher}/v1/blobs?epochs=${Number.isFinite(epochs) ? epochs : 12}&deletable=true`;
  const headers: Record<string, string> = {
    "content-type": "application/json; charset=utf-8",
    "x-daily-walrus-kind": kind,
  };
  if (process.env.WALRUS_PUBLISHER_TOKEN) {
    headers.authorization = `Bearer ${process.env.WALRUS_PUBLISHER_TOKEN}`;
  }

  try {
    const res = await fetch(url, {
      method: "PUT",
      headers,
      body: JSON.stringify(value),
    });
    const data = (await res.json().catch(() => ({}))) as WalrusStoreResponse;
    if (!res.ok) throw new Error(`publisher ${res.status}`);

    const created = data.newlyCreated?.blobObject;
    if (created?.blobId) {
      return { status: "published", blobId: created.blobId, objectId: created.id ?? null, hash };
    }
    if (data.alreadyCertified?.blobId) {
      return { status: "already_certified", blobId: data.alreadyCertified.blobId, objectId: null, hash };
    }
    return { status: "failed", blobId: null, objectId: null, hash, error: "publisher response missing blobId" };
  } catch (error) {
    return { status: "failed", blobId: null, objectId: null, hash, error: error instanceof Error ? error.message : String(error) };
  }
}
