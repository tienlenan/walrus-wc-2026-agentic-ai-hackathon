import { syncLiveData } from "../services/live-data/live-data-sync.js";
import type { LiveDataJobType, LiveDataProviderName, LiveDataSyncMode } from "../services/live-data/live-data-types.js";

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length);
}

const jobType = (arg("job") ?? "fixtures_full") as LiveDataJobType;
const matchId = arg("match");
const teamCode = arg("team");
const provider = arg("provider") as LiveDataProviderName | undefined;
const providerFixtureId = arg("provider-fixture");
const mode: LiveDataSyncMode = process.argv.includes("--apply") ? "apply" : "dry_run";

const result = await syncLiveData({ jobType, matchId, teamCode, provider, providerFixtureId, mode });
console.log(JSON.stringify(result, null, 2));
