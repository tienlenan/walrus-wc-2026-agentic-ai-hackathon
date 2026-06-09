// Thin HTTP server for The Daily Walrus: Walrus-backed chat plus Sign-in-with-Sui.
// Dev:  node --env-file=../../.env.local --import tsx --watch src/serve.ts
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { chatWithGil } from "./services/chat-with-gil.js";
import { isMemoryEnabled, memNamespace, recall } from "@daily-walrus/walrus";
import { issueNonce, verifyAndIssueSession, verifySession, bearer } from "./services/auth.js";
import { startEventIndexer } from "./services/event-indexer.js";
import { getGameSnapshot } from "./services/game-snapshot.js";
import { saveMatchVote } from "./services/game-votes.js";
import { scoreMatch } from "./services/score-keeper.js";
import { createRoast, listRoasts } from "./services/roast-engine.js";
import { getWorldCupSnapshot, publishTeamProfileBlob, seedWorldCupData } from "./services/world-cup-data.js";
import { registerSuiOutputRecord } from "./services/sui-output-records.js";
import { getRuntimeTracking, syncGlobalPlayerRoastMemory, syncGlobalWorldCupMemory } from "./services/global-world-cup-memory.js";
import { PLAYER_ROAST_TRAITS } from "./data/player-roast-traits.js";

const PORT = Number(process.env.PORT ?? 4111);
const ALLOWED = (
  process.env.CORS_ORIGINS ?? "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// CORS allowlist.
function setCors(res: ServerResponse, origin?: string): void {
  const allow = origin && ALLOWED.includes(origin) ? origin : (ALLOWED[0] ?? "http://localhost:5173");
  res.setHeader("Access-Control-Allow-Origin", allow);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Oracle-Token");
}

function json(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => resolve(body));
  });
}

