import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SuiClientProvider, WalletProvider, createNetworkConfig } from "@mysten/dapp-kit";
import "@mysten/dapp-kit/dist/index.css";
import { APP_SUI_NETWORK, SUI_NETWORKS } from "./lib/sui-network";

const { networkConfig } = createNetworkConfig({
  testnet: { url: SUI_NETWORKS.testnet.rpcUrl, network: "testnet" },
  mainnet: { url: SUI_NETWORKS.mainnet.rpcUrl, network: "mainnet" },
});
const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork={APP_SUI_NETWORK}>
        <WalletProvider autoConnect>{children}</WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
