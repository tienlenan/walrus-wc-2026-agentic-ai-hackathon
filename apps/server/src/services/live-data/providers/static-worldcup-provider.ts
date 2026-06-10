import { getWorldCupFixtures } from "../../world-cup-data.js";
import { sourceMeta } from "../provider-normalizers.js";
import type {
  AvailabilitySyncInput,
  FixtureSyncInput,
  LiveDataProvider,
  LiveDataProviderCapabilities,
  LiveDataProviderName,
  ProviderAvailability,
  ProviderFixture,
  ProviderFixtureRef,
  ProviderLineupSnapshot,
  ProviderLiveSnapshot,
} from "../live-data-types.js";

const STATIC_CAPABILITIES: LiveDataProviderCapabilities = {
  fixtures: true,
  results: false,
  events: false,
  lineups: false,
  availability: false,
  ratings: false,
};

export class StaticWorldCupProvider implements LiveDataProvider {
  readonly capabilities = STATIC_CAPABILITIES;

  constructor(readonly name: LiveDataProviderName = "openfootball") {}

  async listFixtures(_input: FixtureSyncInput): Promise<ProviderFixture[]> {
    return getWorldCupFixtures().map((fixture) => {
      const raw = { fixture };
      return {
        matchId: fixture.matchId,
        providerFixtureId: fixture.matchId,
        stage: fixture.stage,
        groupName: fixture.groupName,
        home: { code: fixture.homeTeamCode, name: fixture.home, providerTeamId: fixture.homeTeamCode },
        away: { code: fixture.awayTeamCode, name: fixture.away, providerTeamId: fixture.awayTeamCode },
        kickoff: fixture.kickoff,
        venue: fixture.venue,
        city: fixture.city,
        status: "scheduled",
        homeScore: null,
        awayScore: null,
        source: sourceMeta({ provider: this.name, sourceUrl: fixture.sourceUrl, sourceUpdatedAt: fixture.kickoff, raw }),
      };
    });
  }

  async getFixtureLive(input: ProviderFixtureRef): Promise<ProviderLiveSnapshot> {
    return {
      matchId: input.matchId,
      providerFixtureId: input.providerFixtureId ?? input.matchId,
      status: "scheduled",
      period: null,
      elapsed: null,
      homeScore: null,
      awayScore: null,
      events: [],
      source: sourceMeta({ provider: this.name, raw: { matchId: input.matchId, unsupported: "live" } }),
      supported: false,
      reason: "Static fixture provider has no live feed.",
    };
  }

  async getLineups(input: ProviderFixtureRef): Promise<ProviderLineupSnapshot> {
    return {
      matchId: input.matchId,
      providerFixtureId: input.providerFixtureId ?? input.matchId,
      lineups: [],
      source: sourceMeta({ provider: this.name, raw: { matchId: input.matchId, unsupported: "lineups" } }),
      supported: false,
      reason: "Static fixture provider has no lineup feed.",
    };
  }

  async getAvailability(_input: AvailabilitySyncInput): Promise<ProviderAvailability[]> {
    return [];
  }
}
