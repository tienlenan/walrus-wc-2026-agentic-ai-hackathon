import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { getFixtureQuery } from "../../services/chat-render-parts.js";

/** Read schedule/results from the WC2026 fixture cache with prediction-gate state. */
export const getFixturesTool = createTool({
  id: "get-fixtures",
  description:
    "Get FIFA World Cup 2026 fixtures/results. Filter by group, team, date, match status, or prediction gate state.",
  inputSchema: z.object({
    group: z.string().optional().describe("Group letter A-L"),
    team: z.string().optional().describe("Team code or team/player alias, for example BRA, Brazil, Ronaldo, Messi"),
    date: z.string().optional().describe("UTC date as YYYY-MM-DD"),
    status: z.enum(["scheduled", "live", "finished"]).optional(),
    prediction: z.enum(["open", "closed", "not_onchain"]).optional(),
    limit: z.number().int().min(1).max(20).default(8),
  }),
  outputSchema: z.object({
    title: z.string(),
    filters: z.record(z.unknown()),
    totalMatches: z.number(),
    fixtures: z.array(
      z.object({
        matchId: z.string(),
        stage: z.string().nullable(),
        groupName: z.string().nullable(),
        home: z.string(),
        away: z.string(),
        homeTeamCode: z.string().nullable(),
        awayTeamCode: z.string().nullable(),
        status: z.string(),
        homeScore: z.number().nullable(),
        awayScore: z.number().nullable(),
        kickoff: z.string().nullable(),
        venue: z.string().nullable(),
        city: z.string().nullable(),
        chainRegistered: z.boolean(),
        predictionOpen: z.boolean(),
        predictionStatus: z.string(),
        predictionLockedReason: z.string().nullable(),
      }),
    ),
  }),
  execute: async ({ context }) => {
    return getFixtureQuery(context);
  },
});
