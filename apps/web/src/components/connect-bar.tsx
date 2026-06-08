import { useState } from "react";
import { ConnectButton, useCurrentAccount, useSignPersonalMessage } from "@mysten/dapp-kit";
import { signIn, getSession, signOut, type Session } from "../lib/auth";
import "./connect-bar.css";

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export function ConnectBar() {
  const account = useCurrentAccount();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
  const [session, setSession] = useState<Session | null>(getSession);
  const [busy, setBusy] = useState(false);

  const signedIn = Boolean(session && account && session.address === account.address);

  async function doSignIn() {
    if (!account) return;
    setBusy(true);
    try {
      const s = await signIn(account.address, async (bytes) => {
        const { signature } = await signPersonalMessage({ message: bytes });
        return signature;
      });
      setSession(s);
    } catch (e) {
      console.error("[auth] sign-in failed:", e);
    } finally {
      setBusy(false);
    }
  }

  function doSignOut() {
    signOut();
    setSession(null);
  }

  return (
    <div className="press-bar">
      <span className="press-pass">🦭 Digital Edition · Member Pass</span>
      <div className="press-actions">
        <ConnectButton connectText="Kết nối ví" />
        {account && !signedIn && (
          <button className="press-btn primary" onClick={doSignIn} disabled={busy}>
            {busy ? "Đang ký…" : "Sign in"}
          </button>
        )}
        {signedIn && account && (
          <span className="press-signed">
            ✓ {short(account.address)}
            <span className="press-link" role="button" tabIndex={0} onClick={doSignOut}>
              thoát
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
