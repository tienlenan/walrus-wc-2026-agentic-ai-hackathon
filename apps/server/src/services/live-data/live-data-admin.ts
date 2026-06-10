import { configuredProviderName, getLiveDataProvider } from "./live-data-provider.js";
import { latestSyncRuns } from "./live-data-store.js";
import { providerConfigured } from "./provider-normalizers.js";
import { listLiveMatches } from "./live-match-service.js";
import type { AdminLiveDataStatusDto } from "./live-data-types.js";

export async function getAdminLiveDataStatus(): Promise<AdminLiveDataStatusDto> {
  const providerName = configuredProviderName();
  const provider = getLiveDataProvider(providerName);
  const [latestRuns, activeMatches] = await Promise.all([latestSyncRuns(12), listLiveMatches(6)]);
  return {
    provider: provider.name,
    providerConfigured: providerConfigured(provider.name),
    capabilities: provider.capabilities,
    latestRuns,
    activeMatches,
    updatedAt: new Date().toISOString(),
  };
}
