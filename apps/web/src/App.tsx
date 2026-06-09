import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DeferredSection } from "./components/deferred-section";
import { useI18n } from "./lib/i18n";
import { useTimeSettings } from "./lib/time-settings";
import "./styles/ui-controls.css";

const loadWalletProviders = () => import("./wallet-providers").then((mod) => ({ default: mod.WalletProviders }));
const loadConnectBar = () => import("./components/connect-bar").then((mod) => ({ default: mod.ConnectBar }));
const loadNewsDeskChat = () => import("./components/news-desk-chat").then((mod) => ({ default: mod.NewsDeskChat }));
const loadSettingsPanel = () => import("./components/settings-panel").then((mod) => ({ default: mod.SettingsPanel }));
const loadPredictionsDesk = () => import("./components/predictions-desk").then((mod) => ({ default: mod.PredictionsDesk }));
const loadLeaderboard = () => import("./components/leaderboard").then((mod) => ({ default: mod.Leaderboard }));
const loadRoastWall = () => import("./components/roast-wall").then((mod) => ({ default: mod.RoastWall }));
const loadTeamProfiles = () => import("./components/team-profiles").then((mod) => ({ default: mod.TeamProfiles }));
const loadGalleryWall = () => import("./components/gallery-wall").then((mod) => ({ default: mod.GalleryWall }));
const loadMemoryNotebook = () => import("./components/memory-notebook").then((mod) => ({ default: mod.MemoryNotebook }));
const loadRuntimeTracking = () => import("./components/runtime-tracking").then((mod) => ({ default: mod.RuntimeTracking }));

const WalletProviders = lazy(loadWalletProviders);
const ConnectBar = lazy(loadConnectBar);
const NewsDeskChat = lazy(loadNewsDeskChat);
const SettingsPanel = lazy(loadSettingsPanel);
const PredictionsDesk = lazy(loadPredictionsDesk);
const Leaderboard = lazy(loadLeaderboard);
const RoastWall = lazy(loadRoastWall);
const TeamProfiles = lazy(loadTeamProfiles);
const GalleryWall = lazy(loadGalleryWall);
const MemoryNotebook = lazy(loadMemoryNotebook);
const RuntimeTracking = lazy(loadRuntimeTracking);

type ReferencePageKey = "team-profiles" | "gallery" | "notebook" | "tracking";

const REFERENCE_PAGES = new Set<string>(["team-profiles", "gallery", "notebook", "tracking"]);
const BOOT_IMAGES = [
  "/gallery/cartoon-walrus-better-than-idols.svg",
  "/gallery/cartoon-ronaldo-airmail.svg",
  "/gallery/cartoon-messi-walking-chess.svg",
  "/gallery/cartoon-gyokeres-hair-xg.svg",
  "/gallery/cartoon-haaland-loading-service.svg",
  "/gallery/cartoon-england-penalty-lawyer.svg",
];
const VI_BOOT_LINES = [
  "Gil đang hỏi VAR xem ai dự đoán tệ nhất.",
  "Walrus đang niêm phong biên lai nhục.",
  "Đang kiểm tra xem cú sút phạt bay tới tiểu bang nào.",
  "Sổ ký ức mở hơi chậm vì nhiều kèo mõm quá.",
] as const;
const EN_BOOT_LINES = [
  "Gil is asking VAR who cooked the worst prediction.",
  "Walrus is laminating the shame receipts.",
  "Checking which zip code that free kick landed in.",
  "Memory is loading slowly because the takes are heavy.",
] as const;
const BOOT_LINES = {
  vi: VI_BOOT_LINES,
  en: EN_BOOT_LINES,
} as const;
const BOOT_SPLASH_MIN_MS = 10000;

