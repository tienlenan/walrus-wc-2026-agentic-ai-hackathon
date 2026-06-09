import { useEffect, useState } from "react";
import { useSuiClient, useSuiClientContext } from "@mysten/dapp-kit";

export type GasBalanceState = {
  network: string;
  mist: string | null;
  loading: boolean;
  error: string | null;
  hasGas: boolean;
};

export function useSuiGasBalance(address: string | null | undefined): GasBalanceState {
  const client = useSuiClient();
  const { network } = useSuiClientContext();
  const [mist, setMist] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!address) {
      setMist(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    client
      .getBalance({ owner: address })
      .then((balance) => {
        if (!cancelled) setMist(balance.totalBalance);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [address, client, network]);

  return {
    network,
    mist,
    loading,
    error,
    hasGas: mist != null && BigInt(mist) > 0n,
  };
}
