import assert from "node:assert/strict";
import test from "node:test";
import { runModeratorAgent, runSynthesisAgent, runWriterAgent } from "./briefing-agents.js";
import type { BriefingSource } from "./briefing-types.js";

const sources: BriefingSource[] = [
  {
    sourceId: "fixtures-1",
    kind: "fixture_cache",
    title: "Fixture cache",
    url: null,
    publishedAt: null,
    facts: ["104 fixtures are indexed; 104 prediction gates are open."],
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

test("writer produces Daily What's Up copy from sourced facts", () => {
  const outline = runSynthesisAgent(sources);
  const article = runWriterAgent({ date: "2026-06-09", type: "daily", outline });
  assert.equal(article.title, "Gil's Daily What's Up - Jun 9, 2026");
  assert.match(article.markdown, /\[fixtures-1\]/);
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
