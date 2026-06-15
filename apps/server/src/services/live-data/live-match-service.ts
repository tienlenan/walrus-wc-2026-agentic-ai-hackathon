import { getPool } from "@daily-walrus/db";
import { getWorldCupSnapshot } from "../world-cup-data.js";
import {
  availabilityForMatch,
  ensureLiveDataTables,
  lineupsForMatch,
  liveStateForMatch,
  matchEvents,
} from "./live-data-store.js";
import type { LiveMatchDetailDto } from "./live-data-types.js";

function stale(updatedAt: string | null): boolean {
  if (!updatedAt) return true;
  return Date.now() - new Date(updatedAt).getTime() > Number(process.env.LIVE_DATA_STALE_MS ?? 5 * 60_000);
}

async function fixtureFromDb(matchId: string): Promise<LiveMatchDetailDto["fixture"] | null> {
  if (!process.env.DATABASE_URL) return null;
  await ensureLiveDataTables();
  const { rows } = await getPool().query(
    `select match_id, stage, group_name, home, away, home_team_code, away_team_code,
       venue, city, kickoff, status, home_score, away_score, chain_registered
     from fixtures
     where match_id = $1`,
    [matchId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    matchId: String(row.match_id),
    stage: (row.stage as string | null) ?? null,
    groupName: (row.group_name as string | null) ?? null,
    home: String(row.home),
    away: String(row.away),
    homeTeamCode: (row.home_team_code as string | null) ?? null,
    awayTeamCode: (row.away_team_code as string | null) ?? null,
    venue: (row.venue as string | null) ?? null,
    city: (row.city as string | null) ?? null,
    kickoff: row.kickoff ? new Date(row.kickoff).toISOString() : null,
    status: String(row.status),
    homeScore: row.home_score == null ? null : Number(row.home_score),
    awayScore: row.away_score == null ? null : Number(row.away_score),
    predictionOpen: Boolean(row.chain_registered) && row.kickoff ? Date.now() < new Date(row.kickoff).getTime() : false,
    predictionStatus: Boolean(row.chain_registered) ? "unknown" : "not_onchain",
  };
}

function fixtureFromStatic(matchId: string): LiveMatchDetailDto["fixture"] | null {
  const fixture = getWorldCupSnapshot().fixtures.find((item) => item.matchId === matchId);
  if (!fixture) return null;
  return {
    matchId: fixture.matchId,
    stage: fixture.stage,
    groupName: fixture.groupName,
    home: fixture.home,
    away: fixture.away,
    homeTeamCode: fixture.homeTeamCode,
    awayTeamCode: fixture.awayTeamCode,
    venue: fixture.venue,
    city: fixture.city,
    kickoff: fixture.kickoff,
    status: "scheduled",
    homeScore: null,
    awayScore: null,
    predictionOpen: false,
    predictionStatus: "not_onchain",
  };
}

export async function getLiveMatchDetail(matchId: string): Promise<LiveMatchDetailDto | null> {
  const fixture = (await fixtureFromDb(matchId)) ?? fixtureFromStatic(matchId);
  if (!fixture) return null;
  const [live, events, lineups, availability] = await Promise.all([
    liveStateForMatch(matchId),
    matchEvents(matchId),
    lineupsForMatch(matchId),
    availabilityForMatch(matchId),
  ]);
  return {
    fixture,
    live,
    events,
    lineups,
    availability: availability.filter((item) => {
      if (item.matchId === matchId) return true;
      return [fixture.homeTeamCode, fixture.awayTeamCode, fixture.home, fixture.away].filter(Boolean).includes(item.teamCode ?? item.teamName);
    }),
    stale: stale(live?.updatedAt ?? null),
    updatedAt: new Date().toISOString(),
  };
}

export async function listLiveMatches(limit = 12): Promise<LiveMatchDetailDto[]> {
  let ids: string[] = [];
  if (process.env.DATABASE_URL) {
    await ensureLiveDataTables();
    const { rows } = await getPool().query<{ match_id: string }>(
      // Surface live matches, then recent results (finished within 48h, newest first), then
      // upcoming fixtures (soonest first). Without the recent-results bucket the long list of
      // scheduled fixtures pushes every finished match past the limit, so /#matches never shows scores.
      `select f.match_id
       from fixtures f
       left join match_live_states live on live.match_id = f.match_id
       order by
         case when coalesce(live.status, f.status) = 'live' then 0
              when coalesce(live.status, f.status) = 'finished' and f.kickoff > now() - interval '48 hours' then 1
              when coalesce(live.status, f.status) = 'scheduled' then 2
              else 3 end,
         case when coalesce(live.status, f.status) = 'scheduled' then f.kickoff end asc nulls last,
         f.kickoff desc nulls last,
         f.match_id
       limit $1`,
      [limit],
    );
    ids = rows.map((row) => String(row.match_id));
  }
  if (ids.length === 0) ids = getWorldCupSnapshot().fixtures.slice(0, limit).map((fixture) => fixture.matchId);
  const matches = await Promise.all(ids.map((id) => getLiveMatchDetail(id)));
  return matches.filter((match): match is LiveMatchDetailDto => Boolean(match));
}
