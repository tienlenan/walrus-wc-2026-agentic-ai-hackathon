import { useState } from "react";
import { useI18n } from "../lib/i18n";
import "./gallery-wall.css";

interface GalleryItem {
  id: string;
  title: string;
  caption: string;
  src: string;
  blobId: string | null;
  blobUrl: string | null;
}

const ITEMS: GalleryItem[] = [
  {
    id: "cartoon-walrus-better-than-idols",
    title: "Gil kicks better than your idol",
    caption: "Cartoon roast: Gil bicycle-kicks into every idol debate Walrus Memory refuses to forget.",
    src: "/gallery/cartoon-walrus-better-than-idols.svg",
    blobId: "cbqHFwl4XMnsokNRbH5NLBBA1aLeiSwQU50gpHUM54I",
    blobUrl: "https://aggregator.walrus-mainnet.walrus.space/v1/blobs/cbqHFwl4XMnsokNRbH5NLBBA1aLeiSwQU50gpHUM54I",
  },
  {
    id: "cartoon-ronaldo-airmail",
    title: "Ronaldo free-kick airmail",
    caption: "Cartoon roast: number seven requests a launch window and the goal is not the destination.",
    src: "/gallery/cartoon-ronaldo-airmail.svg",
    blobId: "E33WFoY9f0slnYJ3SsEHlLLO2pJAK0HrOk8V0QHU7Tk",
    blobUrl: "https://aggregator.walrus-mainnet.walrus.space/v1/blobs/E33WFoY9f0slnYJ3SsEHlLLO2pJAK0HrOk8V0QHU7Tk",
  },
  {
    id: "cartoon-messi-walking-chess",
    title: "Messi walking chess mode",
    caption: "Cartoon roast: three steps, one beard stroke, and the back line becomes paperwork.",
    src: "/gallery/cartoon-messi-walking-chess.svg",
    blobId: "mbAuccmovf7ZNUbu1YdW85e-ePXivHEat-XS3gxTThg",
    blobUrl: "https://aggregator.walrus-mainnet.walrus.space/v1/blobs/mbAuccmovf7ZNUbu1YdW85e-ePXivHEat-XS3gxTThg",
  },
  {
    id: "cartoon-gyokeres-hair-xg",
    title: "Gyokeres hair-check xG",
    caption: "Cartoon roast: if hair checks counted as xG, Sweden would already be top.",
    src: "/gallery/cartoon-gyokeres-hair-xg.svg",
    blobId: "OW8ij-GYSAW1Ufi-pKome0RFo_2fJLya6ujjxiNUNrU",
    blobUrl: "https://aggregator.walrus-mainnet.walrus.space/v1/blobs/OW8ij-GYSAW1Ufi-pKome0RFo_2fJLya6ujjxiNUNrU",
  },
  {
    id: "cartoon-haaland-loading-service",
    title: "Haaland waiting for service",
    caption: "Cartoon roast: the goal robot is ready, but the delivery app is stuck at 37%.",
    src: "/gallery/cartoon-haaland-loading-service.svg",
    blobId: "PPhfVjOivHB3AlJi778DOFncNPqEmyg79fkhpczxMvE",
    blobUrl: "https://aggregator.walrus-mainnet.walrus.space/v1/blobs/PPhfVjOivHB3AlJi778DOFncNPqEmyg79fkhpczxMvE",
  },
  {
    id: "cartoon-odegaard-ball-interview",
    title: "Odegaard interviews the ball",
    caption: "Cartoon roast: the pass is pending background check while the defence buys anxiety premium.",
    src: "/gallery/cartoon-odegaard-ball-interview.svg",
    blobId: "bozWsYWA5mqcAY1NO37BsMmzudbJ83Va0njEbxV8EwY",
    blobUrl: "https://aggregator.walrus-mainnet.walrus.space/v1/blobs/bozWsYWA5mqcAY1NO37BsMmzudbJ83Va0njEbxV8EwY",
  },
  {
    id: "cartoon-brazil-samba-audit",
    title: "Brazil samba confidence audit",
    caption: "Cartoon roast: evidence requested before dancing through July.",
    src: "/gallery/cartoon-brazil-samba-audit.svg",
    blobId: "h8buzNUdOUmGr3L5K2csOh7LURtARvNqX0WXFcVg_OA",
    blobUrl: "https://aggregator.walrus-mainnet.walrus.space/v1/blobs/h8buzNUdOUmGr3L5K2csOh7LURtARvNqX0WXFcVg_OA",
  },
  {
    id: "cartoon-england-penalty-lawyer",
    title: "England penalty spot lawyer",
    caption: "Cartoon roast: the penalty spot hired counsel before the whistle.",
    src: "/gallery/cartoon-england-penalty-lawyer.svg",
    blobId: "R52vk-xpizXNdru7kIpDkHSVJZgPtGy03p3GcyA-VcE",
    blobUrl: "https://aggregator.walrus-mainnet.walrus.space/v1/blobs/R52vk-xpizXNdru7kIpDkHSVJZgPtGy03p3GcyA-VcE",
  },
  {
    id: "cartoon-vini-courtroom-dribble",
    title: "Vini courtroom dribble",
    caption: "Cartoon roast: the full-back is guilty of needing a map.",
    src: "/gallery/cartoon-vini-courtroom-dribble.svg",
    blobId: "K-p2KEgUpy5g9gvYqHk_2mODVa2S1rJ-7aWdTeeyo5s",
    blobUrl: "https://aggregator.walrus-mainnet.walrus.space/v1/blobs/K-p2KEgUpy5g9gvYqHk_2mODVa2S1rJ-7aWdTeeyo5s",
  },
  {
    id: "cartoon-fan-hopium-crash",
    title: "Fan hopium market crash",
    caption: "Cartoon roast: kickoff turned optimism into paperwork.",
    src: "/gallery/cartoon-fan-hopium-crash.svg",
    blobId: "vPMwpD6oOH6hmZ0pv4xI3jcHdGfUxNnsbrk2A1xXU6I",
    blobUrl: "https://aggregator.walrus-mainnet.walrus.space/v1/blobs/vPMwpD6oOH6hmZ0pv4xI3jcHdGfUxNnsbrk2A1xXU6I",
  },
  {
    id: "cartoon-var-first-touch-apology",
    title: "VAR first touch apology",
    caption: "Cartoon roast: three camera angles and one apology letter.",
    src: "/gallery/cartoon-var-first-touch-apology.svg",
    blobId: "FT32K0uPHpZ7tTJ_rmosjJDyRVNwA-ew2A1QLGiE2dA",
    blobUrl: "https://aggregator.walrus-mainnet.walrus.space/v1/blobs/FT32K0uPHpZ7tTJ_rmosjJDyRVNwA-ew2A1QLGiE2dA",
  },
  {
    id: "cartoon-goalkeeper-buffering",
    title: "Goalkeeper buffering",
    caption: "Cartoon roast: the shot arrived before the reflex update.",
    src: "/gallery/cartoon-goalkeeper-buffering.svg",
    blobId: "4VV2LYcxeFY02JUnqMEbxhAGB-hN_emTmvWQgbRMRcs",
    blobUrl: "https://aggregator.walrus-mainnet.walrus.space/v1/blobs/4VV2LYcxeFY02JUnqMEbxhAGB-hN_emTmvWQgbRMRcs",
  },
];

function shortBlob(id: string): string {
  return `${id.slice(0, 10)}...${id.slice(-8)}`;
}

export function GalleryWall() {
  const { t } = useI18n();
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
            <img src={item.src} alt={item.title} loading="lazy" />
            <div className="gallery-card-copy">
              <span className={item.blobId ? "gallery-badge stored" : "gallery-badge"}>{item.blobId ? t("gallery.badge") : t("gallery.pending")}</span>
              <h3>{item.title}</h3>
              <p>{item.caption}</p>
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
