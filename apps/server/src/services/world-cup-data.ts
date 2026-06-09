import { getPool } from "@daily-walrus/db";
import fixtureData from "../data/world-cup-2026-fixtures.generated.json";
import squadData from "../data/world-cup-2026-squads.generated.json";
import { contentHash, publishJsonBlob, type WalrusBlobPointer } from "./walrus-blob.js";

const SQUAD_SOURCE_URL = "https://fdp.fifa.org/assetspublic/ce281/pdf/SquadLists-English.pdf";
const FIFA_SCHEDULE_URL =
  "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/match-schedule-fixtures-results-teams-stadiums";
const CRAWLABLE_SCHEDULE_URL = "https://worldcupstats.football/schedule/";
const MATCH_TIMES_URL = "https://matchtimes.app/";

interface GeneratedSquadPlayer {
  number: number;
  position: "GK" | "DF" | "MF" | "FW";
  playerName: string;
  firstNames: string;
  lastNames: string;
  shirtName: string;
  dateOfBirth: string;
  club: string;
  heightCm: number;
  raw: string;
}

interface GeneratedTeam {
  code: string;
  name: string;
  coach: {
    displayName?: string;
    nationality?: string;
    raw?: string;
  } | null;
  squad: GeneratedSquadPlayer[];
}

interface TeamMeta {
  groupName: string;
  confederation: string;
  flagEmoji: string;
}

export interface TeamProfileDto {
  code: string;
  name: string;
  groupName: string;
  confederation: string;
  coach: string | null;
  coachNationality: string | null;
  flagEmoji: string;
  squadSourceUrl: string;
  walrusStatus: string;
  walrusBlobId: string | null;
  walrusObjectId: string | null;
  profileHash: string;
  squad: GeneratedSquadPlayer[];
}

export interface WorldCupFixtureDto {
  matchId: string;
  stage: string;
  groupName: string | null;
  homeTeamCode: string | null;
  awayTeamCode: string | null;
  home: string;
  away: string;
  kickoff: string;
  venue: string;
  city: string;
  sourceUrl: string;
  chainRegistered: boolean;
}

export interface WorldCupSnapshotDto {
  sources: {
    fifaScheduleUrl: string;
    crawlableScheduleUrl: string;
    matchTimesUrl: string;
    squadSourceUrl: string;
    squadDocumentTimestampUtc: string;
    scheduleGeneratedAtUtc: string;
  };
  teams: TeamProfileDto[];
  fixtures: WorldCupFixtureDto[];
  updatedAt: string;
}

