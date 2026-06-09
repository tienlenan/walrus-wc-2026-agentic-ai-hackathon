// Call the Gil server (POST /api/gil/chat). Requires a verified Sui session.
// Sends the chosen reply language + roast severity + optional custom instructions so Gil answers accordingly.
import { getSession } from "./auth";
import type { WalrusOutputPointer } from "./sui-output-record";

const BASE = import.meta.env.VITE_MASTRA_URL ?? "http://localhost:4111";

export interface GilReply {
  text: string;
  usedMemories: string[];
  memoryEnabled: boolean;
  outputPointer: WalrusOutputPointer;
}

export interface AskOptions {
  lang?: string;
  instructions?: string;
  roastSeverity?: string;
}

export async function askGil(message: string, opts: AskOptions = {}): Promise<GilReply> {
  const session = getSession();
  if (!session?.token) throw new Error("Sign in first.");
  const headers: Record<string, string> = { "content-type": "application/json" };
  headers.Authorization = `Bearer ${session.token}`;
  const body = { message, lang: opts.lang, roastSeverity: opts.roastSeverity, instructions: opts.instructions };

  const res = await fetch(`${BASE}/api/gil/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gil API ${res.status}`);
  return (await res.json()) as GilReply;
}
