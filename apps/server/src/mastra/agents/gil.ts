import { Agent } from "@mastra/core/agent";
import { createGateway } from "@ai-sdk/gateway";
import { GIL_PERSONA } from "@daily-walrus/shared";
import { getFixturesTool } from "../tools/get-fixtures.js";

// Vercel AI Gateway (reads AI_GATEWAY_API_KEY) — routes Gemini via the gateway, not Google directly.
const gateway = createGateway({ apiKey: process.env.AI_GATEWAY_API_KEY });

/**
 * Gil — The Daily Walrus agent. Base persona is stable (GIL_PERSONA); per-request
 * language, current time, custom instructions, and memory are supplied as a system
 * message by chat-with-gil (buildSessionContext).
 */
export const gil = new Agent({
  id: "gil",
  name: "Gil",
  instructions: GIL_PERSONA,
  model: gateway(process.env.GIL_MODEL ?? "google/gemini-3-flash"),
  tools: { getFixtures: getFixturesTool },
});
