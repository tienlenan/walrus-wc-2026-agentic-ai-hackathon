import { gil } from "../mastra/agents/gil.js";
import { recall, remember, memNamespace, isMemoryEnabled } from "@daily-walrus/walrus";
import { buildSessionContext } from "@daily-walrus/shared";

export interface ChatOptions {
  /** Response language ("vi" | "en"). */
  lang?: string;
  /** Optional user-provided extra instructions. */
  customInstructions?: string;
}

export interface ChatResult {
  text: string;
  usedMemories: string[];
  memoryEnabled: boolean;
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

  const memories = await recall(ns, message).catch(() => [] as string[]);

  // Inject current time + language + custom instructions + memory as the session context.
  const context = buildSessionContext({
    lang: opts.lang,
    now: new Date().toString(),
    customInstructions: opts.customInstructions,
    memories,
  });

  const res = await gil.generate([
    { role: "system", content: context },
    { role: "user", content: message },
  ]);

  // Remember the user's message (do not block the response).
  if (isMemoryEnabled()) {
    void remember(ns, `User said: "${message}"`).catch((e) =>
      console.error("[memory] remember failed:", e?.message ?? e),
    );
  }

  return { text: res.text, usedMemories: memories, memoryEnabled: isMemoryEnabled() };
}
