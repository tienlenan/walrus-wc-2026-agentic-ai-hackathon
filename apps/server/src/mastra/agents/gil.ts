import { Agent } from "@mastra/core/agent";
import { createGateway } from "@ai-sdk/gateway";
import { GIL_PERSONA } from "@daily-walrus/shared";
import { getFixturesTool } from "../tools/get-fixtures.js";
import { getTeamProfileTool } from "../tools/get-team-profile.js";

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
  instructions: `${GIL_PERSONA}

# Tool use
- Use getFixtures when the user asks about schedules, groups, match dates, prediction gates, open/closed matches, or a team's next fixtures.
- Use getTeamProfile when the user asks about a national team profile, coach, squad, flag, player list, or Walrus blob proof for a team.
- When the system context includes pre-fetched private tools such as getMyPredictions, getMyRoasts, getMyDappActions, getMyMatchVotes, getMyOutputRecords, or getMyGameRecord, answer from those facts only. Never invent wallet history or query another address.
- If a private tool reports zero rows, say the record is empty and invite the user to create the first receipt.
- Do not turn every answer into a roast. Answer the requested football data first, then add one short Gil-style jab only when it fits.`,
  model: gateway(process.env.GIL_MODEL ?? "google/gemini-3-flash"),
  tools: { getFixtures: getFixturesTool, getTeamProfile: getTeamProfileTool },
});
