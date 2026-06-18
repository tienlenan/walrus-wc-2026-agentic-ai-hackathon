import { useEffect, useMemo, useState } from "react";
import type { MyPrediction } from "../lib/game-api";
import {
  buildGiftReveals,
  isGiftOpened,
  readGiftProof,
  writeGiftOpened,
  writeGiftProof,
  type GiftReveal,
} from "../lib/gift-reveal";
import { useI18n } from "../lib/i18n";
import { useSuiOutputRecorder } from "../lib/sui-output-record";
import { GiftHistoryModal } from "./gift-history-modal";
import "./gift-reveal-strip.css";

const OUTPUT_RECORDING_DISABLED = import.meta.env.VITE_DISABLE_SUI_OUTPUT_RECORDING === "1";
// How long the opened gift stays revealed before it slides into the history modal.
const REVEAL_MS = 4000;

function GiftRevealBox({ reveal, onOpened }: { reveal: GiftReveal; onOpened: () => void }) {
  const { t } = useI18n();
  const recordOutput = useSuiOutputRecorder();
  const [signing, setSigning] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // undefined = still closed; null = revealed (demo, no proof); string = revealed with proof digest.
  const [revealedDigest, setRevealedDigest] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    setSaveError(null);
  }, [reveal.openedStorageKey]);

  // Show the prize for a few seconds, THEN persist it and move it to history. We delay the
  // localStorage write so a background refresh can't filter the box out mid-reveal.
  function revealThenArchive(digest: string | null) {
    setRevealedDigest(digest);
    window.setTimeout(() => {
      if (digest) writeGiftProof(reveal.openedStorageKey, digest);
      writeGiftOpened(reveal.openedStorageKey);
      onOpened();
    }, REVEAL_MS);
  }

  async function openGift() {
    if (signing || revealedDigest !== undefined) return;
    if (OUTPUT_RECORDING_DISABLED) {
      revealThenArchive(null);
      return;
    }
    setSigning(true);
    setSaveError(null);
    try {
      const proof = await recordOutput({
        outputKind: "roast",
        resourceType: "gift_reveal",
        resourceId: `gift-reveal:${reveal.predictionId}`,
        payload: {
          type: "gift_reveal",
          predictionId: reveal.predictionId,
          matchId: reveal.matchId,
          kind: reveal.kind,
          isCorrect: reveal.isCorrect,
          points: reveal.points,
          titleKey: reveal.titleKey,
          lineKey: reveal.lineKey,
          tone: reveal.tone,
        },
        onBeforeSign: () => setSigning(true),
      });
      revealThenArchive(proof.txDigest);
    } catch {
      setSaveError(t("gift.saveErr"));
    } finally {
      setSigning(false);
    }
  }

  const opened = revealedDigest !== undefined;
  return (
    <article className={`gift-reveal-box ${opened ? "is-open" : "is-closed"} ${reveal.tone}`}>
      <div className="gift-reveal-meta">
        <span>{t(`pred.kind.${reveal.kind}`)}</span>
        <span>{t("gift.match")} #{reveal.matchId}</span>
      </div>

      {opened ? (
        <div className="gift-reveal-receipt">
          <strong>{t(reveal.titleKey)}</strong>
          <p>{t(reveal.lineKey)}</p>
          <span>{reveal.points == null ? t("gift.noPoints") : `${reveal.points} ${t("gift.points")}`}</span>
          <div className="gift-proof-line">
            {OUTPUT_RECORDING_DISABLED
              ? t("gift.demoOnly")
              : revealedDigest
                ? `${t("gift.saved")}: ${revealedDigest.slice(0, 10)}...${revealedDigest.slice(-6)}`
                : ""}
          </div>
        </div>
      ) : (
        <button type="button" className="gift-reveal-button" onClick={() => void openGift()} aria-label={t("gift.open")} disabled={signing}>
          <span className="gift-reveal-icon" aria-hidden="true">
            <span className="gift-lid" />
            <span className="gift-body" />
          </span>
          <span>{OUTPUT_RECORDING_DISABLED ? t("gift.open") : signing ? t("gift.signing") : t("gift.signToOpen")}</span>
          {saveError && <em>{saveError}</em>}
        </button>
      )}
    </article>
  );
}

export function GiftRevealStrip({ predictions, walletAddress }: { predictions: MyPrediction[]; walletAddress: string }) {
  const { t } = useI18n();
  const [openedTick, setOpenedTick] = useState(0);
  const [showHistory, setShowHistory] = useState(false);

  const reveals = useMemo(() => buildGiftReveals(predictions, walletAddress), [predictions, walletAddress]);

  // Split into still-closed boxes (shown in the strip) and already-opened ones (kept for the history modal).
  const { unopened, opened } = useMemo(() => {
    void openedTick; // re-split whenever a box is opened
    const unopenedList: GiftReveal[] = [];
    const openedList: GiftReveal[] = [];
    for (const reveal of reveals) {
      (isGiftOpened(reveal.openedStorageKey, OUTPUT_RECORDING_DISABLED) ? openedList : unopenedList).push(reveal);
    }
    return { unopened: unopenedList.slice(0, 6), opened: openedList };
  }, [reveals, openedTick]);

  return (
    <div className="gift-reveal-strip" aria-live="polite">
      <div className="gift-reveal-heading">
        <span>{t("gift.kicker")}</span>
        <strong>{t("gift.title")}</strong>
        {opened.length > 0 && (
          <button type="button" className="gift-history-button" onClick={() => setShowHistory(true)}>
            {t("gift.history")} ({opened.length})
          </button>
        )}
      </div>

      {unopened.length > 0 ? (
        <div className="gift-reveal-grid">
          {unopened.map((reveal) => (
            <GiftRevealBox key={reveal.predictionId} reveal={reveal} onOpened={() => setOpenedTick((tick) => tick + 1)} />
          ))}
        </div>
      ) : (
        <p className="gift-reveal-empty">{opened.length > 0 ? t("gift.allOpened") : t("gift.empty")}</p>
      )}

      {showHistory && <GiftHistoryModal reveals={opened} onClose={() => setShowHistory(false)} />}
    </div>
  );
}
