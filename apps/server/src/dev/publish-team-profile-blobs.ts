import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { getPool } from "@daily-walrus/db";
import { contentHash } from "../services/walrus-blob.js";
import { getTeamProfiles } from "../services/world-cup-data.js";

interface WalrusCliResponse {
  blobStoreResult?: WalrusCliResponse;
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

function unwrapStoreResponse(value: WalrusCliResponse | WalrusCliResponse[]): WalrusCliResponse {
  const first = Array.isArray(value) ? value[0] : value;
  return first?.blobStoreResult ?? first ?? {};
}

function argValue(name: string): string | null {
  const prefix = `${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => [key, stable(item)]),
  );
}

function runWalrusStore(file: string): Promise<WalrusCliResponse> {
  const binary = process.env.WALRUS_BINARY ?? "/Users/mpdh/.local/share/suiup/binaries/mainnet/walrus-v1.49.1";
  const context = process.env.WALRUS_CONTEXT ?? "mainnet";
  const epochs = process.env.WALRUS_BLOB_EPOCHS ?? "12";
  const args = ["--context", context, "--json", "store", "--epochs", epochs, file];
  if (process.argv.includes("--dry-run")) args.splice(args.length - 1, 0, "--dry-run");
  else args.splice(args.length - 1, 0, "--force", "--ignore-resources");

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
        resolve(unwrapStoreResponse(JSON.parse(stdout) as WalrusCliResponse | WalrusCliResponse[]));
      } catch {
        reject(new Error(`cannot parse walrus JSON: ${stdout.slice(0, 500)}`));
      }
    });
  });
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const teamFilter = argValue("--team")?.toUpperCase();
  const dryRun = process.argv.includes("--dry-run");
  const tmp = await mkdtemp(path.join(tmpdir(), "daily-walrus-team-profiles-"));
  const pool = getPool();

  try {
    const existing = await pool.query<{ team_code: string }>(
      `select team_code from team_profiles where walrus_blob_id is not null and walrus_status in ('published', 'already_certified')`,
    );
    const published = new Set(existing.rows.map((row) => row.team_code));
    const teams = getTeamProfiles().filter((team) => !teamFilter || team.code === teamFilter);
    if (teamFilter && teams.length === 0) throw new Error(`unknown team ${teamFilter}`);

    for (const team of teams) {
      try {
        if (!teamFilter && published.has(team.code)) {
          console.log(`${team.code} skipped already_published`);
          continue;
        }
        const body = JSON.stringify(stable(team));
        const file = path.join(tmp, `${team.code}.json`);
        await writeFile(file, body);
        const res = await runWalrusStore(file);
        const created = res.newlyCreated?.blobObject;
        const blobId = created?.blobId ?? res.alreadyCertified?.blobId ?? null;
        const status = created?.blobId ? "published" : res.alreadyCertified?.blobId ? "already_certified" : "failed";
        if (!dryRun) {
          await pool.query(
            `update team_profiles
             set walrus_status = $2, walrus_blob_id = $3, walrus_object_id = $4, profile_hash = $5, updated_at = now()
             where team_code = $1`,
            [team.code, status, blobId, created?.id ?? null, contentHash(team)],
          );
        }
        console.log(`${team.code} ${status} ${blobId ?? "no_blob"}`);
      } catch (error) {
        console.error(`${team.code} failed ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  } finally {
    await rm(tmp, { recursive: true, force: true });
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
