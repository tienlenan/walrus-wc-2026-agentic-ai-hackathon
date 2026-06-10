import { useEffect, useMemo, useState } from "react";
import { getLiveMatch, listLiveMatches, type LiveMatchDetail, type MatchEvent, type PlayerAvailability } from "../lib/live-match-api";
import { useTimeSettings } from "../lib/time-settings";
import { useI18n } from "../lib/i18n";
import { LineupPitch } from "./lineup-pitch";
import "./match-center.css";

function hashMatchId(): string | null {
  const [, query = ""] = window.location.hash.split("?");
  return new URLSearchParams(query).get("matchId");
}

function score(match: LiveMatchDetail): string {
  const home = match.live?.homeScore ?? match.fixture.homeScore;
  const away = match.live?.awayScore ?? match.fixture.awayScore;
  return home == null || away == null ? "vs" : `${home} - ${away}`;
}

function eventLabel(event: MatchEvent): string {
  const minute = event.minute == null ? "" : `${event.minute}${event.extraMinute ? `+${event.extraMinute}` : ""}' `;
  const player = event.playerName ? `${event.playerName} ` : "";
  const detail = event.detail ? `(${event.detail})` : "";
  return `${minute}${event.eventType} ${player}${detail}`.trim();
}

function availabilityLabel(item: PlayerAvailability): string {
  return [item.playerName, item.status, item.reason ?? item.note].filter(Boolean).join(" · ");
}

export function MatchCenter() {
  const { t } = useI18n();
  const { formatDateTime } = useTimeSettings();
  const [matches, setMatches] = useState<LiveMatchDetail[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(() => hashMatchId());
  const [selected, setSelected] = useState<LiveMatchDetail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const next = await listLiveMatches(18);
      setMatches(next);
      const id = selectedId ?? hashMatchId() ?? next[0]?.fixture.matchId ?? null;
      setSelectedId(id);
      setSelected(id ? await getLiveMatch(id) : next[0] ?? null);
    } catch {
      setError(t("matches.loadErr"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 60_000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    void getLiveMatch(selectedId)
      .then((match) => {
        if (!cancelled) setSelected(match);
      })
      .catch(() => {
        if (!cancelled) setError(t("matches.loadErr"));
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, t]);

  const grouped = useMemo(() => {
    const live = matches.filter((match) => (match.live?.status ?? match.fixture.status) === "live");
    const upcoming = matches.filter((match) => (match.live?.status ?? match.fixture.status) === "scheduled");
    const finished = matches.filter((match) => (match.live?.status ?? match.fixture.status) === "finished");
    return [...live, ...upcoming, ...finished, ...matches.filter((match) => ![...live, ...upcoming, ...finished].includes(match))];
  }, [matches]);

  return (
    <section className="match-center">
      <div className="match-center-head">
        <div>
          <div className="match-kicker">{t("matches.kicker")}</div>
          <h2>{t("matches.title")}</h2>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={loading}>
          {loading ? t("common.loading") : t("common.refresh")}
        </button>
      </div>

      <div className="match-layout">
        <aside className="match-list" aria-label={t("matches.title")}>
          {grouped.map((match) => (
            <button
              type="button"
              key={match.fixture.matchId}
              className={selected?.fixture.matchId === match.fixture.matchId ? "selected" : ""}
              onClick={() => setSelectedId(match.fixture.matchId)}
            >
              <b>M{match.fixture.matchId}</b>
              <span>{match.fixture.home} vs {match.fixture.away}</span>
              <small>{match.live?.status ?? match.fixture.status}</small>
            </button>
          ))}
        </aside>

        <div className="match-detail">
          {selected ? (
            <>
              <div className="score-strip">
                <div>
                  <span>{selected.fixture.home}</span>
                  <strong>{score(selected)}</strong>
                  <span>{selected.fixture.away}</span>
                </div>
                <p>
                  {selected.fixture.kickoff ? formatDateTime(selected.fixture.kickoff) : "Kickoff TBA"}
                  {" · "}
                  {[selected.fixture.venue, selected.fixture.city].filter(Boolean).join(", ")}
                </p>
                <small>{selected.stale ? t("matches.stale") : `${t("matches.updated")} ${formatDateTime(selected.live?.updatedAt ?? selected.updatedAt)}`}</small>
              </div>

              <LineupPitch lineups={selected.lineups} />

              <div className="match-panels">
                <section>
                  <h3>{t("matches.timeline")}</h3>
                  {selected.events.length === 0 ? (
                    <p className="match-muted">{t("matches.noEvents")}</p>
                  ) : (
                    <ul className="timeline-list">
                      {selected.events.map((event) => (
                        <li key={event.id}>{eventLabel(event)}</li>
                      ))}
                    </ul>
                  )}
                </section>
                <section>
                  <h3>{t("matches.availability")}</h3>
                  {selected.availability.length === 0 ? (
                    <p className="match-muted">{t("matches.noAvailability")}</p>
                  ) : (
                    <ul className="availability-list">
                      {selected.availability.slice(0, 10).map((item) => (
                        <li key={item.id}>{availabilityLabel(item)}</li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            </>
          ) : (
            <div className="match-empty">{loading ? t("common.loading") : t("matches.empty")}</div>
          )}
        </div>
      </div>
      {error && <div className="match-error">{error}</div>}
    </section>
  );
}
