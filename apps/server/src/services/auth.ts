// Sign-in-with-Sui (Red Team #3/#4/#7): chứng minh quyền sở hữu địa chỉ Sui trước khi
// tin nó là identity. KHÔNG bao giờ nhận địa chỉ trực tiếp từ body.
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import { verifyPersonalMessageSignature } from "@mysten/sui/verify";

// Session secret: nên set env SESSION_SECRET ở prod; fallback random theo mỗi lần boot (session reset khi restart — chấp nhận cho hackathon).
const SESSION_SECRET = process.env.SESSION_SECRET ?? randomBytes(32).toString("hex");
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const NONCE_TTL_MS = 5 * 60 * 1000;

const nonces = new Map<string, { nonce: string; exp: number }>();

function signPayload(payload: string): string {
  return createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
}

function makeToken(subject: string): string {
  const payload = `${subject}.${Date.now() + SESSION_TTL_MS}`;
  return `${Buffer.from(payload).toString("base64url")}.${signPayload(payload)}`;
}

/** Trả message để user ký (personal message). */
export function issueNonce(address: string): string {
  const nonce = randomBytes(16).toString("hex");
  nonces.set(address, { nonce, exp: Date.now() + NONCE_TTL_MS });
  return `The Daily Walrus sign-in\naddress: ${address}\nnonce: ${nonce}`;
}

/** Verify chữ ký personal-message → cấp session token (subject = địa chỉ đã verify). */
export async function verifyAndIssueSession(address: string, signature: string): Promise<string | null> {
  const rec = nonces.get(address);
  if (!rec || Date.now() > rec.exp) return null;
  const message = `The Daily Walrus sign-in\naddress: ${address}\nnonce: ${rec.nonce}`;
  try {
    const pubkey = await verifyPersonalMessageSignature(new TextEncoder().encode(message), signature);
    if (pubkey.toSuiAddress() !== address) return null;
    nonces.delete(address);
    return makeToken(address);
  } catch {
    return null;
  }
}

/** token → subject (địa chỉ Sui đã verify, hoặc "guest:..."). null nếu sai/hết hạn. */
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
  if (!exp || Date.now() > exp || !subject) return null;
  return subject;
}

/** Lấy token từ header Authorization: Bearer <token>. */
export function bearer(req: { headers: Record<string, string | string[] | undefined> }): string | null {
  const h = req.headers["authorization"];
  const v = Array.isArray(h) ? h[0] : h;
  return v?.startsWith("Bearer ") ? v.slice(7) : null;
}
