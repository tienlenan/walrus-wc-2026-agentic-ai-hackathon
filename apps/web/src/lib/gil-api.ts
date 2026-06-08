// Gọi Mastra server (route /api/gil/chat). Ưu tiên session token (authed); fallback guest resourceId.
import { getSession } from "./auth";
import { getResourceId } from "./identity";

const BASE = import.meta.env.VITE_MASTRA_URL ?? "http://localhost:4111";

export interface GilReply {
  text: string;
  usedMemories: string[];
  memoryEnabled: boolean;
}

export async function askGil(message: string): Promise<GilReply> {
  const session = getSession();
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (session?.token) headers["Authorization"] = `Bearer ${session.token}`;
  const body = session?.token ? { message } : { message, resourceId: getResourceId() };

  const res = await fetch(`${BASE}/api/gil/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gil API ${res.status}`);
  return (await res.json()) as GilReply;
}
