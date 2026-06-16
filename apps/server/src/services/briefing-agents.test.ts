import assert from "node:assert/strict";
import test from "node:test";
import { buildTemplateArticle, runModeratorAgent, runSynthesisAgent, titleFor } from "./briefing-agents.js";
import type { BriefingSource } from "./briefing-types.js";

const sources: BriefingSource[] = [
  {
    sourceId: "fixtures-1",
    kind: "fixture_cache",
    title: "Fixture cache",
    url: null,
    publishedAt: null,
    facts: [
      "104 fixtures are indexed; 102 prediction gates are open.",
      "M1: Mexico vs South Africa, Group A, 2026-06-11T19:00:00.000Z, Estadio Azteca, Prediction gate is closed finished. Result 2-0.",
    ],
  },
  {
    sourceId: "side-endo-1",
    kind: "manual_side_story",
    title: "Japan captain Wataru Endo ruled out",
    url: null,
    publishedAt: null,
    facts: ["Japan captain Wataru Endo withdrew from the World Cup squad because of a foot injury."],
  },
  {
    sourceId: "teams-1",
    kind: "team_profile",
    title: "Team profiles",
    url: null,
    publishedAt: null,
    facts: ["Mexico are in Group A; coach Javier Aguirre; 26 squad rows."],
  },
];

test("template fallback produces Daily What's Up copy from sourced facts", () => {
  const outline = runSynthesisAgent(sources);
  const input = { date: "2026-06-09", type: "daily", outline };
  const article = buildTemplateArticle(input, titleFor(input));
  assert.equal(article.title, "Gil's Daily What's Up - Jun 9, 2026");
  assert.match(article.markdown, /\[fixtures-1\]/);
  assert.match(article.markdown, /Mexico vs South Africa/);
  assert.match(article.markdown, /Wataru Endo/);
});

test("moderator rejects unsupported source references", () => {
  const article = {
    title: "Bad source",
    slug: "bad-source",
    summary: "summary",
    markdown: "Unsupported claim [web-99]",
  };
  const result = runModeratorAgent(article, ["fixtures-1"]);
  assert.equal(result.approved, false);
  assert.match(result.notes.join(" "), /Unsupported source references/);
});

test("moderator removes wagering language", () => {
  const article = {
    title: "Clean copy",
    slug: "clean-copy",
    summary: "summary",
    markdown: "No betting advice here [fixtures-1].",
  };
  const result = runModeratorAgent(article, ["fixtures-1"]);
  assert.equal(result.approved, true);
  assert.doesNotMatch(result.article.markdown, /betting/i);
  assert.match(result.article.markdown, /prediction/i);
});
