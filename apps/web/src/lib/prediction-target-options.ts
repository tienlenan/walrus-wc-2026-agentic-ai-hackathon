import { Kind } from "@daily-walrus/contract";
import { WINNER_PAYLOAD_MARKER, hashToU32 } from "@daily-walrus/shared";
import type { Fixture } from "./game-api";
import type { SquadPlayer, TeamProfile } from "./world-cup-api";

export type PredictionKindKey = "winner" | "scoreline" | "match_mvp" | "worst_player" | "champion" | "advance";
export type WinnerSide = "draw" | "home" | "away";

export interface PredictionTargetOption {
  value: string;
  label: string;
  targetLabel: string;
  payload: { a: number; b: number; c: number; d: number; e: number };
  teamCode?: string;
  playerNumber?: number;
  winnerSide?: WinnerSide;
}

interface TeamPick {
  code: string;
  name: string;
  flagEmoji: string;
  squad: SquadPlayer[];
}

export function contractKindForPrediction(kind: PredictionKindKey): number {
  switch (kind) {
    case "winner":
      return Kind.Advance;
    case "scoreline":
      return Kind.Scoreline;
    case "match_mvp":
      return Kind.MatchMvp;
    case "worst_player":
      return Kind.WorstPlayer;
    case "champion":
      return Kind.Champion;
    case "advance":
      return Kind.Advance;
  }
}

export function predictionNeedsFixture(kind: PredictionKindKey): boolean {
  return kind !== "champion";
}

export function predictionNeedsTarget(kind: PredictionKindKey): boolean {
  return kind !== "scoreline";
}

export function isVotePredictionKind(kind: PredictionKindKey): kind is "match_mvp" | "worst_player" {
  return kind === "match_mvp" || kind === "worst_player";
}

function findTeam(teams: TeamProfile[], code: string | null, name: string): TeamPick | null {
  const normalizedCode = code?.toUpperCase() ?? "";
  const team =
    teams.find((item) => item.code === normalizedCode) ??
    teams.find((item) => item.name.toLowerCase() === name.toLowerCase()) ??
    null;
  if (!team) {
    const fallbackName = name.trim();
    if (!fallbackName) return null;
    return {
      code: normalizedCode || fallbackName.toUpperCase().replace(/[^A-Z0-9]/g, "_").slice(0, 12),
      name: fallbackName,
      flagEmoji: "",
      squad: [],
    };
  }
  return {
    code: team.code,
    name: team.name,
    flagEmoji: team.flagEmoji,
    squad: team.squad,
  };
}

function fixtureTeamPicks(fixture: Fixture | null | undefined, teams: TeamProfile[]): Array<TeamPick & { side: "home" | "away" }> {
  if (!fixture) return [];
  const home = findTeam(teams, fixture.homeTeamCode, fixture.home);
  const away = findTeam(teams, fixture.awayTeamCode, fixture.away);
  return [
    home ? { ...home, side: "home" as const } : null,
    away ? { ...away, side: "away" as const } : null,
  ].filter((item): item is TeamPick & { side: "home" | "away" } => Boolean(item));
}

function teamOption(team: TeamPick, valuePrefix: string): PredictionTargetOption {
  const value = `${valuePrefix}:${team.code}`;
  return {
    value,
    label: `${team.flagEmoji} ${team.name} (${team.code})`,
    targetLabel: team.name,
    teamCode: team.code,
    payload: { a: hashToU32(team.code), b: 0, c: 0, d: 0, e: 0 },
  };
}

function playerOption(team: TeamPick, player: SquadPlayer): PredictionTargetOption {
  const value = `player:${team.code}:${player.number}`;
  const shirt = player.shirtName && player.shirtName !== player.playerName ? ` / ${player.shirtName}` : "";
  return {
    value,
    label: `${team.flagEmoji} #${player.number} ${player.playerName}${shirt} - ${player.position}`,
    targetLabel: `${player.playerName} (${team.code} #${player.number})`,
    teamCode: team.code,
    playerNumber: player.number,
    payload: {
      a: hashToU32(value),
      b: player.number,
      c: hashToU32(team.code),
      d: 0,
      e: 0,
    },
  };
}

function winnerOption(team: TeamPick & { side: "home" | "away" }): PredictionTargetOption {
  const sideCode = team.side === "home" ? 1 : 2;
  return {
    value: `winner:${team.side}:${team.code}`,
    label: `${team.flagEmoji} ${team.name}`,
    targetLabel: team.name,
    teamCode: team.code,
    winnerSide: team.side,
    payload: {
      a: sideCode,
      b: hashToU32(team.code),
      c: 0,
      d: 0,
      e: WINNER_PAYLOAD_MARKER,
    },
  };
}

export function buildPredictionTargetOptions(input: {
  kind: PredictionKindKey;
  fixture?: Fixture | null;
  teams: TeamProfile[];
  drawLabel: string;
}): PredictionTargetOption[] {
  if (input.kind === "scoreline") return [];

  if (input.kind === "champion") {
    return input.teams.map((team) => teamOption(team, "champion"));
  }

  const fixtureTeams = fixtureTeamPicks(input.fixture, input.teams);

  if (input.kind === "winner") {
    return [
      ...fixtureTeams.map(winnerOption),
      {
        value: "winner:draw",
        label: input.drawLabel,
        targetLabel: input.drawLabel,
        winnerSide: "draw",
        payload: { a: 0, b: 0, c: 0, d: 0, e: WINNER_PAYLOAD_MARKER },
      },
    ];
  }

  if (input.kind === "advance") {
    return fixtureTeams.map((team) => teamOption(team, "advance"));
  }

  return fixtureTeams.flatMap((team) => team.squad.map((player) => playerOption(team, player)));
}
