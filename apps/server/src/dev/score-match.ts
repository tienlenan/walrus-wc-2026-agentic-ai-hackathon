import { getPool } from "@daily-walrus/db";
import { scoreMatch } from "../services/score-keeper.js";

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length);
}

function num(value?: string): number | undefined {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

const matchId = arg("match") ?? arg("matchId");
if (!matchId) {
  console.error("Usage: score-match --match=<id> [--home=1 --away=0] [--execute] [--settle]");
  process.exit(1);
}

const result = await scoreMatch({
  matchId,
  homeScore: num(arg("home")),
  awayScore: num(arg("away")),
  execute: process.argv.includes("--execute"),
  settle: process.argv.includes("--settle"),
});

console.log(JSON.stringify(result, null, 2));
await getPool().end();
