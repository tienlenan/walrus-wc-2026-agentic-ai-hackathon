// wc_predict object ids. Server overrides via env (WC_*); the web falls back to the
// committed testnet deployment. Clock = 0x6 (Sui system object).
import { TESTNET_DEPLOYMENT as D } from "./deployments.js";

export const SUI_CLOCK = "0x6";

function fromEnv(key: string): string | undefined {
  return typeof process !== "undefined" && process.env ? process.env[key] : undefined;
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
