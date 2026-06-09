import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import "./App.css";
import { Providers } from "./providers";
import { I18nProvider } from "./lib/i18n";
import { TimeProvider } from "./lib/time-settings";
import App from "./App";

const root = createRoot(document.getElementById("root")!);

root.render(
  <StrictMode>
    <Providers>
      <I18nProvider>
        <TimeProvider>
          <App />
        </TimeProvider>
      </I18nProvider>
    </Providers>
  </StrictMode>,
);
