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
import { signIn } from "../lib/auth";
import { useI18n } from "../lib/i18n";
import { SUI_NETWORKS, formatMistAsSui, type AppSuiNetwork } from "../lib/sui-network";
import { useSuiGasBalance } from "../lib/use-sui-gas-balance";
import { useVerifiedSession } from "../lib/wallet-session";
import { useWalletSessionStore } from "../lib/wallet-session-store";
import "./connect-bar.css";

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function ConnectBar() {
  const { t } = useI18n();
  const account = useCurrentAccount();
  const accounts = useAccounts();
  const suiClient = useSuiClient();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
  const { mutateAsync: switchAccount } = useSwitchAccount();
  const { mutateAsync: disconnectWallet } = useDisconnectWallet();
  const { signedIn } = useVerifiedSession();
  const setSession = useWalletSessionStore((state) => state.setSession);
  const clearSession = useWalletSessionStore((state) => state.clearSession);
  const [names, setNames] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [walletBusy, setWalletBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const gas = useSuiGasBalance(account?.address);

  const accountOptions = useMemo(() => accounts.filter((item) => item.address), [accounts]);
  const accountAddressKey = accountOptions.map((item) => item.address).join("|");
  const faucetUrl = SUI_NETWORKS[gas.network as AppSuiNetwork]?.faucetUrl ?? null;

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
    setAuthError(null);
    try {
      const session = await signIn(account.address, async (bytes) => {
        const { signature } = await signPersonalMessage({ message: bytes });
        return signature;
      });
      setSession(session);
    } catch (e) {
      console.error("[auth] sign-in failed:", e);
      setAuthError(e instanceof Error ? e.message : "sign-in failed");
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
      clearSession();
      await disconnectWallet();
    } finally {
      setWalletBusy(false);
    }
  }

  return (
    <div className="press-bar">
      <span className="press-pass">🦭 Digital Edition · sui:{gas.network} · Member Pass</span>
      <div className="press-actions">
        {!account ? (
          <ConnectButton connectText={t("wallet.connect")} />
        ) : (
          <div className="wallet-control">
            <span className={gas.hasGas ? "network-pill" : "network-pill warn"} title={gas.error ?? undefined}>
              sui:{gas.network} · {gas.loading ? "checking" : formatMistAsSui(gas.mist)}
            </span>
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
              {t("wallet.disconnect")}
            </button>
            {!gas.loading && !gas.hasGas && faucetUrl && (
              <a className="faucet-link" href={faucetUrl} target="_blank" rel="noreferrer">
                {t("wallet.faucet")}
              </a>
            )}
          </div>
        )}
        {account && !signedIn && (
          <button className="press-btn primary" onClick={doSignIn} disabled={busy}>
            {busy ? t("wallet.signing") : t("wallet.signIn")}
          </button>
        )}
        {authError && <span className="wallet-auth-error">{authError}</span>}
      </div>
    </div>
  );
}
