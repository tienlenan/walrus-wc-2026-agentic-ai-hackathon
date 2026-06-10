// Client-side Sign-in-with-Sui: fetch nonce, sign personal message, verify, then store session token.
const KEY = "daily-walrus:session";
const SESSION_EVENT = "daily-walrus:session-changed";
const BASE = import.meta.env.VITE_MASTRA_URL ?? "http://localhost:4111";

export interface Session {
  token: string;
  address: string;
}

export function normalizeSuiAddress(address: string | null | undefined): string | null {
  const value = address?.trim().toLowerCase();
  return value?.startsWith("0x") ? value : null;
}

export function getSession(): Session | null {
  try {
    const s = localStorage.getItem(KEY);
    if (!s) return null;
    const parsed = JSON.parse(s) as Partial<Session>;
    const address = normalizeSuiAddress(parsed.address);
    return parsed.token && address ? { token: parsed.token, address } : null;
  } catch {
    return null;
  }
}

export function signOut(): void {
  localStorage.removeItem(KEY);
  notifySessionChanged();
}

export function notifySessionChanged(): void {
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function subscribeSession(listener: () => void): () => void {
  window.addEventListener(SESSION_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(SESSION_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

/** Adapter for dapp-kit useSignPersonalMessage. */
export async function signIn(
  address: string,
  signMessage: (bytes: Uint8Array) => Promise<string>,
): Promise<Session> {
  const normalizedAddress = normalizeSuiAddress(address);
  if (!normalizedAddress) throw new Error("address required");

  const nonceRes = await fetch(`${BASE}/api/auth/nonce`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address: normalizedAddress }),
  });
  if (!nonceRes.ok) throw new Error(`nonce ${nonceRes.status}`);
  const { message } = (await nonceRes.json()) as { message: string };

  const signature = await signMessage(new TextEncoder().encode(message));

  const verifyRes = await fetch(`${BASE}/api/auth/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address: normalizedAddress, signature }),
  });
  if (!verifyRes.ok) throw new Error(`verify ${verifyRes.status}`);
  const { token } = (await verifyRes.json()) as { token: string };

  const session: Session = { token, address: normalizedAddress };
  localStorage.setItem(KEY, JSON.stringify(session));
  notifySessionChanged();
  return session;
}
