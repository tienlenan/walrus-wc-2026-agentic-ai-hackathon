import { useEffect, useState } from "react";
import { Streamdown } from "streamdown";
import { getLatestBriefing, listBriefings, type DailyBriefing } from "../lib/briefings-api";
import { useI18n } from "../lib/i18n";
import { useTimeSettings } from "../lib/time-settings";
import "streamdown/styles.css";
import "./daily-briefings.css";

function shortId(value: string | null | undefined): string {
  if (!value) return "-";
  if (value.length <= 18) return value;
  return `${value.slice(0, 10)}...${value.slice(-6)}`;
}

function ProofLink({ href, label }: { href: string | null; label: string }) {
  const { t } = useI18n();
  if (!href) return <span className="briefing-muted">{t("briefings.noProof")}</span>;
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {label}
    </a>
  );
}

function ProofStrip({ briefing }: { briefing: DailyBriefing }) {
  const { t } = useI18n();
  return (
    <div className="briefing-proof-strip">
      <div>
        <span>{t("briefings.hash")}</span>
        <strong>{shortId(briefing.proof.contentHash)}</strong>
      </div>
      <div>
        <span>{t("briefings.blob")}</span>
        <strong>{shortId(briefing.proof.walrusBlobId)}</strong>
        <ProofLink href={briefing.proof.walrusBlobUrl} label={t("tracking.open")} />
      </div>
      <div>
        <span>{t("briefings.memory")}</span>
        <strong>{briefing.proof.memoryStatus}</strong>
      </div>
      <div>
        <span>{t("briefings.sui")}</span>
        <strong>{shortId(briefing.proof.outputTxDigest)}</strong>
      </div>
    </div>
  );
}

function SourceList({ briefing }: { briefing: DailyBriefing }) {
  const { t } = useI18n();
  return (
    <div className="briefing-side-panel">
      <h3>{t("briefings.sources")}</h3>
      <div className="briefing-sources">
        {briefing.sources.map((source) => (
          <div className="briefing-source" key={source.sourceId}>
            <div>
              <span>{source.sourceId}</span>
              <strong>{source.title}</strong>
            </div>
            {source.url ? (
              <a href={source.url} target="_blank" rel="noreferrer">
                {t("tracking.open")}
              </a>
            ) : (
              <span className="briefing-muted">{source.kind}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AgentTrace({ briefing }: { briefing: DailyBriefing }) {
  const { t } = useI18n();
  return (
    <details className="briefing-trace">
      <summary>{t("briefings.trace")}</summary>
      <div className="briefing-trace-steps">
        {briefing.agentTrace.map((step, index) => (
          <div className="briefing-trace-step" key={`${step.agent}-${index}`}>
            <span>{index + 1}</span>
            <div>
              <strong>{step.agent}</strong>
              <p>{step.summary}</p>
            </div>
            <em>{step.status}</em>
          </div>
        ))}
      </div>
    </details>
  );
}

export function DailyBriefings() {
  const { t } = useI18n();
  const { formatDate, formatDateTime } = useTimeSettings();
  const [latest, setLatest] = useState<DailyBriefing | null>(null);
  const [history, setHistory] = useState<DailyBriefing[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [nextLatest, nextHistory] = await Promise.all([getLatestBriefing(), listBriefings(14)]);
        if (!cancelled) {
          setLatest(nextLatest);
          setHistory(nextHistory);
          setSelectedId((current) => current ?? nextLatest?.id ?? null);
        }
      } catch {
        if (!cancelled) setError(t("briefings.loadErr"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const selected = history.find((item) => item.id === selectedId) ?? latest;

  return (
    <section className="daily-briefings">
      <div className="briefing-head">
        <div>
          <div className="briefing-kicker">{t("briefings.kicker")}</div>
          <h2>{t("briefings.title")}</h2>
          <p>{t("briefings.copy")}</p>
        </div>
        <a href="#newsroom">{t("reference.back")}</a>
      </div>

      {loading && <div className="briefing-empty">{t("common.loading")}</div>}
      {error && <div className="briefing-error">{error}</div>}
      {!loading && !error && !selected && <div className="briefing-empty">{t("briefings.empty")}</div>}

      {selected && (
        <div className="briefing-layout">
          <article className="briefing-article">
            <div className="briefing-meta">
              <span>{formatDate(`${selected.briefingDate}T00:00:00.000Z`)}</span>
              <span>{selected.status}</span>
              {selected.publishedAt && <span>{formatDateTime(selected.publishedAt)}</span>}
            </div>
            <Streamdown>{selected.markdown}</Streamdown>
            <ProofStrip briefing={selected} />
            <AgentTrace briefing={selected} />
          </article>

          <aside className="briefing-sidebar">
            <div className="briefing-side-panel">
              <h3>{t("briefings.history")}</h3>
              <div className="briefing-history">
                {history.map((item) => (
                  <button key={item.id} className={item.id === selected.id ? "selected" : ""} onClick={() => setSelectedId(item.id)}>
                    <span>{item.briefingDate}</span>
                    <strong>{item.title}</strong>
                  </button>
                ))}
              </div>
            </div>
            <SourceList briefing={selected} />
          </aside>
        </div>
      )}
    </section>
  );
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
