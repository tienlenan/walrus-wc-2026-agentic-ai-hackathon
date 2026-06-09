import { gil } from "../mastra/agents/gil.js";
import { recall, remember, memNamespace, isMemoryEnabled } from "@daily-walrus/walrus";
import { buildSessionContext } from "@daily-walrus/shared";
import { recallGlobalWorldCupMemory } from "./global-world-cup-memory.js";
import { publishJsonBlob, type WalrusBlobPointer } from "./walrus-blob.js";
import { findPlayerRoastTraits } from "../data/player-roast-traits.js";
import { getUserPredictionMemoryFacts, syncUserPredictionMemory } from "./user-prediction-memory.js";

export interface ChatOptions {
  /** Response language ("vi" | "en"). */
  lang?: string;
  /** Roast severity: light/standard/savage. */
  roastSeverity?: string;
  /** Optional user-provided extra instructions. */
  customInstructions?: string;
}

export interface ChatResult {
  text: string;
  usedMemories: string[];
  memoryEnabled: boolean;
  outputPointer: WalrusBlobPointer;
}

/**
 * Chat with Gil WITH persistent Walrus Memory (deterministic):
 *   1) recall this user's relevant memories  → 2) inject as session context
 *   3) Gil answers (in the chosen language)   → 4) remember the user's message (async)
 * This is where the before/after effect is produced.
 */
export async function chatWithGil(
  resourceId: string,
  message: string,
  opts: ChatOptions = {},
): Promise<ChatResult> {
  const ns = memNamespace(resourceId);

  const [predictionFacts, userMemories, globalMemories] = await Promise.all([
    getUserPredictionMemoryFacts(resourceId).catch(() => [] as string[]),
    recall(ns, message).catch(() => [] as string[]),
    recallGlobalWorldCupMemory(message).catch(() => [] as string[]),
  ]);
  if (predictionFacts.length > 0) {
    await syncUserPredictionMemory(resourceId).catch((error) =>
      console.error("[memory] prediction sync failed:", error?.message ?? error),
    );
  }
  const memories = [
    ...globalMemories.map((memory) => `[Global WC2026 memory] ${memory}`),
    ...predictionFacts.map((memory) => `[Live prediction record] ${memory}`),
    ...findPlayerRoastTraits(message).map(
      (trait) =>
        `[Player roast trait] ${trait.playerName} (${trait.teamCode}): ${trait.roastAngles.join(" ")} Safe lines: ${trait.safeLines.join(" ")} Avoid: ${trait.avoid.join(" ")}`,
    ),
    ...userMemories.map((memory) => `[User memory] ${memory}`),
  ];

  // Inject current time + language + roast severity + custom instructions + memory as the session context.
  const context = buildSessionContext({
    lang: opts.lang,
    now: new Date().toString(),
    roastSeverity: opts.roastSeverity,
    customInstructions: opts.customInstructions,
    memories,
  });

  const res = await gil.generate([
    { role: "system", content: context },
    { role: "user", content: message },
  ]);

  const outputPointer = await publishJsonBlob("chat-output", {
    resourceId,
    message,
    reply: res.text,
    globalMemories,
    predictionFacts,
    userMemories,
    usedMemories: memories,
    createdAt: new Date().toISOString(),
  });

  // Remember the user's message (do not block the response).
  if (isMemoryEnabled()) {
    void remember(ns, `User said: "${message}"`).catch((e) =>
      console.error("[memory] remember failed:", e?.message ?? e),
    );
  }

  return { text: res.text, usedMemories: memories, memoryEnabled: isMemoryEnabled(), outputPointer };
}
