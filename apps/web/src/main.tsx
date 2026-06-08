import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import "./App.css";
import { Providers } from "./providers";
import { I18nProvider } from "./lib/i18n";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Providers>
      <I18nProvider>
        <App />
      </I18nProvider>
    </Providers>
  </StrictMode>,
);