const TEAM_META: Record<string, TeamMeta> = {
  ALG: { groupName: "J", confederation: "CAF", flagEmoji: "🇩🇿" },
  ARG: { groupName: "J", confederation: "CONMEBOL", flagEmoji: "🇦🇷" },
  AUS: { groupName: "D", confederation: "AFC", flagEmoji: "🇦🇺" },
  AUT: { groupName: "J", confederation: "UEFA", flagEmoji: "🇦🇹" },
  BEL: { groupName: "G", confederation: "UEFA", flagEmoji: "🇧🇪" },
  BIH: { groupName: "B", confederation: "UEFA", flagEmoji: "🇧🇦" },
  BRA: { groupName: "C", confederation: "CONMEBOL", flagEmoji: "🇧🇷" },
  CAN: { groupName: "B", confederation: "CONCACAF", flagEmoji: "🇨🇦" },
  CIV: { groupName: "E", confederation: "CAF", flagEmoji: "🇨🇮" },
  COD: { groupName: "K", confederation: "CAF", flagEmoji: "🇨🇩" },
  COL: { groupName: "K", confederation: "CONMEBOL", flagEmoji: "🇨🇴" },
  CPV: { groupName: "H", confederation: "CAF", flagEmoji: "🇨🇻" },
  CRO: { groupName: "L", confederation: "UEFA", flagEmoji: "🇭🇷" },
  CUW: { groupName: "E", confederation: "CONCACAF", flagEmoji: "🇨🇼" },
  CZE: { groupName: "A", confederation: "UEFA", flagEmoji: "🇨🇿" },
  ECU: { groupName: "E", confederation: "CONMEBOL", flagEmoji: "🇪🇨" },
  EGY: { groupName: "G", confederation: "CAF", flagEmoji: "🇪🇬" },
  ENG: { groupName: "L", confederation: "UEFA", flagEmoji: "🏴" },
  FRA: { groupName: "I", confederation: "UEFA", flagEmoji: "🇫🇷" },
  GER: { groupName: "E", confederation: "UEFA", flagEmoji: "🇩🇪" },
  GHA: { groupName: "L", confederation: "CAF", flagEmoji: "🇬🇭" },
  HAI: { groupName: "C", confederation: "CONCACAF", flagEmoji: "🇭🇹" },
  IRN: { groupName: "G", confederation: "AFC", flagEmoji: "🇮🇷" },
  IRQ: { groupName: "I", confederation: "AFC", flagEmoji: "🇮🇶" },
  JOR: { groupName: "J", confederation: "AFC", flagEmoji: "🇯🇴" },
  JPN: { groupName: "F", confederation: "AFC", flagEmoji: "🇯🇵" },
  KOR: { groupName: "A", confederation: "AFC", flagEmoji: "🇰🇷" },
  KSA: { groupName: "H", confederation: "AFC", flagEmoji: "🇸🇦" },
  MAR: { groupName: "C", confederation: "CAF", flagEmoji: "🇲🇦" },
  MEX: { groupName: "A", confederation: "CONCACAF", flagEmoji: "🇲🇽" },
  NED: { groupName: "F", confederation: "UEFA", flagEmoji: "🇳🇱" },
  NOR: { groupName: "I", confederation: "UEFA", flagEmoji: "🇳🇴" },
  NZL: { groupName: "G", confederation: "OFC", flagEmoji: "🇳🇿" },
  PAN: { groupName: "L", confederation: "CONCACAF", flagEmoji: "🇵🇦" },
  PAR: { groupName: "D", confederation: "CONMEBOL", flagEmoji: "🇵🇾" },
  POR: { groupName: "K", confederation: "UEFA", flagEmoji: "🇵🇹" },
  QAT: { groupName: "B", confederation: "AFC", flagEmoji: "🇶🇦" },
  RSA: { groupName: "A", confederation: "CAF", flagEmoji: "🇿🇦" },
  SCO: { groupName: "C", confederation: "UEFA", flagEmoji: "🏴" },
  SEN: { groupName: "I", confederation: "CAF", flagEmoji: "🇸🇳" },
  ESP: { groupName: "H", confederation: "UEFA", flagEmoji: "🇪🇸" },
  SUI: { groupName: "B", confederation: "UEFA", flagEmoji: "🇨🇭" },
  SWE: { groupName: "F", confederation: "UEFA", flagEmoji: "🇸🇪" },
  TUN: { groupName: "F", confederation: "CAF", flagEmoji: "🇹🇳" },
  TUR: { groupName: "D", confederation: "UEFA", flagEmoji: "🇹🇷" },
  URU: { groupName: "H", confederation: "CONMEBOL", flagEmoji: "🇺🇾" },
  USA: { groupName: "D", confederation: "CONCACAF", flagEmoji: "🇺🇸" },
  UZB: { groupName: "K", confederation: "AFC", flagEmoji: "🇺🇿" },
};

interface GeneratedFixture {
  matchId: string;
  stage: string;
  groupName: string | null;
  homeTeamCode: string | null;
  awayTeamCode: string | null;
  home: string;
  away: string;
  kickoff: string;
  venue: string;
  city: string;
  sourceUrl: string;
}

const fixtureSource = fixtureData as {
  source: {
    scheduleUrl: string;
    fifaScheduleUrl: string;
    generatedAtUtc: string;
  };
  fixtures: GeneratedFixture[];
};

const generatedTeams = (squadData as { teams: GeneratedTeam[]; source: { documentTimestampUtc: string } }).teams;

