import { Agent } from "@mastra/core/agent";
import { createGateway } from "@ai-sdk/gateway";
import { GIL_SYSTEM_PROMPT } from "@daily-walrus/shared";
import { getFixturesTool } from "../tools/get-fixtures.js";

// Vercel AI Gateway (đọc AI_GATEWAY_API_KEY) — route Gemini qua gateway, không gọi Google trực tiếp.
const gateway = createGateway({ apiKey: process.env.AI_GATEWAY_API_KEY });

/**
 * Gil — mascot/agent của The Daily Walrus.
 * Model: Gemini qua Vercel AI Gateway (Mastra model-router đọc AI_GATEWAY_API_KEY từ env).
 */
export const gil = new Agent({
  id: "gil",
  name: "Gil",
  instructions: GIL_SYSTEM_PROMPT,
  model: gateway(process.env.GIL_MODEL ?? "google/gemini-3-flash"),
  tools: { getFixtures: getFixturesTool },
  // memory: (M2) Walrus Memory + Mastra Memory
});
