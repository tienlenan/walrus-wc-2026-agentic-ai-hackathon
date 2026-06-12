import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { buildSubmitPrediction } from "@daily-walrus/contract";
import { saveMatchVote, type Fixture, type MatchVoteSummary } from "../lib/game-api";
import { useGameSnapshotStore } from "../lib/game-snapshot-store";
import { getWorldCupSnapshot, type WorldCupSnapshot } from "../lib/world-cup-api";
import {
  buildPredictionTargetOptions,
  contractKindForPrediction,
  isVotePredictionKind,
  predictionNeedsFixture,
  predictionNeedsTarget,
  type PredictionKindKey,
} from "../lib/prediction-target-options";
import { useI18n } from "../lib/i18n";
import { SUI_NETWORKS, type AppSuiNetwork } from "../lib/sui-network";
import { useSuiOutputRecorder } from "../lib/sui-output-record";
import { useSuiGasBalance } from "../lib/use-sui-gas-balance";
import { useVerifiedSession } from "../lib/wallet-session";
import { useTimeSettings } from "../lib/time-settings";
import { teamWithFlag } from "../lib/team-flags";
import "./predictions-desk.css";

type GroupFilter = "all" | "knockout" | "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L";

const KIND_OPTIONS: Array<{ key: PredictionKindKey; labelKey: string }> = [
  { key: "winner", labelKey: "pred.kind.winner" },
  { key: "scoreline", labelKey: "pred.kind.scoreline" },
  { key: "match_mvp", labelKey: "pred.kind.match_mvp" },
  { key: "worst_player", labelKey: "pred.kind.worst_player" },
  { key: "champion", labelKey: "pred.kind.champion" },
  { key: "advance", labelKey: "pred.kind.advance" },
];

const GROUP_FILTERS: GroupFilter[] = ["all", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "knockout"];

function shortDigest(digest: string): string {
  return `${digest.slice(0, 10)}...${digest.slice(-6)}`;
}

type DateTimeFormatter = ReturnType<typeof useTimeSettings>["formatDateTime"];

function formatFixture(fixture: Fixture, t: (key: string) => string, formatDateTime: DateTimeFormatter): string {
  const kickoff = fixture.kickoff ? formatDateTime(fixture.kickoff) : "kickoff TBA";
  const group = fixture.groupName ? `${t("common.group")} ${fixture.groupName}` : fixture.stage ?? t("pred.filter.knockout");
  return `M${fixture.matchId} ${teamWithFlag(fixture.home, fixture.homeTeamCode)} vs ${teamWithFlag(
    fixture.away,
    fixture.awayTeamCode,
  )} - ${kickoff} - ${group} - ${gateLabel(fixture, t)}`;
}

function groupFilterLabel(filter: GroupFilter, t: (key: string) => string): string {
  if (filter === "all") return t("pred.filter.all");
  if (filter === "knockout") return t("pred.filter.knockout");
  return `${t("common.group")} ${filter}`;
}

function gateLabel(fixture: Fixture, t: (key: string) => string): string {
  if (fixture.predictionOpen) return t("pred.gate.open");
  switch (fixture.predictionStatus) {
    case "not_onchain":
      return t("pred.gate.not_onchain");
    case "closed_finished":
      return t("pred.gate.closed_finished");
    case "closed_kickoff":
      return t("pred.gate.closed_kickoff");
    default:
      return t("pred.gate.unknown");
  }
}

function gateCopy(fixture: Fixture, t: (key: string) => string): string {
  if (fixture.predictionOpen) return t("pred.gateCopy.open");
  if (fixture.predictionStatus === "not_onchain") return t("pred.gateCopy.not_onchain");
  if (fixture.predictionStatus === "closed_finished") return t("pred.gateCopy.closed_finished");
  if (fixture.predictionStatus === "closed_kickoff") return t("pred.gateCopy.closed_kickoff");
  return fixture.predictionLockedReason ?? "Prediction locked.";
}

