import { getGameSnapshot, type FixtureDto } from "./game-snapshot.js";
import {
  getWorldCupSnapshotWithProfileBlobs,
  type TeamProfileDto,
  type WorldCupFixtureDto,
} from "./world-cup-data.js";

export interface ChatTextPart {
  type: "text";
  text: string;
}

export interface ChatToolPart<TInput = unknown, TOutput = unknown> {
  type: `tool-${string}`;
  toolCallId: string;
  state: "output-available";
  input: TInput;
  output: TOutput;
}

export type ChatRenderPart = ChatTextPart | ChatToolPart;

export interface FixtureQueryInput {
  group?: string;
  team?: string;
  date?: string;
  status?: "scheduled" | "live" | "finished";
  prediction?: "open" | "closed" | "not_onchain";
  limit?: number;
}

export interface FixtureCardDto {
  matchId: string;
  stage: string | null;
  groupName: string | null;
  home: string;
  away: string;
  homeTeamCode: string | null;
  awayTeamCode: string | null;
  kickoff: string | null;
  venue: string | null;
  city: string | null;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  chainRegistered: boolean;
  predictionOpen: boolean;
  predictionStatus: string;
  predictionLockedReason: string | null;
}

export interface FixtureQueryOutput {
  title: string;
  filters: FixtureQueryInput;
  fixtures: FixtureCardDto[];
  totalMatches: number;
}

export interface TeamProfileQueryInput {
  team: string;
}

export interface TeamProfileQueryOutput {
  team: {
    code: string;
    name: string;
    groupName: string;
    confederation: string;
    flagEmoji: string;
    coach: string | null;
    coachNationality: string | null;
    walrusStatus: string;
    walrusBlobId: string | null;
    walrusObjectId: string | null;
    profileHash: string;
  };
  squadSample: Array<{
    number: number;
    position: string;
    playerName: string;
    club: string;
  }>;
  fixtures: FixtureCardDto[];
  squadCount: number;
}

const TEAM_ALIASES: Record<string, string[]> = {
  ARG: ["argentina", "messi", "leo"],
  BRA: ["brazil", "brasil", "vini", "vinicius"],
  ENG: ["england", "anh", "kane", "harry kane"],
  FRA: ["france", "phap", "pháp", "mbappe", "mbappé"],
  NOR: ["norway", "na uy", "haaland", "odegaard", "ødegaard", "oodegaard"],
  POR: ["portugal", "ronaldo", "cr7", "cristiano"],
  SWE: ["sweden", "thuy dien", "thụy điển", "gyokeres", "gyökeres"],
};

