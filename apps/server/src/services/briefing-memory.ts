import type { BriefingArticle, BriefingMemorySnapshot, BriefingType, DailyBriefingDto } from "./briefing-types.js";
import { listDailyBriefings } from "./briefing-store.js";
import { WORLD_CUP_GLOBAL_NAMESPACE } from "./global-world-cup-memory.js";

export const BRIEFING_MEMORY_NAMESPACE = `${WORLD_CUP_GLOBAL_NAMESPACE}:briefings`;

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "are",
  "was",
  "were",
  "will",
  "gil",
  "daily",
  "what",
  "whats",
  "up",
  "world",
  "cup",
  "prediction",
  "dispatch",
  "briefing",
]);

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function tokenize(value: string): Set<string> {
  return new Set(
    value
      .toLocaleLowerCase()
      .replace(/\[[^\]]+\]/g, " ")
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 3 && !STOP_WORDS.has(token)),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

function sourceIds(briefing: DailyBriefingDto): string[] {
  return unique(briefing.sources.map((source) => source.sourceId));
}

export async function loadBriefingMemorySnapshot(input: { briefingType?: BriefingType; limit?: number } = {}): Promise<BriefingMemorySnapshot> {
  const items = (await listDailyBriefings(input.limit ?? 8, input.briefingType)).map((briefing) => ({
    briefingDate: briefing.briefingDate,
    briefingType: briefing.briefingType,
    title: briefing.title,
    summary: briefing.summary,
    contentHash: briefing.proof.contentHash,
    sourceIds: sourceIds(briefing),
  }));
  return {
    namespace: BRIEFING_MEMORY_NAMESPACE,
    items,
    avoidSummaries: items.map((item) => `${item.title}: ${item.summary}`),
    avoidSourceIds: unique(items.flatMap((item) => item.sourceIds)),
  };
}

export function evaluateBriefingNovelty(
  article: BriefingArticle,
  memory: BriefingMemorySnapshot,
): { duplicate: boolean; score: number; reason: string } {
  if (memory.items.length === 0) return { duplicate: false, score: 0, reason: "No previous briefing memory." };
  const articleTokens = tokenize(`${article.title} ${article.summary} ${article.markdown}`);
  let maxScore = 0;
  let closest: BriefingMemorySnapshot["items"][number] | null = null;
  for (const item of memory.items) {
    const score = jaccard(articleTokens, tokenize(`${item.title} ${item.summary}`));
    if (score > maxScore) {
      maxScore = score;
      closest = item;
    }
  }
  const duplicate = maxScore >= 0.58;
  return {
    duplicate,
    score: Number(maxScore.toFixed(3)),
    reason: duplicate && closest ? `Too close to ${closest.briefingDate} (${closest.contentHash.slice(0, 10)}).` : "Fresh enough.",
  };
}
