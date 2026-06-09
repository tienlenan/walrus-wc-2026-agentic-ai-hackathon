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
  {
    id: "player-no10-dribble-loop",
    titleVi: "Số 10 rê bóng vào bộ nhớ đệm",
    titleEn: "No. 10 dribbles into cache",
    captionVi: "Highlight thì đẹp, quyết định cuối cùng thì cần Walrus kiểm toán.",
    captionEn: "Lovely highlights, final decision pending Walrus audit.",
    src: "/gallery/player-no10-dribble-loop.svg",
    blobId: "vXxTlj34SJCvwaTViZ6W3-W-WCvjtk58tV6NwwdJQGo",
    blobUrl: "https://aggregator.walrus-testnet.walrus.space/v1/blobs/vXxTlj34SJCvwaTViZ6W3-W-WCvjtk58tV6NwwdJQGo",
  },
  {
    id: "goalkeeper-loading-screen",
    titleVi: "Thủ môn đang tải phản xạ",
    titleEn: "Goalkeeper loading reflexes",
    captionVi: "Bóng tới rồi, thanh tiến trình vẫn ở 37%.",
    captionEn: "The shot arrived; the progress bar stayed at 37%.",
    src: "/gallery/goalkeeper-loading-screen.svg",
    blobId: "WVwXkzU_UsgGpnn7RJdnaYusyUwWldZRNC5lY3fdvrM",
    blobUrl: "https://aggregator.walrus-testnet.walrus.space/v1/blobs/WVwXkzU_UsgGpnn7RJdnaYusyUwWldZRNC5lY3fdvrM",
  },
  {
    id: "striker-offside-subscription",
    titleVi: "Tiền đạo mua gói việt vị năm",
    titleEn: "Striker bought annual offside",
    captionVi: "Vị trí đẹp, mỗi tội đẹp ở sai dòng thời gian.",
    captionEn: "Great position, unfortunately from the wrong timeline.",
    src: "/gallery/striker-offside-subscription.svg",
    blobId: "bQTrFc38zHS8XpGpqjASfjIytklAMTWy_X53ERCNnBA",
    blobUrl: "https://aggregator.walrus-testnet.walrus.space/v1/blobs/bQTrFc38zHS8XpGpqjASfjIytklAMTWy_X53ERCNnBA",
  },
  {
    id: "var-first-touch-review",
    titleVi: "VAR soi pha chạm bóng đầu tiên",
    titleEn: "VAR reviews first touch",
    captionVi: "Pha khống chế bóng cần ba góc quay và một lời xin lỗi.",
    captionEn: "That first touch needs three camera angles and an apology.",
    src: "/gallery/var-first-touch-review.svg",
    blobId: "6AqcSIWPoJWiCIPuTHmVcCNsltZjneO1AD9go-cX3UM",
    blobUrl: "https://aggregator.walrus-testnet.walrus.space/v1/blobs/6AqcSIWPoJWiCIPuTHmVcCNsltZjneO1AD9go-cX3UM",
  },
  {
    id: "captain-excuse-armband",
    titleVi: "Đội trưởng đeo băng biện minh",
    titleEn: "Captain wears the excuse armband",
    captionVi: "Tinh thần thủ lĩnh: nhận trách nhiệm sau khi đổ cho mặt cỏ.",
    captionEn: "Leadership means blaming the pitch with authority.",
    src: "/gallery/captain-excuse-armband.svg",
    blobId: "-6SefYATCnHx-hRzom2N1R_1EAcfokPXIdKfyahZQhE",
    blobUrl: "https://aggregator.walrus-testnet.walrus.space/v1/blobs/-6SefYATCnHx-hRzom2N1R_1EAcfokPXIdKfyahZQhE",
  },
  {
    id: "bench-legend-warmup",
    titleVi: "Huyền thoại khởi động ghế dự bị",
    titleEn: "Bench legend warms up",
    captionVi: "Đã sẵn sàng vào sân từ phút 12, vẫn đang chờ hết tournament.",
    captionEn: "Ready since minute 12, still waiting after the tournament.",
    src: "/gallery/bench-legend-warmup.svg",
    blobId: "o3xlMjnCh34YaNw_cZTG1qe-mMbu4Z0QGJWsUk04XtE",
    blobUrl: "https://aggregator.walrus-testnet.walrus.space/v1/blobs/o3xlMjnCh34YaNw_cZTG1qe-mMbu4Z0QGJWsUk04XtE",
  },
  {
    id: "fan-hopium-meter",
    titleVi: "Máy đo niềm tin cổ động viên",
    titleEn: "Fan hopium meter",
    captionVi: "Trước trận 99%, sau bàn thua đầu tiên chuyển sang cầu trời.",
    captionEn: "99% before kickoff, prayer mode after the first goal.",
    src: "/gallery/fan-hopium-meter.svg",
    blobId: "v7-5GAmmax_EvyvXHfsj4KhapWPM6HDfNaZoSYj95iU",
    blobUrl: "https://aggregator.walrus-testnet.walrus.space/v1/blobs/v7-5GAmmax_EvyvXHfsj4KhapWPM6HDfNaZoSYj95iU",
  },
  {
    id: "tactical-masterplan-napkin",
    titleVi: "Chiến thuật viết trên khăn giấy",
    titleEn: "Tactical masterplan on a napkin",
    captionVi: "Sơ đồ nhìn như thiên tài cho đến khi bóng lăn.",
    captionEn: "Genius on paper, improv comedy after kickoff.",
    src: "/gallery/tactical-masterplan-napkin.svg",
    blobId: "s7cRASleiQDFHOU6P3apq6oMJX-EZKY8_wpBABZOTm8",
    blobUrl: "https://aggregator.walrus-testnet.walrus.space/v1/blobs/s7cRASleiQDFHOU6P3apq6oMJX-EZKY8_wpBABZOTm8",
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
