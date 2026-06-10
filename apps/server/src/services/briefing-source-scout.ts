import { getGameSnapshot, type FixtureDto } from "./game-snapshot.js";
import { getWorldCupSnapshot, getWorldCupSnapshotWithProfileBlobs } from "./world-cup-data.js";
import { PLAYER_ROAST_TRAITS } from "../data/player-roast-traits.js";
import type { BriefingSource } from "./briefing-types.js";

function shortId(value: string): string {
  if (value.length <= 18) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function walrusAggregatorUrl(): string {
  const network = process.env.SUI_NETWORK === "testnet" ? "testnet" : "mainnet";
  return (
    process.env.WALRUS_AGGREGATOR_URL ??
    (network === "mainnet" ? "https://aggregator.walrus-mainnet.walrus.space" : "https://aggregator.walrus-testnet.walrus.space")
  ).replace(/\/$/, "");
}

function walrusBlobUrl(blobId: string): string {
  return `${walrusAggregatorUrl()}/v1/blobs/${blobId}`;
}

function walrusProfileLink(blobId: string | null | undefined, status: string | null | undefined): string {
  if (blobId) return `[${shortId(blobId)}](${walrusBlobUrl(blobId)})`;
  return status ?? "not_published";
}

function dateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function fixtureTime(fixture: FixtureDto): number {
  const time = fixture.kickoff ? Date.parse(fixture.kickoff) : Number.POSITIVE_INFINITY;
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
}

function fixtureLabel(fixture: FixtureDto): string {
  const group = fixture.groupName ? `Group ${fixture.groupName}` : fixture.stage ?? "Knockout";
  const kickoff = fixture.kickoff ? new Date(fixture.kickoff).toISOString() : "kickoff TBA";
  const score = fixture.homeScore == null || fixture.awayScore == null ? "" : ` Result ${fixture.homeScore}-${fixture.awayScore}.`;
  const gate = fixture.predictionOpen ? "Prediction gate is open" : `Prediction gate is ${fixture.predictionStatus.replace(/_/g, " ")}`;
  return `M${fixture.matchId}: ${fixture.home} vs ${fixture.away}, ${group}, ${kickoff}, ${fixture.venue ?? "venue TBA"}, ${gate}.${score}`;
}

function selectFixtures(fixtures: FixtureDto[], date: string, focus?: string): FixtureDto[] {
  const normalizedFocus = (focus ?? "").trim().toLocaleLowerCase();
  const sameDay = fixtures.filter((fixture) => fixture.kickoff && dateKey(new Date(fixture.kickoff)) === date);
  const focused = normalizedFocus
    ? fixtures.filter((fixture) =>
        [fixture.home, fixture.away, fixture.homeTeamCode, fixture.awayTeamCode, fixture.groupName, fixture.stage]
          .filter(Boolean)
          .some((value) => String(value).toLocaleLowerCase().includes(normalizedFocus)),
      )
    : [];
  const source = focused.length > 0 ? focused : sameDay.length > 0 ? sameDay : fixtures.filter((fixture) => fixture.status !== "finished");
  return source.sort((a, b) => fixtureTime(a) - fixtureTime(b)).slice(0, 8);
}

function configuredUrls(): string[] {
  return (process.env.BRIEFING_SOURCE_URLS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => /^https?:\/\//.test(value))
    .slice(0, 6);
}

function manualSideStories(): BriefingSource[] {
  const raw = process.env.BRIEFING_SIDE_STORIES_JSON;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Array<{ title?: string; url?: string; facts?: string[] }>;
    return parsed.slice(0, 8).map((story, index) => ({
      sourceId: `side-${index + 1}`,
      kind: "manual_side_story",
      title: String(story.title ?? `Side story ${index + 1}`).slice(0, 160),
      url: story.url ?? null,
      publishedAt: null,
      facts: (story.facts ?? []).map((fact) => String(fact).slice(0, 260)).filter(Boolean).slice(0, 4),
    }));
  } catch {
    return [];
  }
}

function textBetween(input: string, pattern: RegExp): string | null {
  const match = input.match(pattern);
  if (!match?.[1]) return null;
  return match[1].replace(/\s+/g, " ").trim().slice(0, 260);
}

async function fetchConfiguredSource(url: string, index: number): Promise<BriefingSource | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number(process.env.BRIEFING_SOURCE_TIMEOUT_MS ?? 3500));
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": "TheDailyWalrus/1.0 (+https://roast2026wc.wal.app)" },
    });
    clearTimeout(timeout);
    if (!response.ok) return null;
    const body = (await response.text()).slice(0, 80_000);
    const title = textBetween(body, /<title[^>]*>([\s\S]*?)<\/title>/i) ?? new URL(url).hostname;
    const description =
      textBetween(body, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ??
      textBetween(body, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
    return {
      sourceId: `web-${index + 1}`,
      kind: "configured_web",
      title,
      url,
      publishedAt: null,
      facts: [description ?? `Configured source was reachable: ${new URL(url).hostname}.`],
    };
  } catch {
    return null;
  }
}

