// wc_predict object ids. Server overrides via env (WC_*); the web falls back to the
// committed testnet deployment. Clock = 0x6 (Sui system object).
import { TESTNET_DEPLOYMENT as D } from "./deployments.js";

export const SUI_CLOCK = "0x6";

function fromEnv(key: string): string | undefined {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  return env?.[key];
}

export const ids = {
  pkg: () => fromEnv("WC_PACKAGE_ID") ?? D.packageId,
  registry: () => fromEnv("WC_REGISTRY_ID") ?? D.registryId,
  scoreboard: () => fromEnv("WC_SCOREBOARD_ID") ?? D.scoreboardId,
  adminCap: () => fromEnv("WC_ADMIN_CAP_ID") ?? D.adminCapId,
  oracleCap: () => fromEnv("WC_ORACLE_CAP_ID") ?? D.oracleCapId,
};

/** Kind encoding (matches prediction_game.move). */
export const Kind = {
  Scoreline: 0,
  MatchMvp: 1,
  WorstPlayer: 2,
  Champion: 3,
  Advance: 4,
} as const;

/** User output kind encoding (matches prediction_game.move). */
export const OutputKind = {
  Chat: 0,
  Roast: 1,
  MatchVote: 2,
  NotebookQuery: 3,
  ProfilePointer: 4,
} as const;
