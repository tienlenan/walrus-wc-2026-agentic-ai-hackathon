import { useState } from "react";
import { NewsDeskChat } from "./components/news-desk-chat";
import { ConnectBar } from "./components/connect-bar";
import { SettingsPanel } from "./components/settings-panel";
import { PredictionsDesk } from "./components/predictions-desk";
import { Leaderboard } from "./components/leaderboard";
import { TeamProfiles } from "./components/team-profiles";
import { RoastWall } from "./components/roast-wall";
import { GalleryWall } from "./components/gallery-wall";
import { MemoryNotebook } from "./components/memory-notebook";
import { RuntimeTracking } from "./components/runtime-tracking";
import { useI18n } from "./lib/i18n";
import "./styles/ui-controls.css";

export default function App() {
  const { t, lang, setLang } = useI18n();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const date = new Date().toLocaleDateString(lang === "en" ? "en-US" : "vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="paper">
      <ConnectBar />

      <div className="utility-bar">
        <div className="lang-toggle" role="group" aria-label={t("ui.langLabel")}>
          <button className={lang === "vi" ? "on" : ""} onClick={() => setLang("vi")}>
            VI
          </button>
          <button className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>
            EN
          </button>
        </div>
      </div>

      <header className="masthead">
        <div className="eyebrow">{t("brand.eyebrow")}</div>
        <h1 className="nameplate">The Daily Walrus</h1>
        <div className="tagline">{t("brand.tagline")}</div>
        <div className="dateline">
          <span>{t("brand.est")}</span>
          <span>{date}</span>
          <span>{t("brand.edition")}</span>
        </div>
      </header>

      <main className="lead-block">
        <div className="kicker">{t("lead.kicker")}</div>
        <h2 className="headline">{t("lead.headline")}</h2>
        <p className="lede">
          <span className="dropcap">{t("lead.lede").charAt(0)}</span>
          {t("lead.lede").slice(1)}
        </p>
      </main>

      <nav className="edition-nav" aria-label="Edition sections">
        <a href="#newsroom">{t("nav.gil")}</a>
        <a href="#predictions">{t("nav.predictions")}</a>
        <a href="#leaderboard">{t("nav.leaderboard")}</a>
        <a href="#team-profiles">{t("nav.teams")}</a>
        <a href="#roasts">{t("nav.roasts")}</a>
        <a href="#gallery">{t("nav.gallery")}</a>
        <a href="#notebook">{t("nav.notebook")}</a>
        <a href="#tracking">{t("nav.tracking")}</a>
      </nav>

      <div id="newsroom" className="section-anchor">
        <NewsDeskChat onOpenSettings={() => setSettingsOpen(true)} />
      </div>
      <div id="predictions" className="section-anchor">
        <PredictionsDesk />
      </div>
      <div id="leaderboard" className="section-anchor">
        <Leaderboard />
      </div>
      <div id="team-profiles" className="section-anchor">
        <TeamProfiles />
      </div>
      <div id="roasts" className="section-anchor">
        <RoastWall />
      </div>
      <div id="gallery" className="section-anchor">
        <GalleryWall />
      </div>
      <div id="notebook" className="section-anchor">
        <MemoryNotebook />
      </div>
      <div id="tracking" className="section-anchor">
        <RuntimeTracking />
      </div>

      <footer className="footer">
        <span className="stamp">{t("footer.stamp")}</span>
        <span className="footer-text">{t("footer.text")}</span>
      </footer>

      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
