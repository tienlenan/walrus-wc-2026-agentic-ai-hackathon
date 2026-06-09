import { useEffect, useMemo, useState } from "react";
import { createRoast, getWorldCupSnapshot, listRoasts, type Roast, type TeamProfile, type WorldCupSnapshot } from "../lib/world-cup-api";
import { loadAiSettings, resolveAiLang } from "../lib/ai-settings";
import { useI18n } from "../lib/i18n";
import { useSuiOutputRecorder } from "../lib/sui-output-record";
import { useVerifiedSession } from "../lib/wallet-session";
import { useTimeSettings } from "../lib/time-settings";
import "./roast-wall.css";

function shortDigest(digest: string): string {
  return `${digest.slice(0, 10)}...${digest.slice(-6)}`;
}

export function RoastWall() {
  const { lang, t } = useI18n();
  const { formatTime } = useTimeSettings();
  const { signedIn } = useVerifiedSession();
  const recordOutput = useSuiOutputRecorder();
  const [snapshot, setSnapshot] = useState<WorldCupSnapshot | null>(null);
  const [roasts, setRoasts] = useState<Roast[]>([]);
  const [mode, setMode] = useState<"team" | "player">("team");
  const [teamCode, setTeamCode] = useState("ENG");
  const [playerNumber, setPlayerNumber] = useState(10);
  const [freeTarget, setFreeTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const [wc, feed] = await Promise.all([getWorldCupSnapshot(), listRoasts()]);
    setSnapshot(wc);
    setRoasts(feed);
    if (!wc.teams.some((team) => team.code === teamCode) && wc.teams[0]) setTeamCode(wc.teams[0].code);
  }

  useEffect(() => {
    void refresh().catch(() => setError(t("roast.loadErr")));
  }, []);

  const teams = snapshot?.teams ?? [];
  const selectedTeam = teams.find((team) => team.code === teamCode) ?? teams[0] ?? null;
  const selectedPlayer = selectedTeam?.squad.find((player) => player.number === playerNumber) ?? selectedTeam?.squad[0] ?? null;

  const targetPreview = useMemo(() => {
    if (mode === "team") return selectedTeam?.name ?? (freeTarget || "team");
    return selectedPlayer?.playerName ?? (freeTarget || "player");
  }, [freeTarget, mode, selectedPlayer, selectedTeam]);

  async function roast() {
    if (busy) return;
    if (!signedIn) {
      setError(t("roast.signInErr"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const ai = loadAiSettings();
      const next = await createRoast({
        targetType: mode,
        teamCode: selectedTeam?.code,
        playerNumber: mode === "player" ? selectedPlayer?.number : undefined,
        targetName: freeTarget.trim() || undefined,
        roastSeverity: ai.roastSeverity,
        lang: resolveAiLang(ai.aiLang, lang),
        instructions: ai.instructions || undefined,
      });
      const proof = await recordOutput({
        outputKind: "roast",
        resourceType: "roast",
        resourceId: next.id,
        payload: {
          targetType: next.targetType,
          targetId: next.targetId,
          targetName: next.targetName,
          roastText: next.roastText,
          cardTitle: next.cardTitle,
        },
        pointer: next.outputPointer,
      });
      const withProof: Roast = {
        ...next,
        outputObjectId: proof.suiObjectId,
        outputTxDigest: proof.txDigest,
        outputHash: proof.contentHash,
      };
      setRoasts((items) => [withProof, ...items.filter((item) => item.id !== withProof.id)].slice(0, 20));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("roast.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="roast-wall">
      <div className="roast-head">
        <div>
          <div className="roast-kicker">{t("roast.kicker")}</div>
          <h2>{t("roast.title")}</h2>
        </div>
        <button type="button" onClick={() => void refresh()}>
          {t("common.refresh")}
        </button>
      </div>

      <div className="roast-console">
        <div className="roast-controls">
          <div className="segmented" role="group" aria-label={t("roast.targetType")}>
            <button type="button" className={mode === "team" ? "on" : ""} onClick={() => setMode("team")}>
              {t("common.team")}
            </button>
            <button type="button" className={mode === "player" ? "on" : ""} onClick={() => setMode("player")}>
              {t("common.player")}
            </button>
          </div>

          <label>
            {t("common.team")}
            <select value={selectedTeam?.code ?? teamCode} onChange={(event) => setTeamCode(event.target.value)}>
              {teams.map((team) => (
                <option key={team.code} value={team.code}>
                  {team.flagEmoji} {team.name}
                </option>
              ))}
            </select>
          </label>

          {mode === "player" && selectedTeam && (
            <label>
              {t("common.player")}
              <select value={selectedPlayer?.number ?? playerNumber} onChange={(event) => setPlayerNumber(Number(event.target.value))}>
                {selectedTeam.squad.map((player) => (
                  <option key={player.number} value={player.number}>
                    {player.number}. {player.playerName}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label>
            {t("roast.override")}
            <input value={freeTarget} onChange={(event) => setFreeTarget(event.target.value)} placeholder={t("roast.overridePh")} />
          </label>

          <button className="roast-submit" type="button" onClick={() => void roast()} disabled={busy || !selectedTeam || !signedIn}>
            {busy ? t("roast.roasting") : signedIn ? `${t("roast.submit")} ${targetPreview}` : t("common.signInFirst")}
          </button>
        </div>

        <RoastPreview target={targetPreview} team={selectedTeam} />
      </div>

      <div className="roast-feed">
        {roasts.map((roast) => (
          <article className="roast-card" key={roast.id}>
            <div className="roast-card-top">
              <span>{roast.targetType}</span>
              <time>{formatTime(roast.createdAt)}</time>
            </div>
            <h3>{roast.cardTitle}</h3>
            <p>{roast.roastText}</p>
            <div className="roast-card-foot">
              {roast.outputTxDigest ? `Sui OutputRecord ${shortDigest(roast.outputTxDigest)}` : t("roast.proofPending")}
              {" · "}
              {roast.memoryEnabled ? t("roast.memoryOn") : t("roast.memoryOff")}
            </div>
          </article>
        ))}
        {roasts.length === 0 && <div className="roast-empty">{t("roast.empty")}</div>}
      </div>

      {error && <div className="roast-error">{error}</div>}
    </section>
  );
}

function RoastPreview({ target, team }: { target: string; team: TeamProfile | null }) {
  const { t } = useI18n();
  return (
    <div className="roast-preview">
      <div className="gil-mark">GIL</div>
      <strong>{target}</strong>
      <span>{team ? `${team.flagEmoji} ${t("common.group")} ${team.groupName}` : t("roast.selectTarget")}</span>
      <p>{t("roast.preview")}</p>
    </div>
  );
}