function currentHash(): string {
  return window.location.hash.replace(/^#/, "");
}

function bootLineFor(lang: "vi" | "en", index: number): string {
  const lines = BOOT_LINES[lang];
  return lines[index % lines.length] ?? EN_BOOT_LINES[0];
}

function preloadHomeChunks(): Promise<unknown> {
  return Promise.all([
    loadWalletProviders(),
    loadConnectBar(),
    loadNewsDeskChat(),
    loadPredictionsDesk(),
    loadLeaderboard(),
    loadRoastWall(),
  ]);
}

export default function App() {
  const { t, lang, setLang } = useI18n();
  const { formatDate, timeZoneLabel } = useTimeSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hash, setHash] = useState(currentHash);
  const [routeLoading, setRouteLoading] = useState(false);
  const [bootSplashVisible, setBootSplashVisible] = useState(true);
  const [bootLineIndex, setBootLineIndex] = useState(() => Math.floor(Math.random() * EN_BOOT_LINES.length));
  const routeLoadingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const lineTimer = window.setInterval(() => {
      setBootLineIndex((value) => (value + 1) % EN_BOOT_LINES.length);
    }, 2000);
    const frame = window.requestAnimationFrame(() => {
      document.documentElement.classList.add("app-ready");
    });
    const minSplash = new Promise((resolve) => window.setTimeout(resolve, BOOT_SPLASH_MIN_MS));
    void Promise.all([minSplash, preloadHomeChunks().catch(() => undefined)]).then(() => {
      if (!cancelled) {
        setBootSplashVisible(false);
      }
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      window.clearInterval(lineTimer);
    };
  }, []);

  useEffect(() => {
    const updateHash = () => {
      if (routeLoadingTimerRef.current !== null) {
        window.clearTimeout(routeLoadingTimerRef.current);
      }
      setRouteLoading(true);
      setHash(currentHash());
      routeLoadingTimerRef.current = window.setTimeout(() => {
        setRouteLoading(false);
        routeLoadingTimerRef.current = null;
      }, 520);
    };
    window.addEventListener("hashchange", updateHash);
    return () => {
      window.removeEventListener("hashchange", updateHash);
      if (routeLoadingTimerRef.current !== null) {
        window.clearTimeout(routeLoadingTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("app-route-loading", routeLoading);
    return () => document.documentElement.classList.remove("app-route-loading");
  }, [routeLoading]);

  const referencePage = useMemo(() => (REFERENCE_PAGES.has(hash) ? (hash as ReferencePageKey) : null), [hash]);

  const date = formatDate(new Date(), {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="paper">
      {bootSplashVisible && <BootSplash line={bootLineFor(lang, bootLineIndex)} />}

      <Suspense fallback={<div className="press-bar press-bar-loading">Loading wallet desk...</div>}>
        <WalletProviders>
          <ConnectBar />
        </WalletProviders>
      </Suspense>

      <div className="utility-bar">
        <div className="lang-toggle" role="group" aria-label={t("ui.langLabel")}>
          <button className={lang === "vi" ? "on" : ""} onClick={() => setLang("vi")}>
            VI
          </button>
          <button className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>
            EN
          </button>
        </div>
        <button type="button" className="settings-btn" onClick={() => setSettingsOpen(true)}>
          {t("set.open")}
        </button>
      </div>

      <header className="masthead">
        <div className="eyebrow">{t("brand.eyebrow")}</div>
        <div className="masthead-brand-row">
          <img className="app-logo-mark" src="/app-icon.svg" alt="" aria-hidden="true" />
          <h1 className="nameplate">Gil's VAR Shamebook</h1>
        </div>
        <div className="tagline">{t("brand.tagline")}</div>
        <div className="dateline">
          <span>{t("brand.est")}</span>
          <span>{date}</span>
          <span>{timeZoneLabel}</span>
          <span>{t("brand.edition")}</span>
        </div>
      </header>

      <main className="lead-block">
        <div className="kicker">{t("lead.kicker")}</div>
        <h2 className="headline">{t("lead.headline")}</h2>
        <p className="lede">
          <span className="dropcap">{t("lead.lede").charAt(0)}</span>
          {t("lead.lede").slice(1)}
        </p>
      </main>

      <nav className="edition-nav" aria-label="Edition sections">
        <NavLink href="#newsroom" label={t("nav.gil")} />
        <NavLink href="#predictions" label={t("nav.predictions")} />
        <NavLink href="#leaderboard" label={t("nav.leaderboard")} />
        <NavLink href="#roasts" label={t("nav.roasts")} />
        <NavLink href="#team-profiles" label={t("nav.teams")} reference />
        <NavLink href="#gallery" label={t("nav.gallery")} reference />
        <NavLink href="#notebook" label={t("nav.notebook")} reference />
        <NavLink href="#tracking" label={t("nav.tracking")} reference />
      </nav>

      <div className={`route-load-strip ${routeLoading ? "is-active" : ""}`} role="status" aria-live="polite">
        <img src="/app-icon.svg" alt="" aria-hidden="true" />
        <span>{t("ui.loadingStrip")}</span>
      </div>

      {referencePage ? (
        <ReferencePage page={referencePage} />
      ) : (
        <>
          <div id="newsroom" className="section-anchor">
            <Suspense fallback={<SectionSkeleton title={t("nav.gil")} />}>
              <WalletProviders>
                <NewsDeskChat onOpenSettings={() => setSettingsOpen(true)} />
              </WalletProviders>
            </Suspense>
          </div>
          <div id="predictions" className="section-anchor">
            <DeferredSection fallback={<SectionSkeleton title={t("nav.predictions")} />}>
              <Suspense fallback={<SectionSkeleton title={t("nav.predictions")} />}>
                <WalletProviders>
                  <PredictionsDesk />
                </WalletProviders>
              </Suspense>
            </DeferredSection>
          </div>
          <div id="leaderboard" className="section-anchor">
            <DeferredSection fallback={<SectionSkeleton title={t("nav.leaderboard")} />}>
              <Suspense fallback={<SectionSkeleton title={t("nav.leaderboard")} />}>
                <WalletProviders>
                  <Leaderboard />
                </WalletProviders>
              </Suspense>
            </DeferredSection>
          </div>
          <div id="roasts" className="section-anchor">
            <DeferredSection fallback={<SectionSkeleton title={t("nav.roasts")} />}>
              <Suspense fallback={<SectionSkeleton title={t("nav.roasts")} />}>
                <WalletProviders>
                  <RoastWall />
                </WalletProviders>
              </Suspense>
            </DeferredSection>
          </div>
        </>
      )}

      <footer className="footer">
        <span className="stamp">{t("footer.stamp")}</span>
        <span className="footer-text">{t("footer.text")}</span>
      </footer>

      {settingsOpen && (
        <Suspense fallback={null}>
          <SettingsPanel onClose={() => setSettingsOpen(false)} />
        </Suspense>
      )}
    </div>
  );
}

function BootSplash({ line }: { line: string }) {
  return (
    <div className="boot-splash-stage" role="status" aria-live="polite">
      <div className="boot-chaos" aria-hidden="true">
        {BOOT_IMAGES.map((src, index) => (
          <img key={src} className={`boot-chaos-card card-${index + 1}`} src={src} alt="" />
        ))}
      </div>
      <div className="boot-splash-card">
        <img src="/app-icon.svg" alt="" aria-hidden="true" />
        <span>Loading the evidence desk</span>
        <strong>{line}</strong>
      </div>
    </div>
  );
}

function SectionSkeleton({ title }: { title: string }) {
  return (
    <div className="section-skeleton" aria-hidden="true">
      <span>{title}</span>
    </div>
  );
}

function NavLink({ href, label, reference = false }: { href: string; label: string; reference?: boolean }) {
  const { t } = useI18n();
  return (
    <a className={reference ? "reference-link" : undefined} href={href} title={reference ? t("nav.referenceHint") : undefined}>
      <span>{label}</span>
      {reference && (
        <span className="reference-icon" aria-hidden="true">
          ↗
        </span>
      )}
    </a>
  );
}

function ReferencePage({ page }: { page: ReferencePageKey }) {
  const { t } = useI18n();
  const content: Record<ReferencePageKey, ReactNode> = {
    "team-profiles": <TeamProfiles />,
    gallery: <GalleryWall />,
    notebook: (
      <WalletProviders>
        <MemoryNotebook />
      </WalletProviders>
    ),
    tracking: <RuntimeTracking />,
  };

  return (
    <main className="reference-page">
      <div className="reference-page-head">
        <div>
          <div className="reference-kicker">{t("reference.kicker")}</div>
          <h2>{t(`reference.${page}.title`)}</h2>
          <p>{t(`reference.${page}.copy`)}</p>
        </div>
        <a href="#newsroom">{t("reference.back")}</a>
      </div>
      <div className="reference-page-body">
        <Suspense fallback={<SectionSkeleton title={t(`reference.${page}.title`)} />}>{content[page]}</Suspense>
      </div>
    </main>
  );
}
