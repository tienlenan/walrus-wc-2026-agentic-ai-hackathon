// wc_predict object ids. Server overrides via env (WC_*); the web chooses by
// VITE_SUI_NETWORK. Clock = 0x6 (Sui system object).
import { MAINNET_DEPLOYMENT, TESTNET_DEPLOYMENT } from "./deployments.js";

export const SUI_CLOCK = "0x6";

function fromEnv(key: string): string | undefined {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  return env?.[key];
}

function deployment() {
  const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const network = fromEnv("SUI_NETWORK") ?? viteEnv?.VITE_SUI_NETWORK;
  return network === "mainnet" ? MAINNET_DEPLOYMENT : TESTNET_DEPLOYMENT;
}

export const ids = {
  pkg: () => fromEnv("WC_PACKAGE_ID") ?? deployment().packageId,
  registry: () => fromEnv("WC_REGISTRY_ID") ?? deployment().registryId,
  scoreboard: () => fromEnv("WC_SCOREBOARD_ID") ?? deployment().scoreboardId,
  adminCap: () => fromEnv("WC_ADMIN_CAP_ID") ?? deployment().adminCapId,
  oracleCap: () => fromEnv("WC_ORACLE_CAP_ID") ?? deployment().oracleCapId,
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
