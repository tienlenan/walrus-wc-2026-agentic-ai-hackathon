// HTTP server mỏng cho The Daily Walrus — chat có trí nhớ Walrus + sign-in-with-Sui.
// Dev:  node --env-file=../../.env.local --import tsx --watch src/serve.ts
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { chatWithGil } from "./services/chat-with-gil.js";
import { isMemoryEnabled } from "@daily-walrus/walrus";
import { issueNonce, verifyAndIssueSession, verifySession, bearer } from "./services/auth.js";

const PORT = Number(process.env.PORT ?? 4111);
const ALLOWED = (process.env.CORS_ORIGINS ?? "http://localhost:5173,http://localhost:4173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// RED TEAM #7: CORS allowlist thay vì "*".
function setCors(res: ServerResponse, origin?: string): void {
  const allow = origin && ALLOWED.includes(origin) ? origin : (ALLOWED[0] ?? "http://localhost:5173");
  res.setHeader("Access-Control-Allow-Origin", allow);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
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

/**
 * RED TEAM #4: identity KHÔNG lấy địa chỉ trực tiếp từ body.
 * - Có session token hợp lệ → subject (địa chỉ Sui đã verify, hoặc "guest:...").
 * - Không token → guest namespaced từ body.resourceId (không thể claim địa chỉ user khác).
 */
function resolveIdentity(req: IncomingMessage, body: { resourceId?: string }): string | null {
  const authed = verifySession(bearer(req));
  if (authed) return authed;
  const rid = (body.resourceId ?? "").trim();
  return rid ? `guest:${rid}` : null;
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
      const body = JSON.parse((await readBody(req)) || "{}") as { resourceId?: string; message?: string };
      const message = (body.message ?? "").trim();
      const identity = resolveIdentity(req, body);
      if (!identity || !message) return json(res, 400, { error: "identity (session/resourceId) and message required" });
      return json(res, 200, await chatWithGil(identity, message));
    }
  } catch (e) {
    return json(res, 500, { error: e instanceof Error ? e.message : String(e) });
  }
  return json(res, 404, { error: "not found" });
});

// RED TEAM #14: guard process để 1 lỗi không sập cả server.
process.on("unhandledRejection", (r) => console.error("[unhandledRejection]", r));
process.on("uncaughtException", (e) => console.error("[uncaughtException]", e));

server.listen(PORT, () => {
  console.log(`🦭 The Daily Walrus server → http://localhost:${PORT}  (memory: ${isMemoryEnabled() ? "ON" : "OFF"})`);
});
