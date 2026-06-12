import assert from "node:assert/strict";
import test from "node:test";
import { dateKeyInTimeZone, selectFixturesForBriefing } from "./briefing-fixture-selection.js";
import type { FixtureDto } from "./game-snapshot.js";

function fixture(input: Partial<FixtureDto> & Pick<FixtureDto, "matchId" | "kickoff" | "home" | "away">): FixtureDto {
  return {
    stage: "group",
    groupName: "A",
    homeTeamCode: null,
    awayTeamCode: null,
    venue: null,
    city: null,
    status: "scheduled",
    homeScore: null,
    awayScore: null,
    chainRegistered: true,
    predictionOpen: true,
    predictionStatus: "open",
    predictionClosesAt: input.kickoff,
    predictionLockedReason: null,
    ...input,
  };
}

test("briefing date uses configured reader timezone, not UTC calendar date", () => {
  assert.equal(dateKeyInTimeZone("2026-06-11T19:00:00.000Z", "Asia/Ho_Chi_Minh"), "2026-06-12");
});

test("selectFixturesForBriefing includes Vietnam-day opening result", () => {
  const selected = selectFixturesForBriefing(
    [
      fixture({ matchId: "1", home: "Mexico", away: "South Africa", kickoff: "2026-06-11T19:00:00.000Z" }),
      fixture({ matchId: "2", home: "South Korea", away: "Czech Republic", kickoff: "2026-06-12T02:00:00.000Z" }),
      fixture({ matchId: "3", home: "Other", away: "Fixture", kickoff: "2026-06-13T02:00:00.000Z" }),
    ],
    "2026-06-12",
    undefined,
    "Asia/Ho_Chi_Minh",
  );
  assert.deepEqual(
    selected.map((item) => item.matchId),
    ["1", "2"],
  );
});
