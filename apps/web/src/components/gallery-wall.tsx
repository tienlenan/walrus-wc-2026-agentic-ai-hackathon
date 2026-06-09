import { useState } from "react";
import { useI18n } from "../lib/i18n";
import "./gallery-wall.css";

interface GalleryItem {
  id: string;
  titleVi: string;
  titleEn: string;
  captionVi: string;
  captionEn: string;
  src: string;
  blobId: string | null;
  blobUrl: string | null;
}

const ITEMS: GalleryItem[] = [
  {
    id: "gil-memory-snitch",
    titleVi: "Gil nói quên, Walrus nói không",
    titleEn: "Gil forgot. Walrus did not.",
    captionVi: "Dành cho mọi pha giả vờ mất trí sau khi kèo đi vào lòng đất.",
    captionEn: "For every convenient memory loss after a prediction face-plants.",
    src: "/gallery/gil-memory-snitch.svg",
    blobId: "wYPcd-z5TFCcKBS0iLqEXpHHvok8qlN_vxj5OjoaUzU",
    blobUrl: "https://aggregator.walrus-testnet.walrus.space/v1/blobs/wYPcd-z5TFCcKBS0iLqEXpHHvok8qlN_vxj5OjoaUzU",
  },
  {
    id: "prediction-booth-closed",
    titleVi: "Quầy kèo đã đóng",
    titleEn: "Prediction booth closed",
    captionVi: "Bóng lăn rồi mới phán thì Gil gọi đó là đọc tường thuật.",
    captionEn: "Calling it after kickoff is just commentary wearing a fake moustache.",
    src: "/gallery/prediction-booth-closed.svg",
    blobId: "2_GSVBEv8svCU7OqhugOvG6ObzVfbe1wNUk-fvgfSX8",
    blobUrl: "https://aggregator.walrus-testnet.walrus.space/v1/blobs/2_GSVBEv8svCU7OqhugOvG6ObzVfbe1wNUk-fvgfSX8",
  },
  {
    id: "bad-take-receipt",
    titleVi: "Biên lai kèo lỗi",
    titleEn: "Bad take receipt",
    captionVi: "Không hoàn tiền, không xoá lịch sử, không thương lượng với Gil.",
    captionEn: "No refunds, no erasing history, no negotiating with Gil.",
    src: "/gallery/bad-take-receipt.svg",
    blobId: "PnG-6aw9qFYHy30Z2c52ncgb8SFaicsNeAhuoeIIA8U",
    blobUrl: "https://aggregator.walrus-testnet.walrus.space/v1/blobs/PnG-6aw9qFYHy30Z2c52ncgb8SFaicsNeAhuoeIIA8U",
  },
  {
    id: "oracle-roast-room",
    titleVi: "Oracle gõ búa",
    titleEn: "Oracle bangs the gavel",
    captionVi: "Trận đã chốt. Điểm đã tính. Sĩ diện tự lo.",
    captionEn: "Match settled. Points counted. Pride left unsponsored.",
    src: "/gallery/oracle-roast-room.svg",
    blobId: "OL4eWqRjomprlIT8NpimO8jORFjSnYySP_WRZ48tt2A",
    blobUrl: "https://aggregator.walrus-testnet.walrus.space/v1/blobs/OL4eWqRjomprlIT8NpimO8jORFjSnYySP_WRZ48tt2A",
  },
];

function shortBlob(id: string): string {
  return `${id.slice(0, 10)}...${id.slice(-8)}`;
}

export function GalleryWall() {
  const { lang, t } = useI18n();
  const [copied, setCopied] = useState<string | null>(null);

  async function copyBlob(item: GalleryItem) {
    if (!item.blobId) return;
    await navigator.clipboard.writeText(item.blobId);
    setCopied(item.id);
    window.setTimeout(() => setCopied(null), 1400);
  }

  return (
    <section className="gallery-wall">
      <div className="gallery-head">
        <div>
          <div className="gallery-kicker">{t("gallery.kicker")}</div>
          <h2>{t("gallery.title")}</h2>
        </div>
        <p>{t("gallery.subtitle")}</p>
      </div>

      <div className="gallery-grid">
        {ITEMS.map((item) => (
          <article className="gallery-card" key={item.id}>
            <img src={item.src} alt={lang === "en" ? item.titleEn : item.titleVi} loading="lazy" />
            <div className="gallery-card-copy">
              <span className={item.blobId ? "gallery-badge stored" : "gallery-badge"}>{item.blobId ? t("gallery.badge") : t("gallery.pending")}</span>
              <h3>{lang === "en" ? item.titleEn : item.titleVi}</h3>
              <p>{lang === "en" ? item.captionEn : item.captionVi}</p>
              <div className="gallery-actions">
                {item.blobUrl ? (
                  <a href={item.blobUrl} target="_blank" rel="noreferrer">
                    {t("gallery.openBlob")}
                  </a>
                ) : (
                  <span>{t("gallery.openBlob")}</span>
                )}
                <button type="button" disabled={!item.blobId} onClick={() => void copyBlob(item)}>
                  {copied === item.id ? t("common.copied") : t("gallery.copyBlob")}
                </button>
              </div>
              <code>{item.blobId ? shortBlob(item.blobId) : "blob: pending"}</code>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
