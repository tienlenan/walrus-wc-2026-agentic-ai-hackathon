export type LiveDataProviderName = "api-football" | "sportmonks" | "balldontlie" | "openfootball";
export type LiveDataCapability = "fixtures" | "results" | "events" | "lineups" | "availability" | "ratings";
export type LiveDataJobType = "fixtures_full" | "pre_match" | "lineups" | "live_tick" | "finalize_result";
export type LiveDataSyncMode = "dry_run" | "apply";
export type LiveDataSyncStatus = "planned" | "running" | "completed" | "failed" | "not_supported";
export type MatchStatus = "scheduled" | "live" | "finished" | "postponed" | "unknown";
export type AvailabilityStatus = "available" | "injured" | "suspended" | "doubtful" | "unavailable" | "unknown";
export type LineupRole = "starter" | "substitute" | "coach";

export interface ProviderSourceMeta {
  provider: LiveDataProviderName;
  sourceUrl: string | null;
  sourceFetchedAt: string;
  sourceUpdatedAt: string | null;
  contentHash: string;
  raw?: unknown;
}

export interface FixtureSyncInput {
  season?: number;
  date?: string;
  matchId?: string;
  providerFixtureId?: string;
}

export interface ProviderFixtureRef {
  matchId: string;
  providerFixtureId?: string | null;
}

export interface AvailabilitySyncInput {
  matchId?: string;
  teamCode?: string;
  providerFixtureId?: string | null;
}

export interface ProviderTeamRef {
  code: string | null;
  name: string;
  providerTeamId: string | null;
}

export interface ProviderPlayerRef {
  localPlayerId?: string | null;
  providerPlayerId: string | null;
  playerName: string;
  shirtNumber?: number | null;
  position?: string | null;
}

export interface ProviderFixture {
  matchId: string | null;
  providerFixtureId: string;
  stage: string | null;
  groupName: string | null;
  home: ProviderTeamRef;
  away: ProviderTeamRef;
  kickoff: string | null;
  venue: string | null;
  city: string | null;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  source: ProviderSourceMeta;
}

export interface ProviderMatchEvent {
  providerEventId: string | null;
  minute: number | null;
  extraMinute: number | null;
  eventType: string;
  detail: string | null;
  team: ProviderTeamRef | null;
  player: ProviderPlayerRef | null;
  assist: ProviderPlayerRef | null;
  comments: string | null;
  source: ProviderSourceMeta;
}

export interface ProviderLiveSnapshot {
  matchId: string;
  providerFixtureId: string | null;
  status: MatchStatus;
  period: string | null;
  elapsed: number | null;
  homeScore: number | null;
  awayScore: number | null;
  events: ProviderMatchEvent[];
  source: ProviderSourceMeta;
  supported: boolean;
  reason?: string;
}

export interface ProviderLineupPlayer {
  team: ProviderTeamRef;
  player: ProviderPlayerRef;
  role: LineupRole;
  grid: string | null;
  pitchX: number | null;
  pitchY: number | null;
}

export interface ProviderTeamLineup {
  team: ProviderTeamRef;
  formation: string | null;
  coach: string | null;
  confirmed: boolean;
  players: ProviderLineupPlayer[];
}

export interface ProviderLineupSnapshot {
  matchId: string;
  providerFixtureId: string | null;
  lineups: ProviderTeamLineup[];
  source: ProviderSourceMeta;
  supported: boolean;
  reason?: string;
}

export interface ProviderAvailability {
  matchId: string | null;
  team: ProviderTeamRef;
  player: ProviderPlayerRef;
  status: AvailabilityStatus;
  note: string | null;
  reason: string | null;
  source: ProviderSourceMeta;
}

export interface LiveDataProviderCapabilities {
  fixtures: boolean;
  results: boolean;
  events: boolean;
  lineups: boolean;
  availability: boolean;
  ratings: boolean;
}

