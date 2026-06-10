const BASE = import.meta.env.VITE_MASTRA_URL ?? "http://localhost:4111";

export interface MatchLiveState {
  matchId: string;
  provider: string;
  providerFixtureId: string | null;
  status: string;
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

export interface MatchEvent {
  id: string;
  matchId: string;
  provider: string;
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

export interface LineupPlayer {
  playerName: string;
  providerPlayerId: string | null;
  shirtNumber: number | null;
  position: string | null;
  role: "starter" | "substitute" | "coach";
  grid: string | null;
  pitchX: number | null;
  pitchY: number | null;
}

export interface TeamLineup {
  matchId: string;
  teamCode: string | null;
  teamName: string;
  provider: string;
  providerTeamId: string | null;
  formation: string | null;
  coach: string | null;
  confirmed: boolean;
  sourceUrl: string | null;
  updatedAt: string;
  players: LineupPlayer[];
}

export interface PlayerAvailability {
  id: string;
  matchId: string | null;
  teamCode: string | null;
  teamName: string;
  playerName: string;
  providerPlayerId: string | null;
  status: string;
  note: string | null;
  reason: string | null;
  sourceUrl: string | null;
  updatedAt: string;
}

export interface LiveMatchFixture {
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
}

export interface LiveMatchDetail {
  fixture: LiveMatchFixture;
  live: MatchLiveState | null;
  events: MatchEvent[];
  lineups: TeamLineup[];
  availability: PlayerAvailability[];
  stale: boolean;
  updatedAt: string;
}

export async function listLiveMatches(limit = 12): Promise<LiveMatchDetail[]> {
  const res = await fetch(`${BASE}/api/matches/live?limit=${limit}`);
  if (!res.ok) throw new Error(`matches ${res.status}`);
  const data = (await res.json()) as { matches: LiveMatchDetail[] };
  return data.matches;
}

export async function getLiveMatch(matchId: string): Promise<LiveMatchDetail> {
  const res = await fetch(`${BASE}/api/matches/${encodeURIComponent(matchId)}/live`);
  if (!res.ok) throw new Error(`match ${res.status}`);
  const data = (await res.json()) as { match: LiveMatchDetail };
  return data.match;
}
