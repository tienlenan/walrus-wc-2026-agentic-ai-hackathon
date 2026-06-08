// IDs của wc_predict contract (đọc từ env sau khi publish). Clock = 0x6 (system object).
export const SUI_CLOCK = "0x6";

function req(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`${key} chưa set — publish contract trước (sui client publish).`);
  return v;
}

export const ids = {
  pkg: () => req("WC_PACKAGE_ID"),
  registry: () => req("WC_REGISTRY_ID"),
  scoreboard: () => req("WC_SCOREBOARD_ID"),
  adminCap: () => req("WC_ADMIN_CAP_ID"),
  oracleCap: () => req("WC_ORACLE_CAP_ID"),
};

/** Kind encoding (khớp prediction_game.move). */
export const Kind = {
  Scoreline: 0,
  MatchMvp: 1,
  WorstPlayer: 2,
  Champion: 3,
  Advance: 4,
} as const;
