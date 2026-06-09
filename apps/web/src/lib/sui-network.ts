export type AppSuiNetwork = "testnet" | "mainnet";

export const APP_SUI_NETWORK: AppSuiNetwork =
  import.meta.env.VITE_SUI_NETWORK === "mainnet" || import.meta.env.VITE_SUI_NETWORK === "testnet"
    ? import.meta.env.VITE_SUI_NETWORK
    : "testnet";

export const SUI_NETWORKS: Record<AppSuiNetwork, { rpcUrl: string; faucetUrl: string | null }> = {
  testnet: {
    rpcUrl: "https://fullnode.testnet.sui.io:443",
    faucetUrl: "https://faucet.sui.io/?network=testnet",
  },
  mainnet: {
    rpcUrl: "https://fullnode.mainnet.sui.io:443",
    faucetUrl: null,
  },
};

export function formatMistAsSui(mist: string | bigint | null): string {
  if (mist == null) return "checking";
  const value = typeof mist === "bigint" ? mist : BigInt(mist);
  const whole = value / 1_000_000_000n;
  const fractional = (value % 1_000_000_000n).toString().padStart(9, "0").slice(0, 4).replace(/0+$/, "");
  return fractional ? `${whole}.${fractional} SUI` : `${whole} SUI`;
}
