import { useCurrentAccount } from "@mysten/dapp-kit";
import { normalizeSuiAddress, type Session } from "./auth";
import { ensureWalletSessionStoreSubscription, useWalletSessionStore } from "./wallet-session-store";

ensureWalletSessionStoreSubscription();

export function useVerifiedSession(): {
  accountAddress: string | null;
  session: Session | null;
  signedIn: boolean;
} {
  const account = useCurrentAccount();
  const session = useWalletSessionStore((state) => state.session);
  const accountAddress = normalizeSuiAddress(account?.address);

  return {
    accountAddress,
    session,
    signedIn: Boolean(accountAddress && session?.token && session.address === accountAddress),
  };
}
