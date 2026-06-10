import { apiFootballStatus, num, sourceMeta, str } from "../provider-normalizers.js";
import type {
  AvailabilitySyncInput,
  FixtureSyncInput,
  LiveDataProvider,
  LiveDataProviderCapabilities,
  ProviderAvailability,
  ProviderFixture,
  ProviderFixtureRef,
  ProviderLineupSnapshot,
  ProviderLiveSnapshot,
  ProviderMatchEvent,
  ProviderTeamLineup,
} from "../live-data-types.js";

const API_FOOTBALL_BASE = "https://v3.football.api-sports.io";
const API_FOOTBALL_WORLD_CUP_LEAGUE = process.env.API_FOOTBALL_WORLD_CUP_LEAGUE ?? "1";
const API_FOOTBALL_WORLD_CUP_SEASON = process.env.API_FOOTBALL_WORLD_CUP_SEASON ?? "2026";

const API_FOOTBALL_CAPABILITIES: LiveDataProviderCapabilities = {
  fixtures: true,
  results: true,
  events: true,
  lineups: true,
  availability: true,
  ratings: true,
};

type ApiFootballEnvelope<T> = {
  response?: T[];
  errors?: unknown;
};

function apiKey(): string {
  const key = process.env.API_FOOTBALL_KEY ?? process.env.API_FOOTBALL_API_KEY;
  if (!key) throw new Error("API_FOOTBALL_KEY is not set");
  return key;
}

async function fetchApiFootball<T>(path: string, params: Record<string, string | number | undefined>): Promise<T[]> {
  const url = new URL(`${API_FOOTBALL_BASE}/${path.replace(/^\//, "")}`);
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== "") url.searchParams.set(key, String(value));
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.LIVE_DATA_TIMEOUT_MS ?? 6000));
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "x-apisports-key": apiKey(),
        "user-agent": "TheDailyWalrus/1.0 (+https://roast2026wc.wal.app)",
      },
    });
    if (!response.ok) throw new Error(`API-Football ${path} ${response.status}`);
    const body = (await response.json()) as ApiFootballEnvelope<T>;
    if (body.errors && JSON.stringify(body.errors) !== "[]") {
      const text = JSON.stringify(body.errors).slice(0, 300);
      if (text !== "{}") throw new Error(`API-Football ${path} errors: ${text}`);
    }
    return body.response ?? [];
  } finally {
    clearTimeout(timeout);
  }
}

function teamRef(value: unknown) {
  const row = (value ?? {}) as Record<string, unknown>;
  return {
    code: null,
    name: str(row.name, "TBD"),
    providerTeamId: row.id == null ? null : String(row.id),
  };
}

function playerRef(value: unknown) {
  const row = (value ?? {}) as Record<string, unknown>;
  return {
    providerPlayerId: row.id == null ? null : String(row.id),
    playerName: str(row.name, "Unknown player"),
    shirtNumber: num(row.number),
    position: row.pos == null ? null : str(row.pos),
  };
}

function fixtureUrl(id?: string | null): string {
  return id ? `${API_FOOTBALL_BASE}/fixtures?id=${encodeURIComponent(id)}` : `${API_FOOTBALL_BASE}/fixtures`;
}

export class ApiFootballProvider implements LiveDataProvider {
  readonly name = "api-football" as const;
  readonly capabilities = API_FOOTBALL_CAPABILITIES;

  async listFixtures(input: FixtureSyncInput): Promise<ProviderFixture[]> {
    const response = await fetchApiFootball<Record<string, unknown>>("fixtures", {
      league: API_FOOTBALL_WORLD_CUP_LEAGUE,
      season: input.season ?? API_FOOTBALL_WORLD_CUP_SEASON,
      date: input.date,
      id: input.providerFixtureId,
    });
    return response.map((item) => {
      const fixture = (item.fixture ?? {}) as Record<string, unknown>;
      const teams = (item.teams ?? {}) as Record<string, unknown>;
      const goals = (item.goals ?? {}) as Record<string, unknown>;
      const league = (item.league ?? {}) as Record<string, unknown>;
      const status = (fixture.status ?? {}) as Record<string, unknown>;
      const venue = (fixture.venue ?? {}) as Record<string, unknown>;
      const providerFixtureId = str(fixture.id);
      return {
        matchId: input.matchId ?? null,
        providerFixtureId,
        stage: str(league.round) || null,
        groupName: null,
        home: teamRef(teams.home),
        away: teamRef(teams.away),
        kickoff: fixture.date ? new Date(str(fixture.date)).toISOString() : null,
        venue: venue.name == null ? null : str(venue.name),
        city: venue.city == null ? null : str(venue.city),
        status: apiFootballStatus(status.short),
        homeScore: num(goals.home),
        awayScore: num(goals.away),
        source: sourceMeta({
          provider: this.name,
          sourceUrl: fixtureUrl(providerFixtureId),
          sourceUpdatedAt: fixture.timestamp == null ? null : new Date(Number(fixture.timestamp) * 1000).toISOString(),
          raw: item,
        }),
      };
    });
  }

