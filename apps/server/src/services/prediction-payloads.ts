import { Kind } from "@daily-walrus/contract";
import { WINNER_PAYLOAD_MARKER, hashToU32 } from "@daily-walrus/shared";
import { getWorldCupSnapshot, type TeamProfileDto, type WorldCupFixtureDto } from "./world-cup-data.js";

export interface RawPredictionPayload {
  a?: number | string | null;
  b?: number | string | null;
  c?: number | string | null;
  d?: number | string | null;
  e?: number | string | null;
}

function toNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function sideName(value: unknown): "draw" | "home" | "away" | null {
  const n = toNumber(value);
  if (n === 0) return "draw";
  if (n === 1) return "home";
  if (n === 2) return "away";
  return null;
}

export function predictionKindName(kind: number, payload: RawPredictionPayload = {}): string {
  if (kind === Kind.Advance && toNumber(payload.e) === WINNER_PAYLOAD_MARKER) return "winner";
  switch (kind) {
    case Kind.Scoreline:
      return "scoreline";
    case Kind.MatchMvp:
      return "match_mvp";
    case Kind.WorstPlayer:
      return "worst_player";
    case Kind.Champion:
      return "champion";
    case Kind.Advance:
      return "advance";
    default:
      return `kind_${kind}`;
  }
}

function snapshotLookups(): {
  teams: TeamProfileDto[];
  fixtures: WorldCupFixtureDto[];
} {
  const snapshot = getWorldCupSnapshot();
  return { teams: snapshot.teams, fixtures: snapshot.fixtures };
}

function findTeamByCodeOrName(teams: TeamProfileDto[], code: string | null | undefined, name: string | null | undefined): TeamProfileDto | null {
  const normalizedCode = code?.toUpperCase() ?? "";
  const normalizedName = name?.toLowerCase() ?? "";
  return (
    teams.find((team) => team.code === normalizedCode) ??
    teams.find((team) => team.name.toLowerCase() === normalizedName) ??
    null
  );
}

function fixtureTeams(matchId: string, teams: TeamProfileDto[], fixtures: WorldCupFixtureDto[]): TeamProfileDto[] {
  const fixture = fixtures.find((item) => item.matchId === matchId);
  if (!fixture) return [];
  return [
    findTeamByCodeOrName(teams, fixture.homeTeamCode, fixture.home),
    findTeamByCodeOrName(teams, fixture.awayTeamCode, fixture.away),
  ].filter((team): team is TeamProfileDto => Boolean(team));
}

function findTeamByHash(hash: number | null, teams: TeamProfileDto[], preferredTeams: TeamProfileDto[] = []): TeamProfileDto | null {
  if (hash == null) return null;
  const candidates = preferredTeams.length > 0 ? preferredTeams : teams;
  return (
    candidates.find((team) => hashToU32(team.code) === hash || hashToU32(team.name.toLowerCase()) === hash) ??
    teams.find((team) => hashToU32(team.code) === hash || hashToU32(team.name.toLowerCase()) === hash) ??
    null
  );
}

function findPlayerByHash(hash: number | null, teams: TeamProfileDto[], preferredTeams: TeamProfileDto[] = []) {
  if (hash == null) return null;
  const candidates = preferredTeams.length > 0 ? preferredTeams : teams;
  for (const team of candidates) {
    for (const player of team.squad) {
      if (
        hashToU32(`player:${team.code}:${player.number}`) === hash ||
        hashToU32(player.playerName.toLowerCase()) === hash ||
        hashToU32(player.shirtName.toLowerCase()) === hash
      ) {
        return { team, player };
      }
    }
  }
  if (preferredTeams.length > 0) return findPlayerByHash(hash, teams, []);
  return null;
}

export function normalizePredictionPayload(input: {
  kind: string;
  matchId: string;
  payload: RawPredictionPayload;
}): Record<string, unknown> {
  const raw = input.payload;
  if (input.kind === "scoreline") {
    return {
      homeScore: toNumber(raw.a) ?? 0,
      awayScore: toNumber(raw.b) ?? 0,
    };
  }

  const { teams, fixtures } = snapshotLookups();
  const matchTeams = fixtureTeams(input.matchId, teams, fixtures);
  const targetHash = toNumber(raw.a);

  if (input.kind === "winner") {
    const side = sideName(raw.a);
    if (side === "draw") return { winnerSide: "draw", targetLabel: "Draw" };
    const fixture = fixtures.find((item) => item.matchId === input.matchId);
    const team =
      side === "home"
        ? findTeamByCodeOrName(teams, fixture?.homeTeamCode, fixture?.home)
        : side === "away"
          ? findTeamByCodeOrName(teams, fixture?.awayTeamCode, fixture?.away)
          : findTeamByHash(toNumber(raw.b), teams, matchTeams);
    return {
      winnerSide: side ?? null,
      teamCode: team?.code ?? null,
      teamName: team?.name ?? null,
      targetLabel: team?.name ?? side ?? "unknown",
    };
  }

  if (input.kind === "match_mvp" || input.kind === "worst_player") {
    const resolved = findPlayerByHash(targetHash, teams, matchTeams);
    if (!resolved) return { targetHash, targetLabel: `player-hash:${targetHash ?? "unknown"}` };
    return {
      targetType: "player",
      targetHash,
      teamCode: resolved.team.code,
      teamName: resolved.team.name,
      shirtNumber: resolved.player.number,
      playerName: resolved.player.playerName,
      targetLabel: `${resolved.player.playerName} (${resolved.team.code} #${resolved.player.number})`,
    };
  }

  if (input.kind === "champion" || input.kind === "advance") {
    const team = findTeamByHash(targetHash, teams, input.kind === "advance" ? matchTeams : []);
    if (!team) return { targetHash, targetLabel: `team-hash:${targetHash ?? "unknown"}` };
    return {
      targetType: "team",
      targetHash,
      teamCode: team.code,
      teamName: team.name,
      targetLabel: team.name,
    };
  }

  return {
    a: toNumber(raw.a) ?? 0,
    b: toNumber(raw.b) ?? 0,
    c: toNumber(raw.c) ?? 0,
    d: toNumber(raw.d) ?? 0,
    e: toNumber(raw.e) ?? 0,
  };
}
