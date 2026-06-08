import { useState } from "react";
import { NewsDeskChat } from "./components/news-desk-chat";
import { ConnectBar } from "./components/connect-bar";
import { SettingsPanel } from "./components/settings-panel";
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

  const sections = [
    { k: t("sec.pred.k"), b: t("sec.pred.b") },
    { k: t("sec.board.k"), b: t("sec.board.b") },
    { k: t("sec.ba.k"), b: t("sec.ba.b") },
    { k: t("sec.note.k"), b: t("sec.note.b") },
  ];

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
        <button className="settings-btn" onClick={() => setSettingsOpen(true)}>
          ⚙ {t("set.open")}
        </button>
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

      <div className="ai-tip">
        {t("set.tip")}{" "}
        <button className="ai-tip-link" onClick={() => setSettingsOpen(true)}>
          {t("set.open")}
        </button>
      </div>

      <main className="lead-block">
        <div className="kicker">{t("lead.kicker")}</div>
        <h2 className="headline">{t("lead.headline")}</h2>
        <p className="lede">
          <span className="dropcap">{t("lead.lede").charAt(0)}</span>
          {t("lead.lede").slice(1)}
        </p>
      </main>

      <NewsDeskChat />

      <section className="sections">
        {sections.map((s) => (
          <div className="section-card" key={s.k}>
            <div className="section-kicker">{s.k}</div>
            <p className="section-blurb">{s.b}</p>
            <div className="soon">{t("sec.soon")}</div>
          </div>
        ))}
      </section>

      <footer className="footer">
        <span className="stamp">{t("footer.stamp")}</span>
        <span className="footer-text">{t("footer.text")}</span>
      </footer>

      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
