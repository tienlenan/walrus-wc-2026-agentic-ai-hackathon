import type { FixtureQueryInput } from "./chat-render-parts.js";

export type UserActionIntent =
  | "my_predictions"
  | "my_roasts"
  | "my_votes"
  | "my_proofs"
  | "my_actions"
  | "my_record";

export function normalizeText(value: string): string {
  return value
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d");
}

function hasSelfReference(text: string): boolean {
  return /\b(my|mine|me|i|toi|tui|minh|cua toi|cua minh|da lam|da)\b/.test(text);
}

export function inferUserActionIntent(text: string): UserActionIntent | null {
  if (!hasSelfReference(text)) return null;
  if (/\b(activity|activities|actions|history|timeline|dapp actions|what did i do|toi da lam gi|toi lam gi|hanh dong|lich su)\b/.test(text)) {
    return "my_actions";
  }
  if (/\b(receipt|receipts|proof|proofs|sui record|sui records|outputrecord|object|blob|hash|bien lai|bang chung|chung minh)\b/.test(text)) {
    return "my_proofs";
  }
  if (/\b(roast|roasts|troll|ca khia|cau khia|cham biem)\b/.test(text)) {
    return "my_roasts";
  }
  if (/\b(vote|votes|voted|mvp|worst player|worst|cau thu te|te nhat|binh chon)\b/.test(text)) {
    return "my_votes";
  }
  if (/\b(record|score|points|streak|accuracy|rank|leaderboard|diem|chuoi|do chinh xac|thanh tich)\b/.test(text)) {
    return "my_record";
  }
  if (/\b(prediction|predictions|pick|picked|predict|predicted|du doan|chon keo|keo)\b/.test(text)) {
    return "my_predictions";
  }
  return null;
}

export function isFixtureIntent(text: string): boolean {
  return /\b(schedule|fixture|fixtures|match|matches|today|tomorrow|date|group|playing|plays|open|gate|prediction)\b/.test(text)
    || /\b(lich|tran|bang|keo|du doan|da voi ai|gap ai)\b/.test(text);
}

export function isProfileIntent(text: string): boolean {
  return /\b(profile|squad|coach|players|team profile|national profile|roster)\b/.test(text)
    || /\b(ho so|doi hinh|hlv|cau thu)\b/.test(text);
}

export function inferGroup(text: string): string | undefined {
  const match = text.match(/\b(?:group|bang)\s*([a-l])\b/) ?? text.match(/\bgroup\s+([a-l])\b/);
  return match?.[1]?.toUpperCase();
}

export function inferDate(text: string): string | undefined {
  const iso = text.match(/\b(2026-\d{2}-\d{2})\b/);
  if (iso?.[1]) return iso[1];
  const today = new Date();
  if (/\b(today|hom nay)\b/.test(text)) return today.toISOString().slice(0, 10);
  if (/\b(tomorrow|ngay mai)\b/.test(text)) {
    today.setUTCDate(today.getUTCDate() + 1);
    return today.toISOString().slice(0, 10);
  }
  const month = text.match(/\b(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july)\s+(\d{1,2})\b/);
  if (!month?.[1] || !month[2]) return undefined;
  const parsed = new Date(`${month[1]} ${month[2]}, 2026 00:00:00 UTC`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString().slice(0, 10);
}

export function inferStatus(text: string): FixtureQueryInput["status"] | undefined {
  if (/\b(finished|settled|done|da xong|xong)\b/.test(text)) return "finished";
  if (/\b(live|dang da)\b/.test(text)) return "live";
  if (/\b(upcoming|scheduled|chua da|sap toi)\b/.test(text)) return "scheduled";
  return undefined;
}

export function inferPrediction(text: string): FixtureQueryInput["prediction"] | undefined {
  if (/\b(not onchain|not_onchain|chua onchain)\b/.test(text)) return "not_onchain";
  if (/\b(open|mo keo|con mo|dang mo)\b/.test(text)) return "open";
  if (/\b(closed|close|khoa|dong)\b/.test(text)) return "closed";
  return undefined;
}