export async function runScoutAgent(input: { date: string; focus?: string }): Promise<BriefingSource[]> {
  const [game, worldCup] = await Promise.all([getGameSnapshot(null), getWorldCupSnapshotWithProfileBlobs()]);
  const selectedFixtures = selectFixtures(game.fixtures, input.date, input.focus);
  const fixtureSource: BriefingSource = {
    sourceId: "fixtures-1",
    kind: "fixture_cache",
    title: `World Cup 2026 fixture cache for ${input.date}`,
    url: getWorldCupSnapshot().sources.crawlableScheduleUrl,
    publishedAt: null,
    facts: [
      `${game.fixtures.length} fixtures are indexed; ${game.fixtures.filter((fixture) => fixture.predictionOpen).length} prediction gates are open.`,
      ...selectedFixtures.map(fixtureLabel),
    ],
  };

  const teamCodes = new Set(selectedFixtures.flatMap((fixture) => [fixture.homeTeamCode, fixture.awayTeamCode]).filter(Boolean) as string[]);
  const teams = worldCup.teams.filter((team) => teamCodes.has(team.code)).slice(0, 6);
  const teamSource: BriefingSource = {
    sourceId: "teams-1",
    kind: "team_profile",
    title: "Team profile memory snapshot",
    url: worldCup.sources.squadSourceUrl,
    publishedAt: worldCup.sources.squadDocumentTimestampUtc,
    facts: teams.length
      ? teams.map(
          (team) =>
            `${team.flagEmoji} ${team.name} are in Group ${team.groupName}; coach ${team.coach ?? "TBA"}; ${team.squad.length} squad rows; Walrus profile ${walrusProfileLink(team.walrusBlobId, team.walrusStatus)}.`,
        )
      : [`${worldCup.teams.length} team profiles and ${worldCup.teams.reduce((sum, team) => sum + team.squad.length, 0)} players are loaded.`],
  };

  const officialSource: BriefingSource = {
    sourceId: "official-1",
    kind: "official_schedule",
    title: "Official FIFA schedule reference",
    url: worldCup.sources.fifaScheduleUrl,
    publishedAt: worldCup.sources.scheduleGeneratedAtUtc,
    facts: ["Fixture times are treated as UTC in storage and converted in the UI for readers."],
  };

  const playerSource: BriefingSource = {
    sourceId: "players-1",
    kind: "manual_side_story",
    title: "Player roast trait memory",
    url: null,
    publishedAt: null,
    facts: PLAYER_ROAST_TRAITS.slice(0, 6).map(
      (trait) => `${trait.playerName} (${trait.teamCode}) roast hooks: ${trait.roastAngles.slice(0, 2).join(" ")}`,
    ),
  };

  const webSources = (
    await Promise.all(configuredUrls().map((url, index) => fetchConfiguredSource(url, index)))
  ).filter((source): source is BriefingSource => Boolean(source));

  return [fixtureSource, teamSource, officialSource, playerSource, ...manualSideStories(), ...webSources];
}
