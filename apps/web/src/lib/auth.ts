// Sign-in-with-Sui ở client: lấy nonce → ký personal message → verify → lưu session token.
const KEY = "daily-walrus:session";
const BASE = import.meta.env.VITE_MASTRA_URL ?? "http://localhost:4111";

export interface Session {
  token: string;
  address: string;
}

export function getSession(): Session | null {
  try {
    const s = localStorage.getItem(KEY);
    return s ? (JSON.parse(s) as Session) : null;
  } catch {
    return null;
  }
}

export function signOut(): void {
  localStorage.removeItem(KEY);
}

/** signMessage: nhận bytes, trả signature (base64) — adapter từ dapp-kit useSignPersonalMessage. */
export async function signIn(
  address: string,
  signMessage: (bytes: Uint8Array) => Promise<string>,
): Promise<Session> {
  const nonceRes = await fetch(`${BASE}/api/auth/nonce`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address }),
  });
  if (!nonceRes.ok) throw new Error(`nonce ${nonceRes.status}`);
  const { message } = (await nonceRes.json()) as { message: string };

  const signature = await signMessage(new TextEncoder().encode(message));

  const verifyRes = await fetch(`${BASE}/api/auth/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address, signature }),
  });
  if (!verifyRes.ok) throw new Error(`verify ${verifyRes.status}`);
  const { token } = (await verifyRes.json()) as { token: string };

  const session: Session = { token, address };
  localStorage.setItem(KEY, JSON.stringify(session));
  return session;
}
