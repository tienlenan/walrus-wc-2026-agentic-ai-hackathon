import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { buildSubmitPrediction, Kind } from "@daily-walrus/contract";
import { getGameSnapshot, saveMatchVote, type Fixture, type GameSnapshot, type MatchVoteSummary } from "../lib/game-api";
import { useI18n } from "../lib/i18n";
import { SUI_NETWORKS, type AppSuiNetwork } from "../lib/sui-network";
import { useSuiOutputRecorder } from "../lib/sui-output-record";
import { useSuiGasBalance } from "../lib/use-sui-gas-balance";
import { useVerifiedSession } from "../lib/wallet-session";
import { useTimeSettings } from "../lib/time-settings";
import { teamWithFlag } from "../lib/team-flags";
import "./predictions-desk.css";

type KindKey = "scoreline" | "match_mvp" | "worst_player" | "champion" | "advance";
type GroupFilter = "all" | "knockout" | "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L";

const KIND_OPTIONS: Array<{ key: KindKey; labelKey: string; kind: number; needsFixture: boolean }> = [
  { key: "scoreline", labelKey: "pred.kind.scoreline", kind: Kind.Scoreline, needsFixture: true },
  { key: "match_mvp", labelKey: "pred.kind.match_mvp", kind: Kind.MatchMvp, needsFixture: true },
  { key: "worst_player", labelKey: "pred.kind.worst_player", kind: Kind.WorstPlayer, needsFixture: true },
  { key: "champion", labelKey: "pred.kind.champion", kind: Kind.Champion, needsFixture: false },
  { key: "advance", labelKey: "pred.kind.advance", kind: Kind.Advance, needsFixture: true },
];

const GROUP_FILTERS: GroupFilter[] = ["all", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "knockout"];

function shortDigest(digest: string): string {
  return `${digest.slice(0, 10)}...${digest.slice(-6)}`;
}

