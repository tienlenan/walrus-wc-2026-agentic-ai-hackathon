import { ApiFootballProvider } from "./providers/api-football-provider.js";
import { StaticWorldCupProvider } from "./providers/static-worldcup-provider.js";
import type { LiveDataProvider, LiveDataProviderName } from "./live-data-types.js";

export function configuredProviderName(): LiveDataProviderName {
  const raw = (process.env.LIVE_DATA_PROVIDER ?? "openfootball").trim().toLowerCase();
  if (raw === "api-football" || raw === "sportmonks" || raw === "balldontlie" || raw === "openfootball") return raw;
  return "openfootball";
}

export function getLiveDataProvider(name: LiveDataProviderName = configuredProviderName()): LiveDataProvider {
  if (name === "api-football") return new ApiFootballProvider();
  return new StaticWorldCupProvider(name);
}
