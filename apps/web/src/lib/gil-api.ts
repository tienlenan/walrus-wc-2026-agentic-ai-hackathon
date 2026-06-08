// Call the Gil server (POST /api/gil/chat). Prefer a session token (authed); else a guest resourceId.
// Sends the chosen reply language + optional custom instructions so Gil answers accordingly.
import { getSession } from "./auth";
import { getResourceId } from "./identity";

const BASE = import.meta.env.VITE_MASTRA_URL ?? "http://localhost:4111";

export interface GilReply {
  text: string;
  usedMemories: string[];
  memoryEnabled: boolean;
}

export interface AskOptions {
  lang?: string;
  instructions?: string;
}

export async function askGil(message: string, opts: AskOptions = {}): Promise<GilReply> {
  const session = getSession();
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (session?.token) headers["Authorization"] = `Bearer ${session.token}`;

  const identity = session?.token ? {} : { resourceId: getResourceId() };
  const body = { message, lang: opts.lang, instructions: opts.instructions, ...identity };

  const res = await fetch(`${BASE}/api/gil/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gil API ${res.status}`);
  return (await res.json()) as GilReply;
}
