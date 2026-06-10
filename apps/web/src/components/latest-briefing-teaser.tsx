import { useEffect, useState } from "react";
import { getLatestBriefing, type DailyBriefing } from "../lib/briefings-api";
import { useI18n } from "../lib/i18n";
import { useTimeSettings } from "../lib/time-settings";
import "./daily-briefings.css";

function shortId(value: string | null | undefined): string {
  if (!value) return "-";
  if (value.length <= 18) return value;
  return `${value.slice(0, 10)}...${value.slice(-6)}`;
}

export function LatestBriefingTeaser() {
  const { t } = useI18n();
  const { formatDate } = useTimeSettings();
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);

  useEffect(() => {
    let cancelled = false;
    getLatestBriefing()
      .then((next) => {
        if (!cancelled) setBriefing(next);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!briefing) return null;

  return (
    <section className="briefing-teaser">
      <div>
        <span>{t("briefings.latest")}</span>
        <h3>{briefing.title}</h3>
        <p>{briefing.summary}</p>
      </div>
      <div className="briefing-teaser-proof">
        <span>{formatDate(`${briefing.briefingDate}T00:00:00.000Z`)}</span>
        <strong>{shortId(briefing.proof.contentHash)}</strong>
        <a href="#briefings">{t("briefings.open")}</a>
      </div>
    </section>
  );
}
