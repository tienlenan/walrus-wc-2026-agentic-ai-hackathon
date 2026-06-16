import { gil } from "../mastra/agents/gil.js";
import type { BriefingArticle, BriefingMemorySnapshot, BriefingOutline, BriefingSource } from "./briefing-types.js";

function slugify(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function pickFacts(sources: BriefingSource[], kind: BriefingSource["kind"], limit: number): string[] {
  return sources
    .filter((source) => source.kind === kind)
    .flatMap((source) => source.facts.map((fact) => ({ fact, sourceId: source.sourceId })))
    .slice(0, limit)
    .map((item) => `${item.fact} [${item.sourceId}]`);
}

export function runSynthesisAgent(
  sources: BriefingSource[],
  options: { memory?: BriefingMemorySnapshot; attempt?: number } = {},
): BriefingOutline {
  const fixtureFacts = pickFacts(sources, "fixture_cache", 8);
  const matchFacts = fixtureFacts.slice(1);
  const teamFacts = pickFacts(sources, "team_profile", 5);
  const sideStoryFacts = pickFacts(sources, "manual_side_story", 6);
  const playerFacts = pickFacts(sources, "player_roast_trait", 4);
  const webFacts = pickFacts(sources, "configured_web", 4);
  const attempt = Math.max(1, options.attempt ?? 1);
  const matchStart = attempt === 1 ? 0 : attempt === 2 ? 2 : 4;
  const previousTitles = options.memory?.items.map((item) => item.title).slice(0, 3) ?? [];
  return {
    headlineAngles: [
      matchFacts[0] ?? fixtureFacts[0] ?? "The fixture desk is open, but Gil is still checking the receipts.",
      sideStoryFacts[0] ?? webFacts[0] ?? "No external side-story source was configured; the dispatch stays schedule-first.",
    ],
    matchesToWatch: matchFacts.slice(matchStart, matchStart + 5),
    teamNotes: attempt >= 2 ? teamFacts.slice().reverse() : teamFacts,
    playerWatch: [...sideStoryFacts, ...(attempt >= 3 ? playerFacts.slice().reverse() : playerFacts)].slice(0, 6),
    memoryHooks: [
      "This dispatch should be remembered globally so Gil can reference today's published desk later.",
      "Prediction gates remain governed by on-chain registration, kickoff time, and settlement status.",
      previousTitles.length
        ? `Avoid repeating recent briefing angles: ${previousTitles.join(" | ")}.`
        : "No previous Daily What's Up memory was loaded, so scout breadth matters more.",
    ],
    sourceIds: [...new Set(sources.map((source) => source.sourceId))],
  };
}

type WriterInput = { date: string; type: string; outline: BriefingOutline; memory?: BriefingMemorySnapshot; attempt?: number };

function stripCitations(fact: string): string {
  return fact.replace(/\s*\[[^\]]+\]\s*$/, "").trim();
}

export function titleFor(input: WriterInput): string {
  const dateLabel = new Date(`${input.date}T00:00:00.000Z`).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  const attemptLabel = input.attempt && input.attempt > 1 ? ` Fresh Angle ${input.attempt}` : "";
  return input.type === "post_match" ? `Gil's Post-Match Evidence Desk - ${dateLabel}${attemptLabel}` : `Gil's Daily What's Up - ${dateLabel}${attemptLabel}`;
}

