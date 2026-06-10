import { useState } from "react";
import { useI18n } from "../lib/i18n";
import { loadAiSettings, saveAiSettings, type AiSettings } from "../lib/ai-settings";
import { useTimeSettings, type TimeZoneSetting } from "../lib/time-settings";
import "../styles/ui-controls.css";

const SEVERITY_PREVIEW: Record<AiSettings["roastSeverity"], string> = {
  light: "/gallery/cartoon-messi-walking-chess.svg",
  standard: "/gallery/cartoon-walrus-better-than-idols.svg",
  savage: "/gallery/cartoon-ronaldo-airmail.svg",
};

/** AI settings modal: language, roast severity, timezone, and custom instructions for Gil. */
export function SettingsPanel({ onClose, onboarding = false }: { onClose: () => void; onboarding?: boolean }) {
  const { t } = useI18n();
  const { selectedTimeZone, effectiveTimeZone, timeZoneOptions, setSelectedTimeZone } = useTimeSettings();
  const [s, setS] = useState<AiSettings>(() => loadAiSettings());
  const [tz, setTz] = useState<TimeZoneSetting>(selectedTimeZone);
  const [saved, setSaved] = useState(false);

  function save() {
    saveAiSettings(s);
    setSelectedTimeZone(tz);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="settings-overlay" onClick={onClose} role="presentation">
      <div className="settings-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="settings-head">
          <div>
            <span>{onboarding ? t("onboarding.kicker") : t("set.kicker")}</span>
            <h3>{t("set.title")}</h3>
          </div>
          <button className="settings-x" onClick={onClose} aria-label={t("set.close")}>
            ✕
          </button>
        </div>

        <div className="settings-body">
          <aside className="settings-side">
            {onboarding && (
              <div className="settings-onboarding">
                <span>{t("onboarding.kicker")}</span>
                <strong>{t("onboarding.title")}</strong>
                <p>{t("onboarding.copy")}</p>
                <ul>
                  <li>{t("onboarding.lang")}</li>
                  <li>{t("onboarding.timezone")}</li>
                  <li>{t("onboarding.prompt")}</li>
                </ul>
              </div>
            )}

            <figure className="settings-roast-preview">
              <img src={SEVERITY_PREVIEW[s.roastSeverity]} alt="" />
              <figcaption>
                <span>{t("set.previewKicker")}</span>
                <strong>{t(`set.preview.${s.roastSeverity}`)}</strong>
              </figcaption>
            </figure>
          </aside>

          <div className="settings-form-grid">
            <label className="settings-field">
              <span>
                <IconBadge label="文" />
                {t("set.aiLang")}
              </span>
              <select
                value={s.aiLang}
                onChange={(e) => setS({ ...s, aiLang: e.target.value as AiSettings["aiLang"] })}
              >
                <option value="auto">{t("set.auto")}</option>
                <option value="vi">{t("set.vi")}</option>
                <option value="en">{t("set.en")}</option>
              </select>
            </label>

            <label className="settings-field">
              <span>
                <IconBadge label="!" />
                {t("set.severity")}
              </span>
              <select
                value={s.roastSeverity}
                onChange={(e) =>
                  setS({
                    ...s,
                    roastSeverity: e.target.value as AiSettings["roastSeverity"],
                  })
                }
              >
                <option value="light">{t("set.sevLight")}</option>
                <option value="standard">{t("set.sevStandard")}</option>
                <option value="savage">{t("set.sevSavage")}</option>
              </select>
            </label>

            <label className="settings-field settings-field-wide">
              <span>
                <IconBadge label="TZ" />
                {t("set.timezone")}
              </span>
              <select value={tz} onChange={(e) => setTz(e.target.value as TimeZoneSetting)}>
                <option value="auto">{t("set.timezoneAuto").replace("{timezone}", effectiveTimeZone)}</option>
                {timeZoneOptions.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </select>
              <small>{t("set.timezoneHelp")}</small>
            </label>

            <label className="settings-field settings-field-wide">
              <span>
                <IconBadge label="✎" />
                {t("set.instr")}
              </span>
              <textarea
                rows={4}
                value={s.instructions}
                placeholder={t("set.instrPh")}
                onChange={(e) => setS({ ...s, instructions: e.target.value })}
              />
            </label>
          </div>
        </div>

        <div className="settings-actions">
          <button className="settings-save" onClick={save}>
            {saved ? t("set.saved") : t("set.save")}
          </button>
          <button className="settings-close" onClick={onClose}>
            {t("set.close")}
          </button>
        </div>
      </div>
    </div>
  );
}

function IconBadge({ label }: { label: string }) {
  return (
    <i className="settings-icon" aria-hidden="true">
      {label}
    </i>
  );
}
