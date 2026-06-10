import { syncGlobalWorldCupMemory } from "../global-world-cup-memory.js";
import { getLiveDataProvider } from "./live-data-provider.js";
import {
  finishSyncRun,
  fixtureProviderRef,
  startSyncRun,
  syncContentHash,
  upsertAvailability,
  upsertLineupSnapshot,
  upsertLiveSnapshot,
  upsertProviderFixtures,
} from "./live-data-store.js";
import type { LiveDataJobType, LiveDataSyncInput, LiveDataSyncResult, LiveDataSyncStatus } from "./live-data-types.js";

function scope(input: LiveDataSyncInput): string {
  return input.matchId ?? input.teamCode ?? "world-cup-2026";
}

function mode(input: LiveDataSyncInput): "dry_run" | "apply" {
  return input.mode === "apply" ? "apply" : "dry_run";
}

async function providerFixtureId(input: LiveDataSyncInput, providerName: ReturnType<typeof getLiveDataProvider>["name"]): Promise<string | null> {
  if (input.providerFixtureId) return input.providerFixtureId;
  if (!input.matchId) return null;
  return fixtureProviderRef(input.matchId, providerName);
}

function countFetched(jobType: LiveDataJobType, payload: unknown): number {
  if (Array.isArray(payload)) return payload.length;
  if (jobType === "live_tick" || jobType === "finalize_result") {
    const live = payload as { events?: unknown[]; supported?: boolean };
    return (live.supported === false ? 0 : 1) + (live.events?.length ?? 0);
  }
  if (jobType === "lineups") {
    const lineups = payload as { lineups?: unknown[] };
    return lineups.lineups?.length ?? 0;
  }
  return payload ? 1 : 0;
}

export async function syncLiveData(input: LiveDataSyncInput): Promise<LiveDataSyncResult> {
  const selectedProvider = getLiveDataProvider(input.provider);
  const selectedMode = mode(input);
  const jobType = input.jobType;
  const syncScope = scope(input);
  const runId = await startSyncRun({ provider: selectedProvider.name, jobType, scope: syncScope, mode: selectedMode });
  const warnings: string[] = [];

  try {
    const ref = input.matchId
      ? {
          matchId: input.matchId,
          providerFixtureId: await providerFixtureId(input, selectedProvider.name),
        }
      : null;

    let payload: unknown;
    let appliedCount = 0;
    let status: LiveDataSyncStatus = "completed";

    if (jobType === "fixtures_full") {
      const fixtures = await selectedProvider.listFixtures({ providerFixtureId: input.providerFixtureId });
      payload = fixtures;
      if (selectedMode === "apply") {
        appliedCount = await upsertProviderFixtures(fixtures);
        await syncGlobalWorldCupMemory({ reason: `live-data:${jobType}`, force: true }).catch((error) =>
          warnings.push(`memory-sync-failed:${error instanceof Error ? error.message : String(error)}`),
        );
      }
    } else if (jobType === "live_tick" || jobType === "finalize_result") {
      if (!ref) throw new Error("matchId required");
      const live = await selectedProvider.getFixtureLive(ref);
      payload = live;
      if (!live.supported) {
        status = "not_supported";
        if (live.reason) warnings.push(live.reason);
      } else if (selectedMode === "apply") {
        appliedCount = await upsertLiveSnapshot(live);
        if (jobType === "finalize_result" && live.status !== "finished") {
          warnings.push("Provider match is not final; score oracle still requires operator review.");
        }
      }
    } else if (jobType === "lineups") {
      if (!ref) throw new Error("matchId required");
      const lineups = await selectedProvider.getLineups(ref);
      payload = lineups;
      if (!lineups.supported) {
        status = "not_supported";
        if (lineups.reason) warnings.push(lineups.reason);
      } else if (selectedMode === "apply") {
        appliedCount = await upsertLineupSnapshot(lineups);
      }
    } else {
      const availability = await selectedProvider.getAvailability({
        matchId: input.matchId,
        teamCode: input.teamCode,
        providerFixtureId: ref?.providerFixtureId,
      });
      payload = availability;
      if (selectedMode === "apply") appliedCount = await upsertAvailability(availability);
    }

    const fetchedCount = countFetched(jobType, payload);
    const contentHash = syncContentHash(payload);
    await finishSyncRun({ runId, status, fetchedCount, appliedCount, contentHash });
    return {
      provider: selectedProvider.name,
      jobType,
      mode: selectedMode,
      status,
      fetchedCount,
      appliedCount,
      contentHash,
      warnings,
      runId,
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await finishSyncRun({ runId, status: "failed", fetchedCount: 0, appliedCount: 0, contentHash: null, error: message });
    throw error;
  }
}
