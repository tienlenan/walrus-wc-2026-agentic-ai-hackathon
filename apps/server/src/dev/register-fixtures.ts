import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { buildRegisterMatch } from "@daily-walrus/contract";
import { getPool } from "@daily-walrus/db";
import { getWorldCupFixtures, type WorldCupFixtureDto } from "../services/world-cup-data.js";
import { indexOnce } from "../services/event-indexer.js";
import { getSuiGrpcClient } from "../services/sui-clients.js";

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length);
}

function signerFromEnv(): Ed25519Keypair {
  const secret = process.env.ADMIN_WALLET_KEY ?? process.env.SESSION_WALLET_KEY ?? process.env.ORACLE_WALLET_KEY;
  if (!secret) throw new Error("ADMIN_WALLET_KEY or SESSION_WALLET_KEY required for --execute");
  return Ed25519Keypair.fromSecretKey(secret);
}

function stageRound(stage: string): number {
  switch (stage) {
    case "Group Stage":
      return 1;
    case "Round of 32":
      return 2;
    case "Round of 16":
      return 3;
    case "Quarter-Finals":
      return 4;
    case "Semi-Finals":
      return 5;
    case "Third Place":
      return 6;
    case "Final":
      return 7;
    default:
      return 0;
  }
}

function fixtureLabel(fixture: WorldCupFixtureDto): string {
  return `${fixture.home} vs ${fixture.away}`;
}

async function registeredMatchIds(): Promise<Set<string>> {
  if (!process.env.DATABASE_URL) return new Set();
  const { rows } = await getPool().query("select match_id from fixtures where chain_registered is true");
  return new Set(rows.map((row) => String(row.match_id)));
}

const match = arg("match") ?? arg("matchId");
const group = arg("group")?.toUpperCase();
const stage = arg("stage");
const execute = process.argv.includes("--execute");
const force = process.argv.includes("--force");

const registered = force ? new Set<string>() : await registeredMatchIds();
const fixtures = getWorldCupFixtures().filter((fixture) => {
  if (registered.has(fixture.matchId)) return false;
  if (match && fixture.matchId !== match) return false;
  if (group && fixture.groupName !== group) return false;
  if (stage && fixture.stage.toLowerCase() !== stage.toLowerCase()) return false;
  return true;
});

if (!execute) {
  console.log(
    JSON.stringify(
      {
        mode: "dry_run",
        count: fixtures.length,
        examples: fixtures.slice(0, 12).map((fixture) => ({
          matchId: fixture.matchId,
          groupName: fixture.groupName,
          stage: fixture.stage,
          label: fixtureLabel(fixture),
          kickoff: fixture.kickoff,
        })),
        next: "Add --execute to register these fixtures on-chain.",
      },
      null,
      2,
    ),
  );
  if (process.env.DATABASE_URL) await getPool().end();
  process.exit(0);
}

const signer = signerFromEnv();
const sui = getSuiGrpcClient();
const results: Array<{ matchId: string; digest?: string; error?: string }> = [];

for (const fixture of fixtures) {
  try {
    const tx = buildRegisterMatch({
      matchId: BigInt(fixture.matchId),
      label: fixtureLabel(fixture),
      kickoffMs: BigInt(new Date(fixture.kickoff).getTime()),
      round: stageRound(fixture.stage),
    });
    const result = await sui.signAndExecuteTransaction({
      transaction: tx,
      signer,
      include: { effects: true, events: true },
    });
    const digest = result.Transaction?.digest ?? result.FailedTransaction?.digest;
    const error = result.FailedTransaction?.status?.error ?? result.Transaction?.status?.error;
    if (!digest || result.FailedTransaction || error) throw new Error(String(error ?? "transaction failed"));
    results.push({ matchId: fixture.matchId, digest });
  } catch (error) {
    results.push({ matchId: fixture.matchId, error: error instanceof Error ? error.message : String(error) });
  }
}

const indexed = process.env.DATABASE_URL ? await indexOnce() : { indexed: 0 };
console.log(JSON.stringify({ mode: "execute", submitted: results.length, indexed: indexed.indexed, results }, null, 2));
if (process.env.DATABASE_URL) await getPool().end();
