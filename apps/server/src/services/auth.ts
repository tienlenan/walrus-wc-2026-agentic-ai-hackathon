// Sign-in-with-Sui: prove ownership of the Sui address before using it as identity.
// Never trust an address submitted directly in the request body.
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import { verifyPersonalMessageSignature } from "@mysten/sui/verify";

const SESSION_SECRET =
  process.env.SESSION_SECRET ??
  process.env.AUTH_SECRET ??
  "daily-walrus-session-secret-configure-SESSION_SECRET-for-production";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const NONCE_TTL_MS = 5 * 60 * 1000;

const nonces = new Map<string, { nonce: string; exp: number }>();

if (!process.env.SESSION_SECRET && !process.env.AUTH_SECRET && process.env.NODE_ENV === "production") {
  console.warn("[auth] SESSION_SECRET is not configured; using deterministic fallback for session stability.");
}

function normalizeSuiAddress(address: string | null | undefined): string | null {
  const value = address?.trim().toLowerCase();
  return value?.startsWith("0x") ? value : null;
}

function signPayload(payload: string): string {
  return createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
}

function makeToken(subject: string): string {
  const payload = `${subject}.${Date.now() + SESSION_TTL_MS}`;
  return `${Buffer.from(payload).toString("base64url")}.${signPayload(payload)}`;
}

/** Return the personal-message payload that the user signs. */
export function issueNonce(address: string): string {
  const subject = normalizeSuiAddress(address);
  if (!subject) throw new Error("address required");
  const nonce = randomBytes(16).toString("hex");
  nonces.set(subject, { nonce, exp: Date.now() + NONCE_TTL_MS });
  return `The Daily Walrus sign-in\naddress: ${subject}\nnonce: ${nonce}`;
}

/** Verify the personal-message signature and issue a session token for the verified address. */
export async function verifyAndIssueSession(address: string, signature: string): Promise<string | null> {
  const subject = normalizeSuiAddress(address);
  if (!subject) return null;
  const rec = nonces.get(subject);
  if (!rec || Date.now() > rec.exp) return null;
  const message = `The Daily Walrus sign-in\naddress: ${subject}\nnonce: ${rec.nonce}`;
  try {
    const pubkey = await verifyPersonalMessageSignature(new TextEncoder().encode(message), signature);
    if (normalizeSuiAddress(pubkey.toSuiAddress()) !== subject) return null;
    nonces.delete(subject);
    return makeToken(subject);
  } catch {
    return null;
  }
}

/** Convert a token to a verified Sui address, or null when invalid/expired. */
export function verifySession(token?: string | null): string | null {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const payload = Buffer.from(body, "base64url").toString();
  const expected = signPayload(payload);
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;
  const last = payload.lastIndexOf(".");
  const subject = payload.slice(0, last);
  const exp = Number(payload.slice(last + 1));
  const address = normalizeSuiAddress(subject);
  if (!exp || Date.now() > exp || !address) return null;
  return address;
}

/** Extract the token from Authorization: Bearer <token>. */
export function bearer(req: { headers: Record<string, string | string[] | undefined> }): string | null {
  const h = req.headers["authorization"];
  const v = Array.isArray(h) ? h[0] : h;
  return v?.startsWith("Bearer ") ? v.slice(7) : null;
}
