import { useEffect, useMemo, useState } from "react";
import { getRuntimeTracking, type RuntimeTracking as RuntimeTrackingDto } from "../lib/world-cup-api";
import { useI18n } from "../lib/i18n";
import "./runtime-tracking.css";

function shortId(value: string | null | undefined): string {
  if (!value) return "-";
  if (value.length <= 18) return value;
  return `${value.slice(0, 10)}...${value.slice(-6)}`;
}

function statusText(enabled: boolean, on: string, off: string): string {
  return enabled ? on : off;
}

function LinkAction({ href, label }: { href: string | null; label: string }) {
  const { t } = useI18n();
  if (!href) return <span className="tracking-muted">{t("tracking.noUrl")}</span>;
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {label}
    </a>
  );
}

export function RuntimeTracking() {
  const { t } = useI18n();
  const [tracking, setTracking] = useState<RuntimeTrackingDto | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setError(null);
      setTracking(await getRuntimeTracking());
    } catch {
      setError(t("tracking.loadErr"));
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const memory = tracking?.memory.lastSync;
  const teamMemory = tracking?.memory.teamSync;
  const closedCount = useMemo(() => {
    if (!tracking) return 0;
    return tracking.fixtures.closedFinished + tracking.fixtures.closedKickoff + tracking.fixtures.unknown;
  }, [tracking]);

  async function copy(value: string, key: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
    }
  }

  return (
    <section className="runtime-tracking">
      <div className="tracking-head">
        <div>
          <div className="tracking-kicker">{t("tracking.kicker")}</div>
          <h2>{t("tracking.title")}</h2>
        </div>
        <button type="button" onClick={() => void refresh()}>
          {t("tracking.refresh")}
        </button>
      </div>

      {tracking && (
        <>
          <div className="tracking-summary">
            <div>
              <span>{t("tracking.network")}</span>
              <strong>{tracking.network}</strong>
            </div>
            <div>
              <span>{t("tracking.memory")}</span>
              <strong>{statusText(tracking.memory.enabled, t("tracking.enabled"), t("tracking.disabled"))}</strong>
            </div>
            <div>
              <span>{t("tracking.publisher")}</span>
              <strong>{statusText(tracking.walrus.publisherConfigured, t("tracking.enabled"), t("tracking.disabled"))}</strong>
            </div>
            <div>
              <span>{t("tracking.updated")}</span>
              <strong>{new Date(tracking.updatedAt).toLocaleTimeString()}</strong>
            </div>
          </div>

          <div className="tracking-grid">
            <article className="tracking-panel">
              <h3>{t("tracking.contracts")}</h3>
              <div className="tracking-rows">
                {tracking.contracts.map((contract) => (
                  <div className="tracking-row" key={contract.key}>
                    <div>
                      <span>{contract.label}</span>
                      <strong>{shortId(contract.objectId)}</strong>
                    </div>
                    <div className="tracking-actions">
                      <button type="button" onClick={() => void copy(contract.objectId, contract.key)}>
                        {copied === contract.key ? t("common.copied") : t("tracking.copy")}
                      </button>
                      <LinkAction href={contract.url} label={t("tracking.open")} />
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="tracking-panel">
              <h3>{t("tracking.memory")}</h3>
              <div className="tracking-rows">
                <div className="tracking-row">
                  <div>
                    <span>{t("tracking.namespace")}</span>
                    <strong>{tracking.memory.globalNamespace}</strong>
                  </div>
                  <div className="tracking-actions">
                    <button type="button" onClick={() => void copy(tracking.memory.globalNamespace, "namespace")}>
                      {copied === "namespace" ? t("common.copied") : t("tracking.copy")}
                    </button>
                    <LinkAction href={tracking.memory.globalNamespaceUrl} label={t("tracking.open")} />
                  </div>
                </div>
                <div className="tracking-row">
                  <div>
                    <span>{t("tracking.status")}</span>
                    <strong>{memory?.status ?? "not_synced"}</strong>
                  </div>
                  <small>{memory?.error ?? (memory?.updatedAt ? new Date(memory.updatedAt).toLocaleString() : t("tracking.noSync"))}</small>
                </div>
                <div className="tracking-row">
                  <div>
                    <span>{t("tracking.hash")}</span>
                    <strong>{shortId(memory?.contentHash)}</strong>
                  </div>
                  {memory?.reason && <small>{memory.reason}</small>}
                </div>
                <div className="tracking-row">
                  <div>
                    <span>{t("tracking.teamMemory")}</span>
                    <strong>{teamMemory?.status ?? "not_synced"}</strong>
                  </div>
                  <small>
                    {teamMemory?.error ??
                      `${teamMemory?.memoryDocs ?? 0} ${t("tracking.docs")} · ${teamMemory?.teamCount ?? 0} ${t("tracking.teams")} · ${
                        teamMemory?.playerCount ?? 0
                      } ${t("tracking.players")}`}
                  </small>
                </div>
              </div>
            </article>

            <article className="tracking-panel">
              <h3>{t("tracking.walrus")}</h3>
              <div className="tracking-rows">
                <div className="tracking-row">
                  <span>{tracking.walrus.profileBlobs} {t("tracking.profileBlobs")}</span>
                  <strong>{tracking.walrus.outputRecords} {t("tracking.outputRecords")}</strong>
                </div>
                <div className="tracking-row">
                  <div>
                    <span>{t("tracking.globalBlob")}</span>
                    <strong>{shortId(memory?.walrusBlobId)}</strong>
                  </div>
                  <LinkAction href={tracking.walrus.globalScheduleBlobUrl} label={t("tracking.open")} />
                </div>
                <div className="tracking-row">
                  <div>
                    <span>{t("tracking.globalObject")}</span>
                    <strong>{shortId(memory?.walrusObjectId)}</strong>
                  </div>
                  <LinkAction href={tracking.walrus.globalScheduleObjectUrl} label={t("tracking.open")} />
                </div>
              </div>
            </article>

            <article className="tracking-panel">
              <h3>{t("tracking.fixtures")}</h3>
              <div className="tracking-metrics">
                <div>
                  <strong>{tracking.fixtures.total}</strong>
                  <span>{t("tracking.total")}</span>
                </div>
                <div>
                  <strong>{tracking.fixtures.registered}</strong>
                  <span>{t("tracking.registered")}</span>
                </div>
                <div>
                  <strong>{tracking.fixtures.open}</strong>
                  <span>{t("tracking.openMatches")}</span>
                </div>
                <div>
                  <strong>{tracking.fixtures.notOnchain}</strong>
                  <span>{t("tracking.notOnchain")}</span>
                </div>
                <div>
                  <strong>{closedCount}</strong>
                  <span>{t("tracking.closed")}</span>
                </div>
                <div>
                  <strong>{tracking.fixtures.finished}</strong>
                  <span>{t("tracking.finished")}</span>
                </div>
              </div>
            </article>

            <article className="tracking-panel tracking-sources">
              <h3>{t("tracking.sources")}</h3>
              <a href={tracking.sources.fifaScheduleUrl} target="_blank" rel="noreferrer">
                FIFA schedule
              </a>
              <a href={tracking.sources.crawlableScheduleUrl} target="_blank" rel="noreferrer">
                Crawlable schedule
              </a>
              <a href={tracking.sources.squadSourceUrl} target="_blank" rel="noreferrer">
                Official squad PDF
              </a>
            </article>
          </div>
        </>
      )}

      {error && <div className="tracking-error">{error}</div>}
    </section>
  );
}
