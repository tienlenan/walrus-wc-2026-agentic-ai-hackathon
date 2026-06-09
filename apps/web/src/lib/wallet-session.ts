import { useEffect, useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { getSession, subscribeSession, type Session } from "./auth";

export function useVerifiedSession(): {
  accountAddress: string | null;
  session: Session | null;
  signedIn: boolean;
} {
  const account = useCurrentAccount();
  const [session, setSession] = useState<Session | null>(() => getSession());

  useEffect(() => subscribeSession(() => setSession(getSession())), []);

  return {
    accountAddress: account?.address ?? null,
    session,
    signedIn: Boolean(account && session && session.address === account.address),
  };
}
