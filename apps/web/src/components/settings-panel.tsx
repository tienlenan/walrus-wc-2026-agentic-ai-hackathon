import { useState } from "react";
import { useI18n } from "../lib/i18n";
import { loadAiSettings, saveAiSettings, type AiSettings } from "../lib/ai-settings";
import { useTimeSettings, type TimeZoneSetting } from "../lib/time-settings";
import "../styles/ui-controls.css";

/** AI settings modal: language, roast severity, and custom instructions for Gil. */
export function SettingsPanel({ onClose }: { onClose: () => void }) {
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
          <h3>{t("set.title")}</h3>
          <button className="settings-x" onClick={onClose} aria-label={t("set.close")}>
            ✕
          </button>
        </div>

        <label className="settings-field">
          <span>{t("set.aiLang")}</span>
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
          <span>{t("set.severity")}</span>
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

        <label className="settings-field">
          <span>{t("set.timezone")}</span>
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

        <label className="settings-field">
          <span>{t("set.instr")}</span>
          <textarea
            rows={4}
            value={s.instructions}
            placeholder={t("set.instrPh")}
            onChange={(e) => setS({ ...s, instructions: e.target.value })}
          />
        </label>

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
