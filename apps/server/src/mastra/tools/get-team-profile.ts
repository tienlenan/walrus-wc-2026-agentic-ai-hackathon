import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { getTeamProfileQuery } from "../../services/chat-render-parts.js";

/** Read one national team profile from the WC2026 team cache plus Walrus blob pointers. */
export const getTeamProfileTool = createTool({
  id: "get-team-profile",
  description:
    "Get a FIFA World Cup 2026 national team profile: flag, group, coach, squad sample, fixtures, and Walrus blob proof.",
  inputSchema: z.object({
    team: z.string().describe("Team code, team name, or known player alias, for example POR, Portugal, Ronaldo"),
  }),
  outputSchema: z.object({
    team: z.object({
      code: z.string(),
      name: z.string(),
      groupName: z.string(),
      confederation: z.string(),
      flagEmoji: z.string(),
      coach: z.string().nullable(),
      coachNationality: z.string().nullable(),
      walrusStatus: z.string(),
      walrusBlobId: z.string().nullable(),
      walrusObjectId: z.string().nullable(),
      profileHash: z.string(),
    }),
    squadSample: z.array(
      z.object({
        number: z.number(),
        position: z.string(),
        playerName: z.string(),
        club: z.string(),
      }),
    ),
    fixtures: z.array(
      z.object({
        matchId: z.string(),
        stage: z.string().nullable(),
        groupName: z.string().nullable(),
        home: z.string(),
        away: z.string(),
        homeTeamCode: z.string().nullable(),
        awayTeamCode: z.string().nullable(),
        kickoff: z.string().nullable(),
        venue: z.string().nullable(),
        city: z.string().nullable(),
        status: z.string(),
        homeScore: z.number().nullable(),
        awayScore: z.number().nullable(),
        chainRegistered: z.boolean(),
        predictionOpen: z.boolean(),
        predictionStatus: z.string(),
        predictionLockedReason: z.string().nullable(),
      }),
    ),
    squadCount: z.number(),
  }),
  execute: async ({ context }) => getTeamProfileQuery(context),
});