  async getFixtureLive(input: ProviderFixtureRef): Promise<ProviderLiveSnapshot> {
    const providerFixtureId = input.providerFixtureId ?? input.matchId;
    const [fixture] = await this.listFixtures({ matchId: input.matchId, providerFixtureId });
    const events = await fetchApiFootball<Record<string, unknown>>("fixtures/events", { fixture: providerFixtureId });
    const mappedEvents: ProviderMatchEvent[] = events.map((event, index) => {
      const time = (event.time ?? {}) as Record<string, unknown>;
      const team = event.team ? teamRef(event.team) : null;
      const player = event.player ? playerRef(event.player) : null;
      const assist = event.assist ? playerRef(event.assist) : null;
      return {
        providerEventId: event.id == null ? `${providerFixtureId}-${index}` : String(event.id),
        minute: num(time.elapsed),
        extraMinute: num(time.extra),
        eventType: str(event.type, "event"),
        detail: event.detail == null ? null : str(event.detail),
        team,
        player,
        assist,
        comments: event.comments == null ? null : str(event.comments),
        source: sourceMeta({ provider: this.name, sourceUrl: `${API_FOOTBALL_BASE}/fixtures/events?fixture=${providerFixtureId}`, raw: event }),
      };
    });
    return {
      matchId: input.matchId,
      providerFixtureId,
      status: fixture?.status ?? "unknown",
      period: fixture?.status ?? null,
      elapsed: null,
      homeScore: fixture?.homeScore ?? null,
      awayScore: fixture?.awayScore ?? null,
      events: mappedEvents,
      source: sourceMeta({ provider: this.name, sourceUrl: fixtureUrl(providerFixtureId), raw: { fixture, events } }),
      supported: true,
    };
  }

  async getLineups(input: ProviderFixtureRef): Promise<ProviderLineupSnapshot> {
    const providerFixtureId = input.providerFixtureId ?? input.matchId;
    const response = await fetchApiFootball<Record<string, unknown>>("fixtures/lineups", { fixture: providerFixtureId });
    const lineups: ProviderTeamLineup[] = response.map((row) => {
      const team = teamRef(row.team);
      const startXI = Array.isArray(row.startXI) ? row.startXI : [];
      const substitutes = Array.isArray(row.substitutes) ? row.substitutes : [];
      const players = [
        ...startXI.map((item) => ({ item: item as Record<string, unknown>, role: "starter" as const })),
        ...substitutes.map((item) => ({ item: item as Record<string, unknown>, role: "substitute" as const })),
      ].map(({ item, role }) => {
        const player = (item.player ?? {}) as Record<string, unknown>;
        return {
          team,
          player: playerRef(player),
          role,
          grid: player.grid == null ? null : str(player.grid),
          pitchX: null,
          pitchY: null,
        };
      });
      return {
        team,
        formation: row.formation == null ? null : str(row.formation),
        coach: row.coach ? str((row.coach as Record<string, unknown>).name) || null : null,
        confirmed: true,
        players,
      };
    });
    return {
      matchId: input.matchId,
      providerFixtureId,
      lineups,
      source: sourceMeta({ provider: this.name, sourceUrl: `${API_FOOTBALL_BASE}/fixtures/lineups?fixture=${providerFixtureId}`, raw: response }),
      supported: true,
    };
  }

  async getAvailability(input: AvailabilitySyncInput): Promise<ProviderAvailability[]> {
    const response = await fetchApiFootball<Record<string, unknown>>("injuries", {
      league: API_FOOTBALL_WORLD_CUP_LEAGUE,
      season: API_FOOTBALL_WORLD_CUP_SEASON,
      fixture: input.providerFixtureId ?? undefined,
      team: input.teamCode,
    });
    return response.map((row) => {
      const team = teamRef(row.team);
      const player = playerRef(row.player);
      return {
        matchId: input.matchId ?? null,
        team,
        player,
        status: "injured",
        note: row.type == null ? null : str(row.type),
        reason: row.reason == null ? null : str(row.reason),
        source: sourceMeta({ provider: this.name, sourceUrl: `${API_FOOTBALL_BASE}/injuries`, raw: row }),
      };
    });
  }
}
