import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { getPool } from "@daily-walrus/db";

/** Đọc lịch/kết quả từ cache Supabase (bảng fixtures). */
export const getFixturesTool = createTool({
  id: "get-fixtures",
  description: "Lấy lịch/kết quả các trận World Cup 2026 (lọc theo đội hoặc trạng thái).",
  inputSchema: z.object({
    team: z.string().optional().describe("Tên đội để lọc (khớp gần đúng)"),
    status: z.enum(["scheduled", "live", "finished"]).optional(),
    limit: z.number().int().min(1).max(20).default(5),
  }),
  outputSchema: z.object({
    fixtures: z.array(
      z.object({
        matchId: z.string(),
        home: z.string(),
        away: z.string(),
        status: z.string(),
        homeScore: z.number().nullable(),
        awayScore: z.number().nullable(),
        kickoff: z.string().nullable(),
      }),
    ),
  }),
  execute: async ({ context }) => {
    const { team, status, limit } = context;
    const clauses: string[] = [];
    const params: (string | number)[] = [];
    if (team) {
      params.push(`%${team}%`);
      clauses.push(`(home ilike $${params.length} or away ilike $${params.length})`);
    }
    if (status) {
      params.push(status);
      clauses.push(`status = $${params.length}`);
    }
    const where = clauses.length ? `where ${clauses.join(" and ")}` : "";
    params.push(limit);

    const { rows } = await getPool().query(
      `select match_id, home, away, status, home_score, away_score, kickoff
         from fixtures ${where}
        order by kickoff nulls last
        limit $${params.length}`,
      params,
    );

    return {
      fixtures: rows.map((r) => ({
        matchId: r.match_id as string,
        home: r.home as string,
        away: r.away as string,
        status: r.status as string,
        homeScore: (r.home_score ?? null) as number | null,
        awayScore: (r.away_score ?? null) as number | null,
        kickoff: r.kickoff ? new Date(r.kickoff).toISOString() : null,
      })),
    };
  },
});