function hashToU32(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
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

function isVoteKind(kind: KindKey): kind is "match_mvp" | "worst_player" {
  return kind === "match_mvp" || kind === "worst_player";
}

function voteTitle(summary: MatchVoteSummary | undefined, t: (key: string) => string): string {
  if (!summary || summary.leaders.length === 0) return t("pred.noVotes");
  const top = summary.leaders[0]!;
  return `${top.targetLabel} leads with ${top.votes}`;
}

export function PredictionsDesk() {
  const { t } = useI18n();
  const { formatDateTime } = useTimeSettings();
  const account = useCurrentAccount();
  const { signedIn } = useVerifiedSession();
  const gas = useSuiGasBalance(account?.address);
  const recordOutput = useSuiOutputRecorder();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [kindKey, setKindKey] = useState<KindKey>("scoreline");
  const [groupFilter, setGroupFilter] = useState<GroupFilter>("all");
  const [matchId, setMatchId] = useState("");
  const [homeScore, setHomeScore] = useState(1);
  const [awayScore, setAwayScore] = useState(0);
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [voteBusy, setVoteBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const next = await getGameSnapshot();
    setSnapshot(next);
    const firstOpen = next.fixtures.find((fixture) => fixture.predictionOpen) ?? next.fixtures[0];
    if (!matchId && firstOpen) {
      setMatchId(firstOpen.matchId);
    }
  }

  useEffect(() => {
    void refresh().catch(() => setError(t("pred.loadErr")));
  }, []);

  const option = KIND_OPTIONS.find((o) => o.key === kindKey) ?? KIND_OPTIONS[0]!;
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
    if (!option.needsFixture || visibleFixtures.length === 0) return;
    if (!visibleFixtures.some((fixture) => fixture.matchId === matchId)) {
      setMatchId((openFixtures[0] ?? visibleFixtures[0])!.matchId);
    }
  }, [matchId, openFixtures, option.needsFixture, visibleFixtures]);
  const selectedVoteSummary = useMemo(
    () => snapshot?.votes.find((vote) => vote.matchId === matchId && vote.kind === kindKey),
    [snapshot?.votes, matchId, kindKey],
  );
  const faucetUrl = SUI_NETWORKS[gas.network as AppSuiNetwork]?.faucetUrl ?? null;
  const gasBlocked = Boolean(signedIn && account && !gas.loading && !gas.hasGas);
  const gated = option.needsFixture && selectedFixture && !selectedFixture.predictionOpen;
  const canSubmit = Boolean(
    signedIn &&
      account &&
      gas.hasGas &&
      !busy &&
      (!option.needsFixture || (matchId && selectedFixture?.predictionOpen)),
  );
  const canVote = Boolean(
    signedIn && gas.hasGas && isVoteKind(kindKey) && matchId && target.trim() && !voteBusy && selectedFixture?.predictionOpen,
  );

  function buildPayload(): { a: number; b: number; c: number; d: number; e: number } {
    if (kindKey === "scoreline") {
      return { a: Math.max(0, homeScore), b: Math.max(0, awayScore), c: 0, d: 0, e: 0 };
    }
    const clean = target.trim();
    if (!clean) throw new Error(t("pred.targetReq"));
    return { a: hashToU32(clean.toLowerCase()), b: 0, c: 0, d: 0, e: 0 };
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const payload = buildPayload();
      const tx = buildSubmitPrediction({
        matchId: option.needsFixture ? BigInt(matchId) : 0n,
        kind: option.kind,
        ...payload,
      });
      const result = await signAndExecute({ transaction: tx });
      const digest = "digest" in result ? result.digest : "";
      setNotice(digest ? `${t("pred.submitted")}: ${shortDigest(digest)}` : `${t("pred.submitted")}.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("pred.failed"));
    } finally {
      setBusy(false);
    }
  }

  async function submitVote() {
    if (!isVoteKind(kindKey) || !canVote) return;
    setVoteBusy(true);
    setError(null);
    setNotice(null);
    try {
      const votePayload = { matchId, kind: kindKey, targetLabel: target.trim() };
      const proof = await recordOutput({
        outputKind: "match_vote",
        resourceType: "match_vote",
        resourceId: `${matchId}:${kindKey}`,
        payload: votePayload,
      });
      const vote = await saveMatchVote({
        ...votePayload,
        outputObjectId: proof.suiObjectId,
        outputTxDigest: proof.txDigest,
        outputHash: proof.contentHash,
      });
      setNotice(`${t("pred.voteSaved")}: ${vote.targetLabel}`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("pred.voteFailed"));
    } finally {
      setVoteBusy(false);
    }
  }

  return (
    <section className="predictions-desk">
      <div className="desk-title">
        <span>{t("pred.title")}</span>
        <button type="button" onClick={() => void refresh()} disabled={busy}>
          {t("common.refresh")}
        </button>
      </div>

      <form className="prediction-form" onSubmit={submit}>
        <label>
          {t("pred.betType")}
          <select value={kindKey} onChange={(e) => setKindKey(e.target.value as KindKey)}>
            {KIND_OPTIONS.map((item) => (
              <option key={item.key} value={item.key}>
                {t(item.labelKey)}
              </option>
            ))}
          </select>
        </label>

        {option.needsFixture && (
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
            <input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder={kindKey === "champion" ? t("pred.championPh") : t("pred.targetPh")}
            />
          </label>
        )}

        <button className="submit-slip" type="submit" disabled={!canSubmit}>
          {busy ? t("pred.submitting") : signedIn ? t("pred.submit") : t("common.signInFirst")}
        </button>
      </form>

      {isVoteKind(kindKey) && (
        <div className="vote-panel">
          <div>
            <span>{kindKey === "match_mvp" ? t("pred.votingMvp") : t("pred.votingWorst")}</span>
            <strong>{voteTitle(selectedVoteSummary, t)}</strong>
          </div>
          <button type="button" onClick={() => void submitVote()} disabled={!canVote}>
            {voteBusy ? t("pred.saving") : signedIn ? t("pred.saveVote") : t("common.signInFirst")}
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
      {option.needsFixture && openFixtures.length === 0 && (
        <div className="prediction-alert">{t("pred.noOpen")}</div>
      )}
    </section>
  );
}
