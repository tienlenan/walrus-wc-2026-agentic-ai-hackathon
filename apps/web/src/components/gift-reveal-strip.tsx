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

function GiftRevealBox({ reveal, onOpened }: { reveal: GiftReveal; onOpened: () => void }) {
  const { t } = useI18n();
  const recordOutput = useSuiOutputRecorder();
  const [signing, setSigning] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setSaveError(null);
  }, [reveal.openedStorageKey]);

  async function openGift() {
    if (signing) return;
    if (OUTPUT_RECORDING_DISABLED) {
      writeGiftOpened(reveal.openedStorageKey);
      onOpened();
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
      writeGiftProof(reveal.openedStorageKey, proof.txDigest);
      writeGiftOpened(reveal.openedStorageKey);
      onOpened();
    } catch {
      setSaveError(t("gift.saveErr"));
    } finally {
      setSigning(false);
    }
  }

  // Opened boxes are filtered out by the strip, so a rendered box is always still closed.
  return (
    <article className={`gift-reveal-box is-closed ${reveal.tone}`}>
      <div className="gift-reveal-meta">
        <span>{t(`pred.kind.${reveal.kind}`)}</span>
        <span>{t("gift.match")} #{reveal.matchId}</span>
      </div>

      <button type="button" className="gift-reveal-button" onClick={() => void openGift()} aria-label={t("gift.open")} disabled={signing}>
        <span className="gift-reveal-icon" aria-hidden="true">
          <span className="gift-lid" />
          <span className="gift-body" />
        </span>
        <span>{OUTPUT_RECORDING_DISABLED ? t("gift.open") : signing ? t("gift.signing") : t("gift.signToOpen")}</span>
        {saveError && <em>{saveError}</em>}
      </button>
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
