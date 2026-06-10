// Heavy provider stack (react-query + Sui wallet). Loaded lazily from main.tsx so
// @mysten/dapp-kit and @tanstack/react-query stay out of the entry chunk; the boot
// splash covers the load. Must stay the ancestor of every dapp-kit hook consumer.
import type { ReactNode } from "react";
import { Providers } from "./providers";
import { WalletProviders } from "./wallet-providers";

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <WalletProviders>{children}</WalletProviders>
    </Providers>
  );
}
