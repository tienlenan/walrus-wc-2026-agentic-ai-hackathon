import { server } from "../apps/server/src/serve.js";

export const config = {
  maxDuration: 60,
};

function normalizeApiPath(req: { url?: string; headers: { host?: string }; query?: Record<string, unknown> }): void {
  const rawPath = req.query?.path;
  const path = Array.isArray(rawPath) ? rawPath.join("/") : typeof rawPath === "string" ? rawPath : "";
  if (!path) return;

  const url = new URL(req.url ?? "/", `https://${req.headers.host ?? "localhost"}`);
  url.searchParams.delete("path");
  const search = url.searchParams.toString();
  req.url = `/api/${path}${search ? `?${search}` : ""}`;
}

export default function handler(
  req: Parameters<typeof server.emit>[1] & { query?: Record<string, unknown> },
  res: Parameters<typeof server.emit>[2],
) {
  normalizeApiPath(req);
  server.emit("request", req, res);
}
