import { getGameSnapshot, type FixtureDto } from "./game-snapshot.js";
import {
  getWorldCupSnapshotWithProfileBlobs,
  type TeamProfileDto,
  type WorldCupFixtureDto,
} from "./world-cup-data.js";
import {
  inferDate,
  inferGroup,
  inferPrediction,
  inferStatus,
  inferUserActionIntent,
  isFixtureIntent,
  isProfileIntent,
  normalizeText,
} from "./chat-tool-intents.js";
import { compactId, toolPart, type ChatRenderPart, type ChatToolPart } from "./chat-tool-parts.js";
import {
  getMyDappActions,
  getMyGameRecord,
  getMyMatchVotes,
  getMyOutputRecords,
  getMyPredictions,
  getMyRoasts,
  type MyDappActionsOutput,
  type MyGameRecordOutput,
  type MyMatchVotesOutput,
  type MyOutputRecordsOutput,
  type MyPredictionsOutput,
  type MyRoastsOutput,
} from "./user-action-history.js";

export type { ChatRenderPart, ChatTextPart, ChatToolPart } from "./chat-tool-parts.js";

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

function predictionContext(output: MyPredictionsOutput): string {
  const latest = output.predictions[0];
  if (!latest) return "Tool getMyPredictions returned 0 predictions. Tell the user they have not submitted predictions yet.";
  return `Tool getMyPredictions returned ${output.total} predictions. Latest: ${latest.matchLabel}, ${latest.pickLabel}, result ${latest.result}, oracle ${latest.oracleStatus}, tx ${compactId(latest.proof.txDigest)}.`;
}

function roastContext(output: MyRoastsOutput): string {
  const latest = output.roasts[0];
  if (!latest) return "Tool getMyRoasts returned 0 roasts. Tell the user they have not roasted anyone yet.";
  return `Tool getMyRoasts returned ${output.total} roasts. Latest target ${latest.targetName}; proof tx ${compactId(latest.proof.txDigest)}; blob ${compactId(latest.proof.blobId)}.`;
}

function voteContext(output: MyMatchVotesOutput): string {
  const latest = output.votes[0];
  if (!latest) return "Tool getMyMatchVotes returned 0 votes. Tell the user they have not voted for MVP or worst player yet.";
  return `Tool getMyMatchVotes returned ${output.total} votes. Latest: ${latest.kind} ${latest.targetLabel} for ${latest.matchLabel}; proof ${compactId(latest.proof.txDigest)}.`;
}

function proofContext(output: MyOutputRecordsOutput): string {
  const latest = output.records[0];
  if (!latest) return "Tool getMyOutputRecords returned 0 proof records. Tell the user no Sui OutputRecord receipts are indexed yet.";
  return `Tool getMyOutputRecords returned ${output.total} proof records. Latest: ${latest.outputKind}/${latest.resourceType}, tx ${compactId(latest.proof.txDigest)}, object ${compactId(latest.proof.suiObjectId)}, blob ${compactId(latest.proof.blobId)}.`;
}

function actionContext(output: MyDappActionsOutput): string {
  const latest = output.actions[0];
  if (!latest) return "Tool getMyDappActions returned 0 actions. Tell the user they have no indexed dapp actions yet.";
  return `Tool getMyDappActions returned ${output.total} actions. Latest: ${latest.actionType} - ${latest.title}; ${latest.summary}; proof ${compactId(latest.proof.txDigest)}.`;
}

function recordContext(output: MyGameRecordOutput): string {
  if (!output.exists) return "Tool getMyGameRecord returned no user record yet. Tell the user their score record is empty.";
  return `Tool getMyGameRecord returned ${output.totalPoints} points, ${output.correct}/${output.graded} correct, streak ${output.streak}, best streak ${output.bestStreak}, accuracy ${output.accuracy ?? "not graded yet"}.`;
}

async function addUserActionTool(
  resourceId: string,
  intent: NonNullable<ReturnType<typeof inferUserActionIntent>>,
  parts: ChatToolPart[],
  context: string[],
): Promise<void> {
  const input = { limit: 10 };
  if (intent === "my_predictions") {
    const output = await getMyPredictions(resourceId, input);
    parts.push(toolPart("getMyPredictions", input, output));
    context.push(predictionContext(output));
    return;
  }
  if (intent === "my_roasts") {
    const output = await getMyRoasts(resourceId, input);
    parts.push(toolPart("getMyRoasts", input, output));
    context.push(roastContext(output));
    return;
  }
  if (intent === "my_votes") {
    const output = await getMyMatchVotes(resourceId, input);
    parts.push(toolPart("getMyMatchVotes", input, output));
    context.push(voteContext(output));
    return;
  }
  if (intent === "my_proofs") {
    const output = await getMyOutputRecords(resourceId, input);
    parts.push(toolPart("getMyOutputRecords", input, output));
    context.push(proofContext(output));
    return;
  }
  if (intent === "my_record") {
    const output = await getMyGameRecord(resourceId);
    parts.push(toolPart("getMyGameRecord", {}, output));
    context.push(recordContext(output));
    return;
  }
  const output = await getMyDappActions(resourceId, input);
  parts.push(toolPart("getMyDappActions", input, output));
  context.push(actionContext(output));
}

export interface BuildChatToolPartsInput {
  resourceId?: string;
  message: string;
}

export async function buildChatToolParts(input: string | BuildChatToolPartsInput): Promise<{ parts: ChatToolPart[]; context: string[] }> {
  const message = typeof input === "string" ? input : input.message;
  const resourceId = typeof input === "string" ? undefined : input.resourceId;
  const normalized = normalizeText(message);
  const parts: ChatToolPart[] = [];
  const context: string[] = [];
  const userActionIntent = inferUserActionIntent(normalized);

  if (resourceId?.startsWith("0x") && userActionIntent) {
    await addUserActionTool(resourceId, userActionIntent, parts, context);
    return { parts, context };
  }

  const { teams } = await fixtureSource();
  const team = findTeam(teams, message);

  if (isProfileIntent(normalized) && team) {
    const input = { team: team.code };
    const output = await getTeamProfileQuery(input);
    parts.push(toolPart("getTeamProfile", input, output));
    context.push(`Tool getTeamProfile returned ${output.team.name}: coach ${output.team.coach ?? "TBA"}, ${output.squadCount} players, Group ${output.team.groupName}.`);
  }

  if (!userActionIntent && isFixtureIntent(normalized)) {
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
