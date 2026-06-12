import { useCallback, useEffect, useMemo, useState } from "react";
import type { Fixture, MyPrediction } from "../lib/game-api";
import { useGameSnapshotStore } from "../lib/game-snapshot-store";
import { useI18n } from "../lib/i18n";
import { APP_SUI_NETWORK } from "../lib/sui-network";
import { useTimeSettings } from "../lib/time-settings";
import { useVerifiedSession } from "../lib/wallet-session";
import { teamWithFlag } from "../lib/team-flags";
import "./my-predictions-manager.css";

type FilterKey = "all" | "pending" | "scored" | "correct" | "wrong";

function shortId(value: string | null | undefined): string {
  if (!value) return "-";
  return value.length > 18 ? `${value.slice(0, 10)}...${value.slice(-6)}` : value;
}

function predictionStatus(prediction: MyPrediction): FilterKey {
  if (prediction.oracleCorrect === true || prediction.result === "correct") return "correct";
  if (prediction.oracleCorrect === false || prediction.result === "wrong") return "wrong";
  if (prediction.oracleStatus === "recorded" || prediction.result !== "pending") return "scored";
  return "pending";
}

function formatPayload(kind: string, payload: unknown): string {
  if (!payload || typeof payload !== "object") return String(payload ?? "-");
  const record = payload as Record<string, unknown>;
  const homeScore = record.homeScore ?? record.home;
  const awayScore = record.awayScore ?? record.away;
  if (kind === "scoreline" && homeScore != null && awayScore != null) return `${homeScore}-${awayScore}`;
  if (record.targetLabel != null) return String(record.targetLabel);
  if (record.winnerSide != null) return String(record.winnerSide).replace(/^home$/, "home").replace(/^away$/, "away");
  return JSON.stringify(payload);
}

function fixtureLabel(fixtures: Fixture[], matchId: string): string {
  const fixture = fixtures.find((item) => item.matchId === matchId);
  if (!fixture) return `M${matchId}`;
  return `M${fixture.matchId} ${teamWithFlag(fixture.home, fixture.homeTeamCode)} vs ${teamWithFlag(fixture.away, fixture.awayTeamCode)}`;
}

function txUrl(digest: string | null | undefined): string | null {
  return digest ? `https://suiscan.xyz/${APP_SUI_NETWORK}/tx/${digest}` : null;
}

function matchesFilter(prediction: MyPrediction, filter: FilterKey): boolean {
  if (filter === "all") return true;
  const status = predictionStatus(prediction);
  if (filter === "scored") return status === "scored" || status === "correct" || status === "wrong";
  return status === filter;
}

export function MyPredictionsManager() {
  const { t } = useI18n();
  const { formatDateTime } = useTimeSettings();
  const { signedIn, session } = useVerifiedSession();
  const snapshot = useGameSnapshotStore((state) => state.snapshot);
  const loading = useGameSnapshotStore((state) => state.loading);
  const loadError = useGameSnapshotStore((state) => state.error);
  const refreshSnapshot = useGameSnapshotStore((state) => state.refresh);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!signedIn) return;
    setError(null);
    try {
      await refreshSnapshot();
    } catch {
      setError(t("mypicks.loadErr"));
    }
  }, [refreshSnapshot, signedIn, t]);

  useEffect(() => {
    void refresh();
  }, [refresh, session?.token]);
  const record = signedIn ? snapshot?.myRecord ?? null : null;
  const fixtures = snapshot?.fixtures ?? [];
  const predictions = record?.predictions ?? [];
  const filtered = useMemo(
    () => predictions.filter((prediction) => matchesFilter(prediction, filter)),
    [filter, predictions],
  );
  const counts = useMemo(() => {
    const next: Record<FilterKey, number> = { all: predictions.length, pending: 0, scored: 0, correct: 0, wrong: 0 };
    for (const prediction of predictions) {
      const status = predictionStatus(prediction);
      if (status === "pending") {
        next.pending += 1;
        continue;
      }
      next.scored += 1;
      if (status === "correct" || status === "wrong") next[status] += 1;
    }
    return next;
  }, [predictions]);
  async function copyDigest(prediction: MyPrediction) {
    const digest = prediction.txDigest ?? prediction.oracleTxDigest;
    if (!digest) return;
    await navigator.clipboard.writeText(digest);
    setCopiedId(prediction.id);
    window.setTimeout(() => setCopiedId(null), 1200);
  }

  return (
    <section className="my-picks-section">
      <div className="my-picks-title">
        <span>{t("mypicks.title")}</span>
        <button type="button" onClick={() => void refresh()} disabled={loading || !signedIn}>
          {loading ? t("common.loading") : t("common.refresh")}
        </button>
      </div>
      {record && (
        <div className="my-picks-summary">
          <div>
            <span>{t("board.myPoints")}</span>
            <strong>{record.totalPoints}</strong>
          </div>
          <div>
            <span>{t("board.correct")}</span>
            <strong>{record.correct}/{record.graded}</strong>
          </div>
          <div>
            <span>{t("board.accuracy")}</span>
            <strong>{record.accuracy == null ? "-" : `${record.accuracy}%`}</strong>
          </div>
          <div>
            <span>{t("mypicks.total")}</span>
            <strong>{predictions.length}</strong>
          </div>
        </div>
      )}
      <div className="my-picks-filters" role="group" aria-label={t("mypicks.filters")}>
        {(["all", "pending", "scored", "correct", "wrong"] as FilterKey[]).map((item) => (
          <button key={item} type="button" className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>
            {t(`mypicks.filter.${item}`)} <b>{counts[item]}</b>
          </button>
        ))}
      </div>
      <div className="my-picks-table-wrap">
        <table className="my-picks-table">
          <thead>
            <tr>
              <th>{t("pred.match")}</th>
              <th>{t("pred.betType")}</th>
              <th>{t("mypicks.pick")}</th>
              <th>{t("mypicks.status")}</th>
              <th>{t("board.points")}</th>
              <th>{t("mypicks.proof")}</th>
              <th>{t("mypicks.created")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((prediction) => {
              const status = predictionStatus(prediction);
              const proofDigest = prediction.txDigest ?? prediction.oracleTxDigest;
              const href = txUrl(proofDigest);
              return (
                <tr key={prediction.id}>
                  <td>{fixtureLabel(fixtures, prediction.matchId)}</td>
                  <td>{prediction.kind.replace(/_/g, " ")}</td>
                  <td>{formatPayload(prediction.kind, prediction.payload)}</td>
                  <td><span className={`my-picks-status ${status}`}>{t(`mypicks.filter.${status}`)}</span></td>
                  <td>{prediction.oraclePoints ?? "-"}</td>
                  <td>
                    <div className="my-picks-proof">
                      {href ? <a href={href} target="_blank" rel="noreferrer">{shortId(proofDigest)}</a> : <span>{shortId(proofDigest)}</span>}
                      <button type="button" onClick={() => void copyDigest(prediction)} disabled={!prediction.txDigest && !prediction.oracleTxDigest}>
                        {copiedId === prediction.id ? t("common.copied") : t("mypicks.copy")}
                      </button>
                    </div>
                  </td>
                  <td>{formatDateTime(prediction.createdAt)}</td>
                </tr>
              );
            })}
            {!signedIn && (
              <tr>
                <td colSpan={7}>{t("mypicks.signIn")}</td>
              </tr>
            )}
            {signedIn && filtered.length === 0 && (
              <tr>
                <td colSpan={7}>{t("mypicks.empty")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {(error || loadError) && <div className="my-picks-error">{error ?? loadError}</div>}
    </section>
  );
}