function summarize(markdown: string): string {
  const lead = markdown
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("#") && !line.startsWith("-") && !line.startsWith("_"));
  return (lead ?? "Gil filed today's World Cup dispatch.").replace(/[*_`]/g, "").slice(0, 220);
}

// Gil writes the dispatch with the LLM so it reads like a sharp tabloid column, not a data dump.
// Falls back to the deterministic template if the model is unavailable so the cron never breaks.
export async function runWriterAgent(input: WriterInput): Promise<BriefingArticle> {
  const title = titleFor(input);
  const material = {
    date: input.date,
    type: input.type,
    leadAngles: input.outline.headlineAngles.map(stripCitations),
    matchesToWatch: input.outline.matchesToWatch.map(stripCitations),
    teamNotes: input.outline.teamNotes.map(stripCitations),
    playerAndSideStories: input.outline.playerWatch.map(stripCitations),
    avoidRepeatingTitles: input.memory?.items.map((item) => item.title).slice(0, 3) ?? [],
  };

  const system = [
    "You are Gil, a witty tabloid football pundit writing the 'Daily What's Up' dispatch for a World Cup 2026 prediction game whose takes are stored forever on Walrus (decentralized memory).",
    "Voice: sharp, funny, confident, a little sarcastic — like a sports columnist with a grudge and a long memory. NEVER a dry data dump.",
    "Hard rules: use ONLY the facts in the JSON (real fixtures/results/teams). Do NOT invent scores, injuries, or quotes. No betting/wager/odds language. No hate, no protected-class jabs, no private-life claims.",
    "If a match already has a result in the facts, roast or praise it; if it's upcoming, tease it. Lean on the 'Walrus remembers your bad takes' gimmick once, not in every line.",
    "Output GitHub-flavored markdown only (no preamble), under ~450 words, with these sections in order: '## The Lead' (2-3 punchy sentences), '## Matches To Watch' (bullets), '## Team Notes' (bullets), '## Player & Side-Story Watch' (bullets), '## What Walrus Will Remember' (1-2 bullets). Vary wording from the avoidRepeatingTitles angles.",
  ].join("\n");

  try {
    const res = await gil.generate([
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(material) },
    ]);
    let body = (res.text ?? "").trim();
    if (body.length < 120) throw new Error("writer output too short");
    body = body.replace(/^```(?:markdown)?\s*/i, "").replace(/```\s*$/i, "").trim();
    const markdown = body.startsWith("#") ? body : `# ${title}\n\n${body}`;
    return { title, slug: slugify(title), summary: summarize(markdown), markdown };
  } catch (error) {
    console.error("[briefings] writer LLM failed, using template:", error instanceof Error ? error.message : error);
    return buildTemplateArticle(input, title);
  }
}

export function buildTemplateArticle(input: WriterInput, title: string): BriefingArticle {
  const matches = input.outline.matchesToWatch.length
    ? input.outline.matchesToWatch.map((fact) => `- ${fact}`).join("\n")
    : "- No exact kickoff for the selected day. Gil is staring at the future fixtures like they owe him paperwork.";
  const teams = input.outline.teamNotes.length
    ? input.outline.teamNotes.map((fact) => `- ${fact}`).join("\n")
    : "- Team profile cache is loaded, but today's focus did not isolate a squad.";
  const players = input.outline.playerWatch.length
    ? input.outline.playerWatch.map((fact) => `- ${fact}`).join("\n")
    : "- No special player roast hook today. The players have been temporarily spared, which feels legally suspicious.";
  const freshness = input.memory?.avoidSummaries.length
    ? `Gil checked ${input.memory.avoidSummaries.length} older dispatch memories before writing this one, then swerved away from yesterday's recycled angles.`
    : "Gil found no older dispatch memory for this lane, so this desk starts from fresh source evidence.";

  const markdown = [
    `# ${title}`,
    "",
    "Gil opened the desk, checked the fixture ledger, and found enough evidence for a short public dispatch. This is commentary, not wagering advice; the only thing at stake is dignity.",
    freshness,
    "",
    "## The Lead",
    input.outline.headlineAngles.map((fact) => `- ${fact}`).join("\n"),
    "",
    "## Matches To Watch",
    matches,
    "",
    "## Team Notes",
    teams,
    "",
    "## Player / Side Story Watch",
    players,
    "",
    "## What Walrus Should Remember",
    input.outline.memoryHooks.map((fact) => `- ${fact}`).join("\n"),
    "",
    "_Gil's verdict: if a take survives the match, Walrus will still remember who said it first._",
  ].join("\n");

  return {
    title,
    slug: slugify(title),
    summary:
      input.outline.headlineAngles
        .join(" ")
        .replace(/\[[^\]]+\]/g, "")
        .slice(0, 220) ?? "Gil published a schedule-first dispatch.",
    markdown,
  };
}

export function runModeratorAgent(article: BriefingArticle, sourceIds: string[]): { approved: boolean; article: BriefingArticle; notes: string[] } {
  const notes: string[] = [];
  let markdown = article.markdown;
  const banned = /\b(bet|bets|betting|wager|odds|bookie|parlay)\b/gi;
  if (banned.test(markdown)) {
    markdown = markdown.replace(banned, "prediction");
    notes.push("Replaced wagering language with prediction-game language.");
  }

  const referenced = [...markdown.matchAll(/\[([a-z]+-\d+)\]/g)].map((match) => match[1]).filter((id): id is string => Boolean(id));
  const unknown = referenced.filter((id) => !sourceIds.includes(id));
  if (unknown.length > 0) {
    return { approved: false, article: { ...article, markdown }, notes: [`Unsupported source references: ${unknown.join(", ")}`] };
  }

  if (markdown.length > 7000) {
    markdown = `${markdown.slice(0, 6800)}\n\n_Trimmed by Gil's editor before the column became a legal document._`;
    notes.push("Trimmed long article.");
  }

  return { approved: true, article: { ...article, markdown }, notes };
}