function normalizeText(value: string): string {
  return value
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function isFixtureIntent(text: string): boolean {
  return /\b(schedule|fixture|fixtures|match|matches|today|tomorrow|date|group|playing|plays|open|gate|prediction)\b/.test(text)
    || /\b(lich|tran|bang|keo|du doan|da voi ai|gap ai)\b/.test(text);
}

function isProfileIntent(text: string): boolean {
  return /\b(profile|squad|coach|players|team profile|national profile|roster)\b/.test(text)
    || /\b(ho so|doi hinh|hlv|cau thu)\b/.test(text);
}

function inferGroup(text: string): string | undefined {
  const match = text.match(/\b(?:group|bang)\s*([a-l])\b/) ?? text.match(/\bgroup\s+([a-l])\b/);
  return match?.[1]?.toUpperCase();
}

function inferDate(text: string): string | undefined {
  const iso = text.match(/\b(2026-\d{2}-\d{2})\b/);
  if (iso?.[1]) return iso[1];
  const today = new Date();
  if (/\b(today|hom nay)\b/.test(text)) return today.toISOString().slice(0, 10);
  if (/\b(tomorrow|ngay mai)\b/.test(text)) {
    today.setUTCDate(today.getUTCDate() + 1);
    return today.toISOString().slice(0, 10);
  }
  const month = text.match(/\b(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july)\s+(\d{1,2})\b/);
  if (!month?.[1] || !month[2]) return undefined;
  const parsed = new Date(`${month[1]} ${month[2]}, 2026 00:00:00 UTC`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString().slice(0, 10);
}

function inferStatus(text: string): FixtureQueryInput["status"] | undefined {
  if (/\b(finished|settled|done|da xong|xong)\b/.test(text)) return "finished";
  if (/\b(live|dang da)\b/.test(text)) return "live";
  if (/\b(upcoming|scheduled|chua da|sap toi)\b/.test(text)) return "scheduled";
  return undefined;
}

function inferPrediction(text: string): FixtureQueryInput["prediction"] | undefined {
  if (/\b(not onchain|not_onchain|chua onchain)\b/.test(text)) return "not_onchain";
  if (/\b(open|mo keo|con mo|dang mo)\b/.test(text)) return "open";
  if (/\b(closed|close|khoa|dong)\b/.test(text)) return "closed";
  return undefined;
}

function findTeam(teams: TeamProfileDto[], query: string): TeamProfileDto | null {
  const normalized = normalizeText(query);
  return (
    teams.find((team) => {
      const code = normalizeText(team.code);
      const name = normalizeText(team.name);
      const aliases = (TEAM_ALIASES[team.code] ?? []).map(normalizeText);
      return (
        new RegExp(`\\b${code}\\b`).test(normalized)
        || normalized.includes(name)
        || aliases.some((alias) => normalized.includes(alias))
      );
    }) ?? null
  );
}

function mergeFixture(worldFixture: WorldCupFixtureDto, gameFixture?: FixtureDto): FixtureCardDto {
  return {
    matchId: worldFixture.matchId,
    stage: worldFixture.stage,
    groupName: worldFixture.groupName,
    home: gameFixture?.home ?? worldFixture.home,
    away: gameFixture?.away ?? worldFixture.away,
    homeTeamCode: gameFixture?.homeTeamCode ?? worldFixture.homeTeamCode,
    awayTeamCode: gameFixture?.awayTeamCode ?? worldFixture.awayTeamCode,
    kickoff: gameFixture?.kickoff ?? worldFixture.kickoff,
    venue: gameFixture?.venue ?? worldFixture.venue,
    city: gameFixture?.city ?? worldFixture.city,
    status: gameFixture?.status ?? "scheduled",
    homeScore: gameFixture?.homeScore ?? null,
    awayScore: gameFixture?.awayScore ?? null,
    chainRegistered: gameFixture?.chainRegistered ?? worldFixture.chainRegistered,
    predictionOpen: gameFixture?.predictionOpen ?? false,
    predictionStatus: gameFixture?.predictionStatus ?? (worldFixture.chainRegistered ? "unknown" : "not_onchain"),
    predictionLockedReason: gameFixture?.predictionLockedReason ?? null,
  };
}

async function fixtureSource(): Promise<{ fixtures: FixtureCardDto[]; teams: TeamProfileDto[] }> {
  const [worldCup, game] = await Promise.all([
    getWorldCupSnapshotWithProfileBlobs(),
    getGameSnapshot(null).catch(() => ({ fixtures: [] as FixtureDto[] })),
  ]);
  const gameById = new Map(game.fixtures.map((fixture) => [fixture.matchId, fixture]));
  return {
    teams: worldCup.teams,
    fixtures: worldCup.fixtures.map((fixture) => mergeFixture(fixture, gameById.get(fixture.matchId))),
  };
}

export async function getFixtureQuery(input: FixtureQueryInput): Promise<FixtureQueryOutput> {
  const { fixtures, teams } = await fixtureSource();
  const limit = Math.max(1, Math.min(input.limit ?? 8, 20));
  const team = input.team ? findTeam(teams, input.team) : null;
  const filtered = fixtures
    .filter((fixture) => !input.group || fixture.groupName === input.group)
    .filter((fixture) => !team || fixture.homeTeamCode === team.code || fixture.awayTeamCode === team.code)
    .filter((fixture) => !input.date || fixture.kickoff?.slice(0, 10) === input.date)
    .filter((fixture) => !input.status || fixture.status === input.status)
    .filter((fixture) => {
      if (!input.prediction) return true;
      if (input.prediction === "open") return fixture.predictionOpen;
      if (input.prediction === "not_onchain") return fixture.predictionStatus === "not_onchain";
      return !fixture.predictionOpen;
    })
    .sort((a, b) => new Date(a.kickoff ?? "9999-01-01").getTime() - new Date(b.kickoff ?? "9999-01-01").getTime());

  const titleParts = [
    team ? team.name : null,
    input.group ? `Group ${input.group}` : null,
    input.date ?? null,
    input.prediction === "open" ? "open prediction gates" : null,
  ].filter(Boolean);
  return {
    title: titleParts.length ? `Fixtures: ${titleParts.join(" · ")}` : "World Cup 2026 fixtures",
    filters: input,
    fixtures: filtered.slice(0, limit),
    totalMatches: filtered.length,
  };
}

export async function getTeamProfileQuery(input: TeamProfileQueryInput): Promise<TeamProfileQueryOutput> {
  const { teams } = await fixtureSource();
  const team = findTeam(teams, input.team);
  if (!team) throw new Error(`unknown team ${input.team}`);
  const fixtureResult = await getFixtureQuery({ team: team.code, limit: 6 });
  return {
    team: {
      code: team.code,
      name: team.name,
      groupName: team.groupName,
      confederation: team.confederation,
      flagEmoji: team.flagEmoji,
      coach: team.coach,
      coachNationality: team.coachNationality,
      walrusStatus: team.walrusStatus,
      walrusBlobId: team.walrusBlobId,
      walrusObjectId: team.walrusObjectId,
      profileHash: team.profileHash,
    },
    squadSample: team.squad.slice(0, 8).map((player) => ({
      number: player.number,
      position: player.position,
      playerName: player.playerName,
      club: player.club,
    })),
    fixtures: fixtureResult.fixtures,
    squadCount: team.squad.length,
  };
}

function toolPart<TInput, TOutput>(toolName: string, input: TInput, output: TOutput): ChatToolPart<TInput, TOutput> {
  return {
    type: `tool-${toolName}`,
    toolCallId: `${toolName}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    state: "output-available",
    input,
    output,
  };
}

export async function buildChatToolParts(message: string): Promise<{ parts: ChatToolPart[]; context: string[] }> {
  const normalized = normalizeText(message);
  const { teams } = await fixtureSource();
  const team = findTeam(teams, message);
  const parts: ChatToolPart[] = [];
  const context: string[] = [];

  if (isProfileIntent(normalized) && team) {
    const input = { team: team.code };
    const output = await getTeamProfileQuery(input);
    parts.push(toolPart("getTeamProfile", input, output));
    context.push(`Tool getTeamProfile returned ${output.team.name}: coach ${output.team.coach ?? "TBA"}, ${output.squadCount} players, Group ${output.team.groupName}.`);
  }

  if (isFixtureIntent(normalized)) {
    const input: FixtureQueryInput = {
      group: inferGroup(normalized),
      team: team?.code,
      date: inferDate(normalized),
      status: inferStatus(normalized),
      prediction: inferPrediction(normalized),
      limit: 8,
    };
    const output = await getFixtureQuery(input);
    parts.push(toolPart("getFixtures", input, output));
    const fixtureLines = output.fixtures
      .slice(0, 5)
      .map((fixture) => `${fixture.matchId}: ${fixture.home} vs ${fixture.away}, ${fixture.kickoff ?? "TBA"}, gate ${fixture.predictionStatus}`)
      .join(" | ");
    context.push(`Tool getFixtures returned ${output.totalMatches} matches. ${fixtureLines || "No matching fixtures."}`);
  }

  return { parts, context };
}
