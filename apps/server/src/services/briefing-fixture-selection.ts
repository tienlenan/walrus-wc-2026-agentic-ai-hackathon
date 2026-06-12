import type { FixtureDto } from "./game-snapshot.js";

export function briefingTimeZone(): string {
  return process.env.BRIEFING_TIME_ZONE ?? "Asia/Ho_Chi_Minh";
}

export function dateKeyInTimeZone(value: string | Date, timeZone = briefingTimeZone()): string {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat("en", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function fixtureTime(fixture: FixtureDto): number {
  const time = fixture.kickoff ? Date.parse(fixture.kickoff) : Number.POSITIVE_INFINITY;
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
}

export function selectFixturesForBriefing(fixtures: FixtureDto[], date: string, focus?: string, timeZone = briefingTimeZone()): FixtureDto[] {
  const normalizedFocus = (focus ?? "").trim().toLocaleLowerCase();
  const sameDay = fixtures.filter((fixture) => fixture.kickoff && dateKeyInTimeZone(fixture.kickoff, timeZone) === date);
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
