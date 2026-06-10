import { createHash } from "node:crypto";
import type { LiveDataProviderName, MatchStatus, ProviderSourceMeta } from "./live-data-types.js";

export function stableHash(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }
  if (typeof value === "bigint") return JSON.stringify(value.toString());
  return JSON.stringify(value) ?? "undefined";
}

export function sourceMeta(input: {
  provider: LiveDataProviderName;
  sourceUrl?: string | null;
  sourceUpdatedAt?: string | null;
  raw?: unknown;
}): ProviderSourceMeta {
  return {
    provider: input.provider,
    sourceUrl: input.sourceUrl ?? null,
    sourceFetchedAt: new Date().toISOString(),
    sourceUpdatedAt: input.sourceUpdatedAt ?? null,
    contentHash: stableHash(input.raw ?? {}),
    raw: input.raw,
  };
}

export function num(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function str(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") return String(value);
  return fallback;
}

export function apiFootballStatus(value: unknown): MatchStatus {
  const short = str(value).toUpperCase();
  if (["1H", "2H", "HT", "ET", "BT", "P", "SUSP", "INT", "LIVE"].includes(short)) return "live";
  if (["FT", "AET", "PEN"].includes(short)) return "finished";
  if (["PST", "CANC", "ABD", "AWD", "WO"].includes(short)) return "postponed";
  if (["NS", "TBD"].includes(short)) return "scheduled";
  return "unknown";
}

export function eventKey(input: {
  provider: LiveDataProviderName;
  matchId: string;
  providerEventId?: string | null;
  minute?: number | null;
  eventType?: string | null;
  playerName?: string | null;
}): string {
  const providerPart = input.providerEventId
    ? input.providerEventId
    : [input.minute ?? "na", input.eventType ?? "event", input.playerName ?? "unknown"].join(":");
  return `${input.provider}:${input.matchId}:${providerPart}`;
}

export function boundedRaw(value: unknown): unknown {
  const text = JSON.stringify(value ?? {});
  if (text.length <= 20_000) return value ?? {};
  return { truncated: true, preview: text.slice(0, 20_000) };
}

export function providerConfigured(provider: LiveDataProviderName): boolean {
  if (provider === "api-football") return Boolean(process.env.API_FOOTBALL_KEY ?? process.env.API_FOOTBALL_API_KEY);
  return provider === "openfootball";
}
