import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./styles/fonts.css";
import "./styles/tokens.css";
import "./App.css";
import { I18nProvider } from "./lib/i18n";
import { TimeProvider } from "./lib/time-settings";
import { BootSplash } from "./components/boot-splash";
import App from "./App";

// Wallet + query providers carry @mysten/dapp-kit (~450 kB) — lazy so the entry
// chunk stays small; the splash covers the chunk fetch.
const AppProviders = lazy(() => import("./app-providers"));

const root = createRoot(document.getElementById("root")!);

root.render(
  <StrictMode>
    <I18nProvider>
      <TimeProvider>
        <Suspense fallback={<BootSplash line="Walrus is laminating the shame receipts." />}>
          <AppProviders>
            <App />
          </AppProviders>
        </Suspense>
      </TimeProvider>
    </I18nProvider>
  </StrictMode>,
);