function voteTitle(summary: MatchVoteSummary | undefined, t: (key: string) => string): string {
  if (!summary || summary.leaders.length === 0) return t("pred.noVotes");
  const top = summary.leaders[0]!;
  return `${top.targetLabel} leads with ${top.votes}`;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function PredictionsDesk() {
  const { t } = useI18n();
  const { formatDateTime } = useTimeSettings();
  const account = useCurrentAccount();
  const { signedIn } = useVerifiedSession();
  const gas = useSuiGasBalance(account?.address);
  const recordOutput = useSuiOutputRecorder();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const snapshot = useGameSnapshotStore((state) => state.snapshot);
  const snapshotLoading = useGameSnapshotStore((state) => state.loading);
  const refreshSnapshot = useGameSnapshotStore((state) => state.refresh);
  const syncGameIndex = useGameSnapshotStore((state) => state.syncIndex);
  const [worldCupSnapshot, setWorldCupSnapshot] = useState<WorldCupSnapshot | null>(null);
  const [kindKey, setKindKey] = useState<PredictionKindKey>("winner");
  const [groupFilter, setGroupFilter] = useState<GroupFilter>("all");
  const [matchId, setMatchId] = useState("");
  const [homeScore, setHomeScore] = useState(1);
  const [awayScore, setAwayScore] = useState(0);
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [voteBusy, setVoteBusy] = useState(false);
  const [predictionPhase, setPredictionPhase] = useState<"signing" | null>(null);
  const [votePhase, setVotePhase] = useState<"saving" | "signing" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function ensureMatchSelection(next = snapshot) {
    const firstOpen = next?.fixtures.find((fixture) => fixture.predictionOpen) ?? next?.fixtures[0];
    if (!matchId && firstOpen) setMatchId(firstOpen.matchId);
  }

  async function refresh() {
    const next = await refreshSnapshot();
    try {
      setWorldCupSnapshot(await getWorldCupSnapshot());
    } catch {
      setWorldCupSnapshot(null);
    }
    ensureMatchSelection(next);
  }

  async function syncSubmittedPrediction(digest: string) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const next = await syncGameIndex();
      ensureMatchSelection(next);
      if (!digest || next.myRecord?.predictions.some((prediction) => prediction.txDigest === digest)) return;
      await wait(900);
    }
  }

  useEffect(() => {
    void refresh().catch(() => setError(t("pred.loadErr")));
  }, []);

  const needsFixture = predictionNeedsFixture(kindKey);
  const needsTarget = predictionNeedsTarget(kindKey);
  const selectedFixture = useMemo(
    () => snapshot?.fixtures.find((fixture) => fixture.matchId === matchId),
    [snapshot?.fixtures, matchId],
  );
  const visibleFixtures = useMemo(() => {
    const fixtures = snapshot?.fixtures ?? [];
    if (groupFilter === "all") return fixtures;
    if (groupFilter === "knockout") return fixtures.filter((fixture) => !fixture.groupName);
    return fixtures.filter((fixture) => fixture.groupName === groupFilter);
  }, [groupFilter, snapshot?.fixtures]);
  const openFixtures = useMemo(() => visibleFixtures.filter((fixture) => fixture.predictionOpen), [visibleFixtures]);
  useEffect(() => {
    if (!needsFixture || visibleFixtures.length === 0) return;
    if (!visibleFixtures.some((fixture) => fixture.matchId === matchId)) {
      setMatchId((openFixtures[0] ?? visibleFixtures[0])!.matchId);
    }
  }, [matchId, needsFixture, openFixtures, visibleFixtures]);
  const targetOptions = useMemo(
    () =>
      buildPredictionTargetOptions({
        kind: kindKey,
        fixture: selectedFixture,
        teams: worldCupSnapshot?.teams ?? [],
        drawLabel: t("pred.draw"),
      }),
    [kindKey, selectedFixture, t, worldCupSnapshot?.teams],
  );
  useEffect(() => {
    if (!needsTarget) return;
    if (targetOptions.length > 0 && !targetOptions.some((targetOption) => targetOption.value === target)) {
      setTarget(targetOptions[0]!.value);
    }
  }, [needsTarget, target, targetOptions]);
  const selectedTarget = targetOptions.find((targetOption) => targetOption.value === target) ?? null;
  const selectedVoteSummary = useMemo(
    () => snapshot?.votes.find((vote) => vote.matchId === matchId && vote.kind === kindKey),
    [snapshot?.votes, matchId, kindKey],
  );
  const existingPrediction = useMemo(
    () =>
      snapshot?.myRecord?.predictions.find((prediction) => {
        if (prediction.kind !== kindKey) return false;
        return needsFixture ? prediction.matchId === matchId : true;
      }) ?? null,
    [kindKey, matchId, needsFixture, snapshot?.myRecord?.predictions],
  );
  const faucetUrl = SUI_NETWORKS[gas.network as AppSuiNetwork]?.faucetUrl ?? null;
  const gasBlocked = Boolean(signedIn && account && !gas.loading && !gas.hasGas);
  const gated = needsFixture && selectedFixture && !selectedFixture.predictionOpen;
  const duplicate = Boolean(signedIn && existingPrediction);
  const canSubmit = Boolean(
    signedIn &&
      account &&
      gas.hasGas &&
      !busy &&
      !duplicate &&
      (!needsFixture || (matchId && selectedFixture?.predictionOpen)) &&
      (!needsTarget || selectedTarget),
  );
  const canVote = Boolean(
    signedIn && gas.hasGas && isVotePredictionKind(kindKey) && matchId && selectedTarget && !voteBusy && selectedFixture?.predictionOpen,
  );

  function buildPayload(): { a: number; b: number; c: number; d: number; e: number } {
    if (kindKey === "scoreline") {
      return { a: Math.max(0, homeScore), b: Math.max(0, awayScore), c: 0, d: 0, e: 0 };
    }
    if (!selectedTarget) throw new Error(t("pred.targetReq"));
    return selectedTarget.payload;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    setPredictionPhase("signing");
    try {
      const payload = buildPayload();
      const tx = buildSubmitPrediction({
        matchId: needsFixture ? BigInt(matchId) : 0n,
        kind: contractKindForPrediction(kindKey),
        ...payload,
      });
      const result = await signAndExecute({ transaction: tx });
      const digest = "digest" in result ? result.digest : "";
      setNotice(digest ? `${t("pred.submitted")}: ${shortDigest(digest)}` : `${t("pred.submitted")}.`);
      await syncSubmittedPrediction(digest);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("pred.failed"));
    } finally {
      setBusy(false);
      setPredictionPhase(null);
    }
  }

  async function submitVote() {
    if (!isVotePredictionKind(kindKey) || !canVote || !selectedTarget) return;
    setVoteBusy(true);
    setVotePhase("saving");
    setError(null);
    setNotice(null);
    try {
      const votePayload = { matchId, kind: kindKey, targetLabel: selectedTarget.targetLabel };
      const proof = await recordOutput({
        outputKind: "match_vote",
        resourceType: "match_vote",
        resourceId: `${matchId}:${kindKey}`,
        payload: votePayload,
        onBeforeSign: () => setVotePhase("signing"),
      });
      const vote = await saveMatchVote({
        ...votePayload,
        outputObjectId: proof.suiObjectId,
        outputTxDigest: proof.txDigest,
        outputHash: proof.contentHash,
      });
      setNotice(`${t("pred.voteSaved")}: ${vote.targetLabel}`);
      await refreshSnapshot();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("pred.voteFailed"));
    } finally {
      setVoteBusy(false);
      setVotePhase(null);
    }
  }

  return (
    <section className="predictions-desk">
      <div className="desk-title">
        <span>{t("pred.title")}</span>
        <button type="button" onClick={() => void refresh()} disabled={busy || snapshotLoading}>
          {snapshotLoading ? t("common.loading") : t("common.refresh")}
        </button>
      </div>

      <form className="prediction-form" onSubmit={submit}>
        <label>
          {t("pred.betType")}
          <select value={kindKey} onChange={(e) => setKindKey(e.target.value as PredictionKindKey)}>
            {KIND_OPTIONS.map((item) => (
              <option key={item.key} value={item.key}>
                {t(item.labelKey)}
              </option>
            ))}
          </select>
        </label>

        {needsFixture && (
          <>
            <div className="group-filter full-row" role="group" aria-label={t("pred.groupFilter")}>
              {GROUP_FILTERS.map((item) => (
                <button
                  type="button"
                  key={item}
                  className={groupFilter === item ? "active" : ""}
                  onClick={() => setGroupFilter(item)}
                >
                  {groupFilterLabel(item, t)}
                </button>
              ))}
            </div>

            <label className="full-row">
              {t("pred.match")}
              <select value={matchId} onChange={(e) => setMatchId(e.target.value)}>
                {visibleFixtures.map((fixture) => (
                  <option key={fixture.matchId} value={fixture.matchId} disabled={!fixture.predictionOpen}>
                    {formatFixture(fixture, t, formatDateTime)}
                  </option>
                ))}
              </select>
            </label>

            <div className="fixture-board full-row" aria-label={t("pred.groupFilter")}>
              {visibleFixtures.map((fixture) => (
                <button
                  type="button"
                  key={fixture.matchId}
                  className={fixture.matchId === matchId ? "selected" : ""}
                  onClick={() => setMatchId(fixture.matchId)}
                >
                  <b>M{fixture.matchId}</b>
                  <span className="fixture-teams">
                    <span>{teamWithFlag(fixture.home, fixture.homeTeamCode)}</span>
                    <i>vs</i>
                    <span>{teamWithFlag(fixture.away, fixture.awayTeamCode)}</span>
                  </span>
                  <small className={fixture.predictionOpen ? "open" : ""}>{gateLabel(fixture, t)}</small>
                </button>
              ))}
            </div>
          </>
        )}

        {kindKey === "scoreline" ? (
          <div className="scoreline-inputs">
            <label>
              {t("pred.home")}
              <input type="number" min={0} value={homeScore} onChange={(e) => setHomeScore(Number(e.target.value))} />
            </label>
            <span>:</span>
            <label>
              {t("pred.away")}
              <input type="number" min={0} value={awayScore} onChange={(e) => setAwayScore(Number(e.target.value))} />
            </label>
          </div>
        ) : (
          <label className="full-row">
            {t("pred.target")}
            <select value={target} onChange={(e) => setTarget(e.target.value)} disabled={targetOptions.length === 0}>
              {targetOptions.map((targetOption) => (
                <option key={targetOption.value} value={targetOption.value}>
                  {targetOption.label}
                </option>
              ))}
            </select>
          </label>
        )}

        <button className="submit-slip" type="submit" disabled={!canSubmit}>
          {busy ? (predictionPhase === "signing" ? t("pred.openingWallet") : t("pred.submitting")) : signedIn ? t("pred.submit") : t("common.signInFirst")}
        </button>
      </form>

      {isVotePredictionKind(kindKey) && (
        <div className="vote-panel">
          <div>
            <span>{kindKey === "match_mvp" ? t("pred.votingMvp") : t("pred.votingWorst")}</span>
            <strong>{voteTitle(selectedVoteSummary, t)}</strong>
          </div>
          <button type="button" onClick={() => void submitVote()} disabled={!canVote}>
            {voteBusy ? (votePhase === "signing" ? t("pred.openingWallet") : t("pred.saving")) : signedIn ? t("pred.saveVote") : t("common.signInFirst")}
          </button>
          {selectedVoteSummary?.myVote && <small>{t("pred.myVote")}: {selectedVoteSummary.myVote.targetLabel}</small>}
          {selectedVoteSummary?.leaders.length ? (
            <ol>
              {selectedVoteSummary.leaders.map((leader) => (
                <li key={leader.targetHash}>
                  <span>{leader.targetLabel}</span>
                  <b>{leader.votes}</b>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      )}

      {gated && selectedFixture && <div className="prediction-alert">{gateCopy(selectedFixture, t)}</div>}
      {duplicate && <div className="prediction-alert">{t("pred.alreadyPicked")}</div>}
      {needsTarget && targetOptions.length === 0 && <div className="prediction-alert">{t("pred.noTargets")}</div>}
      {gasBlocked && (
        <div className="prediction-alert gas-alert">
          <span>{t("pred.needGas").replace("{network}", gas.network)}</span>
          {faucetUrl && (
            <a href={faucetUrl} target="_blank" rel="noreferrer">
              {t("pred.openFaucet")}
            </a>
          )}
        </div>
      )}
      {gas.error && <div className="prediction-error">{t("pred.gasCheckFailed")}: {gas.error}</div>}
      {notice && <div className="prediction-notice">{notice}</div>}
      {error && <div className="prediction-error">{error}</div>}
      {needsFixture && openFixtures.length === 0 && (
        <div className="prediction-alert">{t("pred.noOpen")}</div>
      )}
    </section>
  );
}
