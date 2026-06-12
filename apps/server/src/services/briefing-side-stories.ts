import type { BriefingSource } from "./briefing-types.js";

function inDateWindow(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

function defaultTournamentSideStories(date: string): BriefingSource[] {
  if (!inDateWindow(date, "2026-06-12", "2026-06-14")) return [];
  return [
    {
      sourceId: "side-endo-1",
      kind: "manual_side_story",
      title: "Japan captain Wataru Endo ruled out",
      url: "https://www.fifa.com/en/articles/japan-captain-endo-ruled-out-injury",
      publishedAt: "2026-06-11T00:00:00.000Z",
      facts: [
        "Japan captain Wataru Endo withdrew from the World Cup squad because of a foot injury.",
        "Endo also announced his retirement from international football after the injury setback.",
        "Japan named Ko Itakura as the new captain and called up Shuto Machino as Endo's replacement.",
      ],
    },
  ];
}

function manualSideStoriesFromEnv(): BriefingSource[] {
  const raw = process.env.BRIEFING_SIDE_STORIES_JSON;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Array<{ title?: string; url?: string; facts?: string[]; publishedAt?: string | null }>;
    return parsed.slice(0, 8).map((story, index) => ({
      sourceId: `side-${index + 1}`,
      kind: "manual_side_story",
      title: String(story.title ?? `Side story ${index + 1}`).slice(0, 160),
      url: story.url ?? null,
      publishedAt: story.publishedAt ?? null,
      facts: (story.facts ?? []).map((fact) => String(fact).slice(0, 260)).filter(Boolean).slice(0, 4),
    }));
  } catch {
    return [];
  }
}

export function briefingSideStories(date: string): BriefingSource[] {
  return [...manualSideStoriesFromEnv(), ...defaultTournamentSideStories(date)];
}