export interface LiveDataProvider {
  name: LiveDataProviderName;
  capabilities: LiveDataProviderCapabilities;
  listFixtures(input: FixtureSyncInput): Promise<ProviderFixture[]>;
  getFixtureLive(input: ProviderFixtureRef): Promise<ProviderLiveSnapshot>;
  getLineups(input: ProviderFixtureRef): Promise<ProviderLineupSnapshot>;
  getAvailability(input: AvailabilitySyncInput): Promise<ProviderAvailability[]>;
}

export interface LiveDataSyncInput {
  jobType: LiveDataJobType;
  mode?: LiveDataSyncMode;
  matchId?: string;
  teamCode?: string;
  provider?: LiveDataProviderName;
  providerFixtureId?: string;
  reason?: string;
}

export interface LiveDataSyncResult {
  provider: LiveDataProviderName;
  jobType: LiveDataJobType;
  mode: LiveDataSyncMode;
  status: LiveDataSyncStatus;
  fetchedCount: number;
  appliedCount: number;
  contentHash: string | null;
  warnings: string[];
  runId: string | null;
  updatedAt: string;
}

export interface MatchLiveStateDto {
  matchId: string;
  provider: LiveDataProviderName;
  providerFixtureId: string | null;
  status: MatchStatus;
  period: string | null;
  elapsed: number | null;
  homeScore: number | null;
  awayScore: number | null;
  sourceUrl: string | null;
  sourceFetchedAt: string | null;
  sourceUpdatedAt: string | null;
  contentHash: string | null;
  updatedAt: string;
}

export interface MatchEventDto {
  id: string;
  matchId: string;
  provider: LiveDataProviderName;
  providerEventId: string | null;
  minute: number | null;
  extraMinute: number | null;
  eventType: string;
  detail: string | null;
  teamCode: string | null;
  teamName: string | null;
  playerName: string | null;
  assistName: string | null;
  comments: string | null;
  sourceUrl: string | null;
}

export interface LineupPlayerDto {
  playerName: string;
  providerPlayerId: string | null;
  shirtNumber: number | null;
  position: string | null;
  role: LineupRole;
  grid: string | null;
  pitchX: number | null;
  pitchY: number | null;
}

export interface TeamLineupDto {
  matchId: string;
  teamCode: string | null;
  teamName: string;
  provider: LiveDataProviderName;
  providerTeamId: string | null;
  formation: string | null;
  coach: string | null;
  confirmed: boolean;
  sourceUrl: string | null;
  updatedAt: string;
  players: LineupPlayerDto[];
}

export interface PlayerAvailabilityDto {
  id: string;
  matchId: string | null;
  teamCode: string | null;
  teamName: string;
  playerName: string;
  providerPlayerId: string | null;
  status: AvailabilityStatus;
  note: string | null;
  reason: string | null;
  sourceUrl: string | null;
  updatedAt: string;
}

export interface LiveMatchDetailDto {
  fixture: {
    matchId: string;
    stage: string | null;
    groupName: string | null;
    home: string;
    away: string;
    homeTeamCode: string | null;
    awayTeamCode: string | null;
    venue: string | null;
    city: string | null;
    kickoff: string | null;
    status: string;
    homeScore: number | null;
    awayScore: number | null;
    predictionOpen?: boolean;
    predictionStatus?: string;
  };
  live: MatchLiveStateDto | null;
  events: MatchEventDto[];
  lineups: TeamLineupDto[];
  availability: PlayerAvailabilityDto[];
  stale: boolean;
  updatedAt: string;
}

export interface AdminLiveDataStatusDto {
  provider: LiveDataProviderName;
  providerConfigured: boolean;
  capabilities: LiveDataProviderCapabilities;
  latestRuns: Array<{
    id: string;
    provider: LiveDataProviderName;
    jobType: LiveDataJobType;
    scope: string;
    mode: LiveDataSyncMode;
    status: LiveDataSyncStatus;
    fetchedCount: number;
    appliedCount: number;
    contentHash: string | null;
    error: string | null;
    startedAt: string;
    completedAt: string | null;
  }>;
  activeMatches: LiveMatchDetailDto[];
  updatedAt: string;
}
