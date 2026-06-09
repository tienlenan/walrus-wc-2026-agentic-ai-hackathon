import { useEffect, useMemo, useState } from "react";
import {
  ConnectButton,
  useAccounts,
  useCurrentAccount,
  useDisconnectWallet,
  useSignPersonalMessage,
  useSuiClient,
  useSwitchAccount,
} from "@mysten/dapp-kit";
import { signIn, signOut, getSession, type Session } from "../lib/auth";
import "./connect-bar.css";

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function ConnectBar() {
  const account = useCurrentAccount();
  const accounts = useAccounts();
  const suiClient = useSuiClient();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
  const { mutateAsync: switchAccount } = useSwitchAccount();
  const { mutateAsync: disconnectWallet } = useDisconnectWallet();
  const [session, setSession] = useState<Session | null>(getSession);
  const [names, setNames] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [walletBusy, setWalletBusy] = useState(false);

  const signedIn = Boolean(session && account && session.address === account.address);
  const accountOptions = useMemo(() => accounts.filter((item) => item.address), [accounts]);
  const accountAddressKey = accountOptions.map((item) => item.address).join("|");

  useEffect(() => {
    let cancelled = false;
    async function resolveNames() {
      const entries = await Promise.all(
        accountOptions.map(async (item) => {
          try {
            const result = await suiClient.resolveNameServiceNames({ address: item.address, limit: 1 });
            const name = result.data[0];
            return name ? ([item.address, name] as const) : null;
          } catch {
            return null;
          }
        }),
      );
      if (!cancelled) {
        setNames(Object.fromEntries(entries.filter((entry): entry is readonly [string, string] => Boolean(entry))));
      }
    }
    if (accountOptions.length === 0) {
      setNames({});
      return;
    }
    void resolveNames();
    return () => {
      cancelled = true;
    };
  }, [accountAddressKey, suiClient]);

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

  async function doSwitch(address: string) {
    const next = accountOptions.find((item) => item.address === address);
    if (!next || next.address === account?.address) return;
    setWalletBusy(true);
    try {
      await switchAccount({ account: next });
    } finally {
      setWalletBusy(false);
    }
  }

  async function doDisconnect() {
    setWalletBusy(true);
    try {
      signOut();
      setSession(null);
      await disconnectWallet();
    } finally {
      setWalletBusy(false);
    }
  }

  return (
    <div className="press-bar">
      <span className="press-pass">🦭 Digital Edition · Member Pass</span>
      <div className="press-actions">
        {!account ? (
          <ConnectButton connectText="Kết nối ví" />
        ) : (
          <div className="wallet-control">
            <select
              aria-label="Connected wallet"
              value={account.address}
              disabled={walletBusy}
              onChange={(event) => void doSwitch(event.target.value)}
            >
              {accountOptions.map((item) => (
                <option key={item.address} value={item.address}>
                  {names[item.address] ? `${names[item.address]} · ${shortAddress(item.address)}` : shortAddress(item.address)}
                </option>
              ))}
            </select>
            <button type="button" className="press-btn" onClick={() => void doDisconnect()} disabled={walletBusy}>
              Disconnect
            </button>
          </div>
        )}
        {account && !signedIn && (
          <button className="press-btn primary" onClick={doSignIn} disabled={busy}>
            {busy ? "Đang ký…" : "Sign in"}
          </button>
        )}
      </div>
    </div>
  );
}
