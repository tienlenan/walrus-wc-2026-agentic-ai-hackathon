import { useI18n } from "../lib/i18n";
import "./guide-page.css";

const GUIDE_STEPS = ["wallet", "settings", "chat", "predictions", "briefings", "proof"] as const;

export function GuidePage() {
  const { t } = useI18n();
  return (
    <section className="guide-page">
      <div className="guide-hero">
        <div>
          <span>{t("guide.kicker")}</span>
          <h2>{t("guide.title")}</h2>
          <p>{t("guide.copy")}</p>
        </div>
        <a href="#newsroom">{t("guide.start")}</a>
      </div>

      <div className="guide-grid">
        {GUIDE_STEPS.map((step, index) => (
          <article className="guide-card" key={step}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <h3>{t(`guide.${step}.title`)}</h3>
            <p>{t(`guide.${step}.copy`)}</p>
          </article>
        ))}
      </div>

      <div className="guide-note">
        <strong>{t("guide.note.title")}</strong>
        <p>{t("guide.note.copy")}</p>
      </div>
    </section>
  );
}
