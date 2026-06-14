import { useEffect } from "react";
import { readGiftProof, type GiftReveal } from "../lib/gift-reveal";
import { useI18n } from "../lib/i18n";

const OUTPUT_RECORDING_DISABLED = import.meta.env.VITE_DISABLE_SUI_OUTPUT_RECORDING === "1";

function ProofLine({ reveal }: { reveal: GiftReveal }) {
  const { t } = useI18n();
  if (OUTPUT_RECORDING_DISABLED) return <span className="gift-history-proof">{t("gift.demoOnly")}</span>;
  const digest = readGiftProof(reveal.openedStorageKey);
  if (!digest) return null;
  return (
    <span className="gift-history-proof">
      {t("gift.saved")}: {digest.slice(0, 10)}...{digest.slice(-6)}
    </span>
  );
}

export function GiftHistoryModal({ reveals, onClose }: { reveals: GiftReveal[]; onClose: () => void }) {
  const { t } = useI18n();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="gift-history-backdrop" role="dialog" aria-modal="true" aria-label={t("gift.history")} onClick={onClose}>
      <div className="gift-history-modal" onClick={(event) => event.stopPropagation()}>
        <div className="gift-history-modal-head">
          <strong>{t("gift.historyTitle")}</strong>
          <button type="button" className="gift-history-close" onClick={onClose} aria-label={t("gift.close")}>
            ×
          </button>
        </div>

        {reveals.length > 0 ? (
          <ul className="gift-history-list">
            {reveals.map((reveal) => (
              <li key={reveal.predictionId} className={`gift-history-item ${reveal.tone}`}>
                <div className="gift-history-meta">
                  <span>{t(`pred.kind.${reveal.kind}`)}</span>
                  <span>
                    {t("gift.match")} #{reveal.matchId}
                  </span>
                </div>
                <strong>{t(reveal.titleKey)}</strong>
                <p>{t(reveal.lineKey)}</p>
                <span className="gift-history-points">
                  {reveal.points == null ? t("gift.noPoints") : `${reveal.points} ${t("gift.points")}`}
                </span>
                <ProofLine reveal={reveal} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="gift-history-empty">{t("gift.historyEmpty")}</p>
        )}
      </div>
    </div>
  );
}