function numberBody(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function oracleAuthorized(req: IncomingMessage): boolean {
  const expected = process.env.ORACLE_ADMIN_TOKEN;
  if (!expected) return false;
  const header = req.headers["x-oracle-token"];
  const token = Array.isArray(header) ? header[0] : header;
  return token === expected || bearer(req) === expected;
}

async function streamGameSnapshot(res: ServerResponse): Promise<void> {
  res.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
  });

  const send = async () => {
    try {
      res.write(`event: snapshot\ndata: ${JSON.stringify(await getGameSnapshot(null))}\n\n`);
    } catch (error) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: error instanceof Error ? error.message : String(error) })}\n\n`);
    }
  };

  res.write(": connected\n\n");
  await send();
  const id = setInterval(() => void send(), Number(process.env.GAME_STREAM_INTERVAL_MS ?? 5000));
  res.on("close", () => clearInterval(id));
}

/**
 * Identity for write/personalized features is always a verified Sui session.
 * Read-only public data stays open; user output never falls back to guest ids.
 */
function resolveWalletIdentity(req: IncomingMessage): string | null {
  const authed = verifySession(bearer(req));
  return authed?.startsWith("0x") ? authed : null;
}

const server = createServer(async (req, res) => {
  setCors(res, req.headers.origin);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }
  if (req.method === "GET" && req.url === "/") {
    return json(res, 200, { ok: true, service: "the-daily-walrus", memoryEnabled: isMemoryEnabled() });
  }
  try {
    if (req.method === "GET" && req.url?.startsWith("/api/game/snapshot")) {
      const subject = verifySession(bearer(req));
      return json(res, 200, await getGameSnapshot(subject?.startsWith("0x") ? subject : null));
    }
    if (req.method === "GET" && req.url?.startsWith("/api/world-cup/snapshot")) {
      return json(res, 200, getWorldCupSnapshot());
    }
    if (req.method === "GET" && req.url?.startsWith("/api/world-cup/player-roast-traits")) {
      return json(res, 200, { traits: PLAYER_ROAST_TRAITS });
    }
    if (req.method === "GET" && req.url?.startsWith("/api/tracking/runtime")) {
      return json(res, 200, await getRuntimeTracking());
    }
    if (req.method === "GET" && req.url?.startsWith("/api/game/stream")) {
      return streamGameSnapshot(res);
    }
    if (req.method === "POST" && req.url === "/api/world-cup/publish-profile") {
      if (!oracleAuthorized(req)) return json(res, 401, { error: "oracle token required" });
      const body = JSON.parse((await readBody(req)) || "{}") as { teamCode?: string };
      if (!body.teamCode) return json(res, 400, { error: "teamCode required" });
      return json(res, 200, { pointer: await publishTeamProfileBlob(body.teamCode) });
    }
    if (req.method === "GET" && req.url?.startsWith("/api/roasts")) {
      const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
      const limit = Number(url.searchParams.get("limit") ?? 20);
      return json(res, 200, { roasts: await listRoasts(limit) });
    }
    if (req.method === "POST" && req.url === "/api/roast") {
      const body = JSON.parse((await readBody(req)) || "{}") as {
        targetType?: "team" | "player";
        targetId?: string;
        targetName?: string;
        teamCode?: string;
        playerNumber?: number;
        roastSeverity?: string;
        lang?: string;
        instructions?: string;
      };
      const identity = resolveWalletIdentity(req);
      if (!identity) return json(res, 401, { error: "verified Sui session required" });
      if (body.targetType !== "team" && body.targetType !== "player") {
        return json(res, 400, { error: "targetType must be team or player" });
      }
      return json(res, 200, { roast: await createRoast(identity, { ...body, targetType: body.targetType }) });
    }
    if (req.method === "POST" && req.url === "/api/outputs/register") {
      const subject = resolveWalletIdentity(req);
      if (!subject) return json(res, 401, { error: "verified Sui session required" });
      const body = JSON.parse((await readBody(req)) || "{}") as Parameters<typeof registerSuiOutputRecord>[1];
      return json(res, 200, { output: await registerSuiOutputRecord(subject, body) });
    }
    if (req.method === "POST" && req.url === "/api/game/vote") {
      const subject = verifySession(bearer(req));
      if (!subject?.startsWith("0x")) return json(res, 401, { error: "verified Sui session required" });
      const body = JSON.parse((await readBody(req)) || "{}") as { matchId?: string; kind?: string; targetLabel?: string };
      return json(res, 200, { vote: await saveMatchVote(subject, body) });
    }
    if (req.method === "POST" && req.url === "/api/oracle/score") {
      const body = JSON.parse((await readBody(req)) || "{}") as {
        matchId?: string;
        homeScore?: unknown;
        awayScore?: unknown;
        manualScores?: Array<{ predictionId: string; points: number; correct: boolean }>;
        execute?: boolean;
        settle?: boolean;
      };
      if (body.execute && !oracleAuthorized(req)) return json(res, 401, { error: "oracle token required" });
      return json(
        res,
        200,
        await scoreMatch({
          matchId: String(body.matchId ?? ""),
          homeScore: numberBody(body.homeScore),
          awayScore: numberBody(body.awayScore),
          manualScores: body.manualScores,
          execute: Boolean(body.execute),
          settle: Boolean(body.settle),
        }),
      );
    }
    if (req.method === "POST" && req.url === "/api/oracle/memory-sync") {
      if (!oracleAuthorized(req)) return json(res, 401, { error: "oracle token required" });
      const body = JSON.parse((await readBody(req)) || "{}") as { reason?: string; force?: boolean };
      return json(res, 200, await syncGlobalWorldCupMemory({ reason: body.reason ?? "oracle", force: Boolean(body.force) }));
    }
    if (req.method === "POST" && req.url === "/api/oracle/player-roast-memory-sync") {
      if (!oracleAuthorized(req)) return json(res, 401, { error: "oracle token required" });
      const body = JSON.parse((await readBody(req)) || "{}") as { reason?: string; force?: boolean };
      return json(res, 200, await syncGlobalPlayerRoastMemory({ reason: body.reason ?? "oracle", force: Boolean(body.force) }));
    }

    // --- Auth: sign-in-with-Sui ---
    if (req.method === "POST" && req.url === "/api/auth/nonce") {
      const { address } = JSON.parse((await readBody(req)) || "{}") as { address?: string };
      if (!address?.startsWith("0x")) return json(res, 400, { error: "address required" });
      return json(res, 200, { message: issueNonce(address) });
    }
    if (req.method === "POST" && req.url === "/api/auth/verify") {
      const { address, signature } = JSON.parse((await readBody(req)) || "{}") as {
        address?: string;
        signature?: string;
      };
      if (!address || !signature) return json(res, 400, { error: "address and signature required" });
      const token = await verifyAndIssueSession(address, signature);
      return token ? json(res, 200, { token, address }) : json(res, 401, { error: "invalid signature" });
    }
    // --- Chat (memory) ---
    if (req.method === "POST" && req.url === "/api/gil/chat") {
      const body = JSON.parse((await readBody(req)) || "{}") as {
        message?: string;
        lang?: string;
        roastSeverity?: string;
        instructions?: string;
      };
      const message = (body.message ?? "").trim();
      const identity = resolveWalletIdentity(req);
      if (!identity) return json(res, 401, { error: "verified Sui session required" });
      if (!message) return json(res, 400, { error: "message required" });
      return json(
        res,
        200,
        await chatWithGil(identity, message, {
          lang: body.lang,
          roastSeverity: body.roastSeverity,
          customInstructions: body.instructions,
        }),
      );
    }
    if (req.method === "POST" && req.url === "/api/gil/notebook") {
      const body = JSON.parse((await readBody(req)) || "{}") as {
        query?: string;
      };
      const identity = resolveWalletIdentity(req);
      if (!identity) return json(res, 401, { error: "verified Sui session required" });
      const query = (body.query ?? "World Cup predictions, roasts, favourite teams").trim();
      return json(res, 200, { memories: await recall(memNamespace(identity), query, 10), memoryEnabled: isMemoryEnabled() });
    }
  } catch (e) {
    return json(res, 500, { error: e instanceof Error ? e.message : String(e) });
  }
  return json(res, 404, { error: "not found" });
});

// Keep one failed async path from taking down the process during a demo.
process.on("unhandledRejection", (r) => console.error("[unhandledRejection]", r));
process.on("uncaughtException", (e) => console.error("[uncaughtException]", e));

server.listen(PORT, () => {
  console.log(`🦭 The Daily Walrus server → http://localhost:${PORT}  (memory: ${isMemoryEnabled() ? "ON" : "OFF"})`);
  void seedWorldCupData()
    .then(async (result) => {
      if (result.fixtures > 0) {
        console.log(`[world-cup] seeded ${result.teams} teams, ${result.players} players, ${result.fixtures} fixtures`);
      }
      const status = await syncGlobalWorldCupMemory({ reason: "startup" });
      console.log(`[world-cup] global memory ${status.status} (${status.fixtureCount} fixtures)`);
      const playerStatus = await syncGlobalPlayerRoastMemory({ reason: "startup" });
      console.log(`[world-cup] player roast memory ${playerStatus.status} (${playerStatus.playerCount} players)`);
    })
    .catch((error) => console.error("[world-cup] seed failed:", error instanceof Error ? error.message : error));
  startEventIndexer();
});
