import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { walrus } from "@mysten/walrus";
import { getSuiGrpcClient } from "./sui-clients.js";

export interface WalrusBlobPointer {
  status: "not_configured" | "published" | "already_certified" | "failed";
  blobId: string | null;
  objectId: string | null;
  hash: string;
  error?: string;
}

interface WalrusStoreResponse {
  blobStoreResult?: WalrusStoreResponse;
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

function unwrapStoreResponse(value: WalrusStoreResponse | WalrusStoreResponse[]): WalrusStoreResponse {
  const first = Array.isArray(value) ? value[0] : value;
  return first?.blobStoreResult ?? first ?? {};
}

export function contentHash(value: unknown): string {
  const body = typeof value === "string" ? value : stableJson(value);
  return createHash("sha256").update(body).digest("hex");
}

async function publishWithHttpPublisher(kind: string, value: unknown, hash: string): Promise<WalrusBlobPointer> {
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
    const data = unwrapStoreResponse((await res.json().catch(() => ({}))) as WalrusStoreResponse | WalrusStoreResponse[]);
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

async function runWalrusCliStore(file: string): Promise<WalrusStoreResponse> {
  const binary = process.env.WALRUS_BINARY ?? "/Users/mpdh/.local/share/suiup/binaries/mainnet/walrus-v1.49.1";
  const context = process.env.WALRUS_CONTEXT ?? process.env.SUI_NETWORK ?? "mainnet";
  const epochs = process.env.WALRUS_BLOB_EPOCHS ?? "12";
  const args = ["--context", context, "--json", "store", "--epochs", epochs, "--force", "--ignore-resources", file];
  if (process.env.WALRUS_CONFIG) args.unshift("--config", process.env.WALRUS_CONFIG);

  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) return reject(new Error(stderr || `walrus exited ${code}`));
      try {
        resolve(unwrapStoreResponse(JSON.parse(stdout) as WalrusStoreResponse | WalrusStoreResponse[]));
      } catch {
        reject(new Error(`cannot parse walrus JSON: ${stdout.slice(0, 500)}`));
      }
    });
  });
}

async function publishWithWalrusCli(kind: string, value: unknown, hash: string): Promise<WalrusBlobPointer> {
  const binary = process.env.WALRUS_BINARY ?? "/Users/mpdh/.local/share/suiup/binaries/mainnet/walrus-v1.49.1";
  if (process.env.WALRUS_CLI_DISABLED === "true") return { status: "not_configured", blobId: null, objectId: null, hash };
  const tmp = await mkdtemp(path.join(tmpdir(), "daily-walrus-blob-"));
  try {
    const file = path.join(tmp, `${kind.replace(/[^a-z0-9._-]/gi, "-")}-${hash.slice(0, 12)}.json`);
    await writeFile(file, stableJson(value));
    const data = await runWalrusCliStore(file);
    const created = data.newlyCreated?.blobObject;
    if (created?.blobId) {
      return { status: "published", blobId: created.blobId, objectId: created.id ?? null, hash };
    }
    if (data.alreadyCertified?.blobId) {
      return { status: "already_certified", blobId: data.alreadyCertified.blobId, objectId: null, hash };
    }
    return { status: "failed", blobId: null, objectId: null, hash, error: "walrus CLI response missing blobId" };
  } catch (error) {
    return {
      status: binary ? "failed" : "not_configured",
      blobId: null,
      objectId: null,
      hash,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

// Walrus upload relay offloads the slow multi-node storage coordination to a hosted relay,
// keeping the client-side write within serverless time limits (the signer still pays WAL + a small SUI tip).
function uploadRelayOptions(): { host: string; sendTip: { max: number } } | undefined {
  if (process.env.WALRUS_UPLOAD_RELAY_DISABLED === "true") return undefined;
  const network = process.env.WALRUS_CONTEXT ?? process.env.SUI_NETWORK ?? "mainnet";
  const host =
    process.env.WALRUS_UPLOAD_RELAY_HOST ??
    (network === "mainnet" ? "https://upload-relay.mainnet.walrus.space" : "https://upload-relay.testnet.walrus.space");
  // Tip scales with blob size; ~2.6M MIST for a few-KB briefing, so default the cap well above that.
  const maxTip = Number(process.env.WALRUS_UPLOAD_RELAY_TIP_MAX ?? 10_000_000);
  return { host, sendTip: { max: Number.isFinite(maxTip) ? maxTip : 10_000_000 } };
}

async function publishWithWalrusSdk(value: unknown, hash: string): Promise<WalrusBlobPointer> {
  const secret = process.env.WALRUS_SDK_WALLET_KEY ?? process.env.SESSION_WALLET_KEY ?? process.env.ORACLE_WALLET_KEY;
  if (!secret || process.env.WALRUS_SDK_DISABLED === "true") return { status: "not_configured", blobId: null, objectId: null, hash };
  try {
    const signer = Ed25519Keypair.fromSecretKey(secret);
    const relay = uploadRelayOptions();
    const client = getSuiGrpcClient().$extend(relay ? walrus({ uploadRelay: relay }) : walrus());
    const result = (await client.walrus.writeBlob({
      blob: new TextEncoder().encode(stableJson(value)),
      deletable: true,
      epochs: Number(process.env.WALRUS_BLOB_EPOCHS ?? 12),
      signer,
    })) as { blobId?: string; id?: string; blobObject?: { id?: string } };
    if (!result.blobId) return { status: "failed", blobId: null, objectId: null, hash, error: "Walrus SDK response missing blobId" };
    return { status: "published", blobId: result.blobId, objectId: result.id ?? result.blobObject?.id ?? null, hash };
  } catch (error) {
    return { status: "failed", blobId: null, objectId: null, hash, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function publishJsonBlob(kind: string, value: unknown): Promise<WalrusBlobPointer> {
  const hash = contentHash(value);
  const httpPointer = await publishWithHttpPublisher(kind, value, hash);
  if (httpPointer.status === "published" || httpPointer.status === "already_certified") return httpPointer;
  const sdkPointer = await publishWithWalrusSdk(value, hash);
  if (sdkPointer.status !== "not_configured" && sdkPointer.status !== "failed") return sdkPointer;
  if (sdkPointer.status === "failed" && process.env.WALRUS_CLI_DISABLED === "true") return sdkPointer;
  const cliPointer = await publishWithWalrusCli(kind, value, hash);
  if (cliPointer.status === "failed" && httpPointer.status === "failed") {
    return { ...cliPointer, error: `${httpPointer.error ?? "HTTP publisher failed"}; ${cliPointer.error ?? "Walrus CLI failed"}` };
  }
  return cliPointer;
}