function prettifyPersonName(value: string | null | undefined): string | null {
  if (!value) return null;
  return value
    .replace(/\b([A-ZÀ-ÖØ-Ý])\s+([A-ZÀ-ÖØ-Ý]{2,})\b/g, "$1$2")
    .split(" ")
    .map((word) => {
      if (!/^[A-ZÀ-ÖØ-Ý'’-]{2,}$/.test(word)) return word;
      const [first = "", ...rest] = Array.from(word);
      return `${first}${rest.join("").toLocaleLowerCase()}`;
    })
    .join(" ");
}

export function getTeamProfiles(): TeamProfileDto[] {
  return generatedTeams
    .map((team) => {
      const meta = TEAM_META[team.code] ?? { groupName: "?", confederation: "?", flagEmoji: "🏳" };
      const profile = {
        code: team.code,
        name: team.name,
        groupName: meta.groupName,
        confederation: meta.confederation,
        coach: prettifyPersonName(team.coach?.displayName ?? team.coach?.raw),
        coachNationality: team.coach?.nationality ?? null,
        flagEmoji: meta.flagEmoji,
        squadSourceUrl: SQUAD_SOURCE_URL,
        squad: team.squad,
      };
      return {
        ...profile,
        walrusStatus: "not_published",
        walrusBlobId: null,
        walrusObjectId: null,
        profileHash: contentHash(profile),
      };
    })
    .sort((a, b) => a.groupName.localeCompare(b.groupName) || a.name.localeCompare(b.name));
}

export function getWorldCupFixtures(): WorldCupFixtureDto[] {
  return fixtureSource.fixtures.map((fixture) => ({
    ...fixture,
    chainRegistered: false,
  }));
}

export function getWorldCupSnapshot(): WorldCupSnapshotDto {
  return {
    sources: {
      fifaScheduleUrl: FIFA_SCHEDULE_URL,
      crawlableScheduleUrl: CRAWLABLE_SCHEDULE_URL,
      matchTimesUrl: MATCH_TIMES_URL,
      squadSourceUrl: SQUAD_SOURCE_URL,
      squadDocumentTimestampUtc: (squadData as { source: { documentTimestampUtc: string } }).source.documentTimestampUtc,
      scheduleGeneratedAtUtc: fixtureSource.source.generatedAtUtc,
    },
    teams: getTeamProfiles(),
    fixtures: getWorldCupFixtures(),
    updatedAt: new Date().toISOString(),
  };
}

export async function publishTeamProfileBlob(teamCode: string): Promise<WalrusBlobPointer> {
  const team = getTeamProfiles().find((item) => item.code === teamCode.toUpperCase());
  if (!team) throw new Error(`unknown team ${teamCode}`);
  const pointer = await publishJsonBlob(`team-profile:${team.code}`, team);

  if (process.env.DATABASE_URL) {
    await getPool().query(
      `update team_profiles
       set walrus_status = $2, walrus_blob_id = $3, walrus_object_id = $4, profile_hash = $5, updated_at = now()
       where team_code = $1`,
      [team.code, pointer.status, pointer.blobId, pointer.objectId, pointer.hash],
    );
  }

  return pointer;
}

export async function seedWorldCupData(): Promise<{ teams: number; players: number; fixtures: number }> {
  if (!process.env.DATABASE_URL) return { teams: 0, players: 0, fixtures: 0 };
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    let teams = 0;
    let players = 0;
    let fixtures = 0;
    const currentFixtures = getWorldCupFixtures();

    for (const team of getTeamProfiles()) {
      await client.query(
        `insert into team_profiles(
          team_code, name, group_name, confederation, coach, coach_nationality, flag_emoji,
          source_url, squad_source_url, walrus_status, profile_hash, updated_at
        )
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'not_published',$10,now())
        on conflict (team_code) do update set
          name = excluded.name,
          group_name = excluded.group_name,
          confederation = excluded.confederation,
          coach = excluded.coach,
          coach_nationality = excluded.coach_nationality,
          flag_emoji = excluded.flag_emoji,
          source_url = excluded.source_url,
          squad_source_url = excluded.squad_source_url,
          profile_hash = excluded.profile_hash,
          updated_at = now()`,
        [
          team.code,
          team.name,
          team.groupName,
          team.confederation,
          team.coach,
          team.coachNationality,
          team.flagEmoji,
          FIFA_SCHEDULE_URL,
          team.squadSourceUrl,
          team.profileHash,
        ],
      );
      teams += 1;

      for (const player of team.squad) {
        await client.query(
          `insert into team_players(
            team_code, shirt_number, position, player_name, first_names, last_names, shirt_name,
            date_of_birth, club, height_cm, source_raw, updated_at
          )
          values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now())
          on conflict (team_code, shirt_number) do update set
            position = excluded.position,
            player_name = excluded.player_name,
            first_names = excluded.first_names,
            last_names = excluded.last_names,
            shirt_name = excluded.shirt_name,
            date_of_birth = excluded.date_of_birth,
            club = excluded.club,
            height_cm = excluded.height_cm,
            source_raw = excluded.source_raw,
            updated_at = now()`,
          [
            team.code,
            player.number,
            player.position,
            player.playerName,
            player.firstNames,
            player.lastNames,
            player.shirtName,
            player.dateOfBirth,
            player.club,
            player.heightCm,
            player.raw,
          ],
        );
        players += 1;
      }
    }

    for (const fixture of currentFixtures) {
      await client.query(
        `insert into fixtures(
          match_id, stage, group_name, home, away, home_team_code, away_team_code,
          kickoff, venue, city, chain_registered, source_url, updated_at
        )
        values ($1,$2,$3,$4,$5,$6,$7,$8::timestamptz,$9,$10,false,$11,now())
        on conflict (match_id) do update set
          stage = excluded.stage,
          group_name = excluded.group_name,
          home = excluded.home,
          away = excluded.away,
          home_team_code = excluded.home_team_code,
          away_team_code = excluded.away_team_code,
          kickoff = excluded.kickoff,
          venue = excluded.venue,
          city = excluded.city,
          source_url = excluded.source_url,
          updated_at = now()`,
        [
          fixture.matchId,
          fixture.stage,
          fixture.groupName,
          fixture.home,
          fixture.away,
          fixture.homeTeamCode,
          fixture.awayTeamCode,
          fixture.kickoff,
          fixture.venue,
          fixture.city,
          fixture.sourceUrl,
        ],
      );
      fixtures += 1;
    }

    await client.query(
      `delete from fixtures f
       where not (f.match_id = any($1::text[]))
         and not exists (select 1 from predictions p where p.match_id = f.match_id)`,
      [currentFixtures.map((fixture) => fixture.matchId)],
    );

    await client.query("commit");
    return { teams, players, fixtures };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
