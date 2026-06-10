import { useEffect, useMemo, useState } from "react";
import type { MyPrediction } from "../lib/game-api";
import { buildGiftReveals, type GiftReveal } from "../lib/gift-reveal";
import { useI18n } from "../lib/i18n";
import { useSuiOutputRecorder } from "../lib/sui-output-record";
import "./gift-reveal-strip.css";

const OUTPUT_RECORDING_DISABLED = import.meta.env.VITE_DISABLE_SUI_OUTPUT_RECORDING === "1";

function readOpened(key: string): boolean {
  try {
    return localStorage.getItem(key) === "opened";
  } catch {
    return false;
  }
}

function writeOpened(key: string): void {
  try {
    localStorage.setItem(key, "opened");
  } catch {
    /* ignore */
  }
}

function readSaved(key: string): string | null {
  try {
    return localStorage.getItem(`${key}:proof`);
  } catch {
    return null;
  }
}

function writeSaved(key: string, digest: string): void {
  try {
    localStorage.setItem(`${key}:proof`, digest);
  } catch {
    /* ignore */
  }
}

function GiftRevealBox({ reveal }: { reveal: GiftReveal }) {
  const { t } = useI18n();
  const recordOutput = useSuiOutputRecorder();
  const [savedDigest, setSavedDigest] = useState<string | null>(() => readSaved(reveal.openedStorageKey));
  const [opened, setOpened] = useState(() => readOpened(reveal.openedStorageKey) && (OUTPUT_RECORDING_DISABLED || Boolean(readSaved(reveal.openedStorageKey))));
  const [signing, setSigning] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const digest = readSaved(reveal.openedStorageKey);
    setSavedDigest(digest);
    setOpened(readOpened(reveal.openedStorageKey) && (OUTPUT_RECORDING_DISABLED || Boolean(digest)));
    setSaveError(null);
  }, [reveal.openedStorageKey]);

  async function openGift() {
    if (signing || opened) return;
    if (OUTPUT_RECORDING_DISABLED) {
      writeOpened(reveal.openedStorageKey);
      setOpened(true);
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
      writeSaved(reveal.openedStorageKey, proof.txDigest);
      writeOpened(reveal.openedStorageKey);
      setSavedDigest(proof.txDigest);
      setOpened(true);
    } catch {
      setSaveError(t("gift.saveErr"));
    } finally {
      setSigning(false);
    }
  }

  return (
    <article className={`gift-reveal-box ${opened ? "is-open" : "is-closed"} ${reveal.tone}`}>
      <div className="gift-reveal-meta">
        <span>{t(`pred.kind.${reveal.kind}`)}</span>
        <span>{t("gift.match")} #{reveal.matchId}</span>
      </div>

      {!opened ? (
        <button type="button" className="gift-reveal-button" onClick={() => void openGift()} aria-label={t("gift.open")} disabled={signing}>
          <span className="gift-reveal-icon" aria-hidden="true">
            <span className="gift-lid" />
            <span className="gift-body" />
          </span>
          <span>{OUTPUT_RECORDING_DISABLED ? t("gift.open") : signing ? t("gift.signing") : t("gift.signToOpen")}</span>
          {saveError && <em>{saveError}</em>}
        </button>
      ) : (
        <div className="gift-reveal-receipt">
          <strong>{t(reveal.titleKey)}</strong>
          <p>{t(reveal.lineKey)}</p>
          <span>{reveal.points == null ? t("gift.noPoints") : `${reveal.points} ${t("gift.points")}`}</span>
          <div className="gift-proof-line">{OUTPUT_RECORDING_DISABLED ? t("gift.demoOnly") : `${t("gift.saved")}: ${savedDigest?.slice(0, 10)}...${savedDigest?.slice(-6)}`}</div>
        </div>
      )}
    </article>
  );
}

export function GiftRevealStrip({ predictions, walletAddress }: { predictions: MyPrediction[]; walletAddress: string }) {
  const { t } = useI18n();
  const reveals = useMemo(() => buildGiftReveals(predictions, walletAddress).slice(0, 6), [predictions, walletAddress]);

  return (
    <div className="gift-reveal-strip" aria-live="polite">
      <div className="gift-reveal-heading">
        <span>{t("gift.kicker")}</span>
        <strong>{t("gift.title")}</strong>
      </div>

      {reveals.length > 0 ? (
        <div className="gift-reveal-grid">
          {reveals.map((reveal) => (
            <GiftRevealBox key={reveal.predictionId} reveal={reveal} />
          ))}
        </div>
      ) : (
        <p className="gift-reveal-empty">{t("gift.empty")}</p>
      )}
    </div>
  );
}
