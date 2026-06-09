import { useEffect, useState } from "react";
import { getGameSnapshot, subscribeGameSnapshot, type GameSnapshot, type LeaderboardRow } from "../lib/game-api";
import { useI18n } from "../lib/i18n";
import "./leaderboard.css";

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function displayName(row: LeaderboardRow): string {
  return row.displayName || shortAddress(row.suiAddress);
}

export function Leaderboard() {
  const { t } = useI18n();
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setError(null);
      setSnapshot(await getGameSnapshot());
    } catch {
      setError(t("board.loadErr"));
    }
  }

  useEffect(() => {
    let pollId: number | null = null;
    const startPolling = () => {
      if (pollId == null) pollId = window.setInterval(() => void refresh(), 10_000);
    };

    void refresh();
    const unsubscribe = subscribeGameSnapshot(
      (next) => {
        setError(null);
        setSnapshot(next);
      },
      () => {
        setError(t("board.streamErr"));
        startPolling();
      },
    );
    return () => {
      unsubscribe();
      if (pollId != null) window.clearInterval(pollId);
    };
  }, []);

  const rows = snapshot?.leaderboard ?? [];
  const record = snapshot?.myRecord ?? null;

  return (
    <section className="leaderboard-section">
      <div className="leaderboard-title">
        <span>{t("board.title")}</span>
        <button type="button" onClick={() => void refresh()}>
          {t("common.refresh")}
        </button>
      </div>

      {record && (
        <div className="my-record-strip">
          <div>
            <span>{t("board.myPoints")}</span>
            <strong>{record.totalPoints}</strong>
          </div>
          <div>
            <span>{t("board.accuracy")}</span>
            <strong>{record.accuracy == null ? "-" : `${record.accuracy}%`}</strong>
          </div>
          <div>
            <span>{t("board.streak")}</span>
            <strong>{record.streak}</strong>
          </div>
          <div>
            <span>{t("board.receipts")}</span>
            <strong>{record.predictions.length}</strong>
          </div>
        </div>
      )}

      <div className="leaderboard-table-wrap">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>#</th>
              <th>{t("board.suspect")}</th>
              <th>{t("board.points")}</th>
              <th>{t("board.correct")}</th>
              <th>Acc.</th>
              <th>{t("board.streak")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.userId}>
                <td>{index + 1}</td>
                <td>{displayName(row)}</td>
                <td>{row.totalPoints}</td>
                <td>
                  {row.correct}/{row.graded}
                </td>
                <td>{row.accuracy == null ? "-" : `${row.accuracy}%`}</td>
                <td>{row.streak}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6}>{t("board.empty")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {error && <div className="leaderboard-error">{error}</div>}
      {snapshot?.updatedAt && <div className="leaderboard-asof">{t("board.asOf")} {new Date(snapshot.updatedAt).toLocaleTimeString()}</div>}
    </section>
  );
}
