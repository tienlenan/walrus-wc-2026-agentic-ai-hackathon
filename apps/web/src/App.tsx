import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BootSplash } from "./components/boot-splash";
import { DeferredSection } from "./components/deferred-section";
import { getSession, subscribeSession } from "./lib/auth";
import { useI18n } from "./lib/i18n";
import { useTimeSettings } from "./lib/time-settings";
import "./styles/ui-controls.css";

const loadConnectBar = () => import("./components/connect-bar").then((mod) => ({ default: mod.ConnectBar }));
const loadNewsDeskChat = () => import("./components/news-desk-chat").then((mod) => ({ default: mod.NewsDeskChat }));
const loadSettingsPanel = () => import("./components/settings-panel").then((mod) => ({ default: mod.SettingsPanel }));
const loadPredictionsDesk = () => import("./components/predictions-desk").then((mod) => ({ default: mod.PredictionsDesk }));
const loadMyPredictionsManager = () => import("./components/my-predictions-manager").then((mod) => ({ default: mod.MyPredictionsManager }));
const loadLeaderboard = () => import("./components/leaderboard").then((mod) => ({ default: mod.Leaderboard }));
const loadRoastWall = () => import("./components/roast-wall").then((mod) => ({ default: mod.RoastWall }));
const loadTeamProfiles = () => import("./components/team-profiles").then((mod) => ({ default: mod.TeamProfiles }));
const loadGalleryWall = () => import("./components/gallery-wall").then((mod) => ({ default: mod.GalleryWall }));
const loadMemoryNotebook = () => import("./components/memory-notebook").then((mod) => ({ default: mod.MemoryNotebook }));
const loadRuntimeTracking = () => import("./components/runtime-tracking").then((mod) => ({ default: mod.RuntimeTracking }));
const loadDailyBriefings = () => import("./components/daily-briefings").then((mod) => ({ default: mod.DailyBriefings }));
const loadMatchCenter = () => import("./components/match-center").then((mod) => ({ default: mod.MatchCenter }));
const loadLatestBriefingTeaser = () => import("./components/latest-briefing-teaser").then((mod) => ({ default: mod.LatestBriefingTeaser }));
const loadGuidePage = () => import("./components/guide-page").then((mod) => ({ default: mod.GuidePage }));

const ConnectBar = lazy(loadConnectBar);
const NewsDeskChat = lazy(loadNewsDeskChat);
const SettingsPanel = lazy(loadSettingsPanel);
const PredictionsDesk = lazy(loadPredictionsDesk);
const MyPredictionsManager = lazy(loadMyPredictionsManager);
const Leaderboard = lazy(loadLeaderboard);
const RoastWall = lazy(loadRoastWall);
const TeamProfiles = lazy(loadTeamProfiles);
const GalleryWall = lazy(loadGalleryWall);
const MemoryNotebook = lazy(loadMemoryNotebook);
const RuntimeTracking = lazy(loadRuntimeTracking);
const DailyBriefings = lazy(loadDailyBriefings);
const MatchCenter = lazy(loadMatchCenter);
const LatestBriefingTeaser = lazy(loadLatestBriefingTeaser);
const GuidePage = lazy(loadGuidePage);

type ReferencePageKey = "guide" | "team-profiles" | "gallery" | "notebook" | "tracking" | "briefings" | "matches";

const REFERENCE_PAGES = new Set<string>(["guide", "team-profiles", "gallery", "notebook", "tracking", "briefings", "matches"]);
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
  "Walrus is sorting receipts before Gil starts yelling.",
] as const;
const BOOT_LINES = {
  vi: VI_BOOT_LINES,
  en: EN_BOOT_LINES,
} as const;
const BOOT_SPLASH_MIN_MS = 1800;
const GITHUB_URL = "https://github.com/tienlenan/walrus-wc-2026-agentic-ai-hackathon";
const COOKIE_CONSENT_KEY = "gil.cookie-consent.v1";
const ONBOARDING_SETTINGS_PREFIX = "gil:onboarding-settings:";

type LegalDialog = "privacy" | "terms" | null;

function currentHash(): string {
  return window.location.hash.replace(/^#/, "");
}

function loadCookieConsent(): boolean {
  try {
    return localStorage.getItem(COOKIE_CONSENT_KEY) === "accepted";
  } catch {
    return false;
  }
}

function onboardingKey(address: string): string {
  return `${ONBOARDING_SETTINGS_PREFIX}${address.toLowerCase()}`;
}

function bootLineFor(lang: "vi" | "en", index: number): string {
  const lines = BOOT_LINES[lang];
  return lines[index % lines.length] ?? EN_BOOT_LINES[0];
}

function preloadHomeChunks(): Promise<unknown> {
  return Promise.all([loadConnectBar(), loadPredictionsDesk()]);
}

export default function App() {
  const { t, lang, setLang } = useI18n();
  const { formatDate, timeZoneLabel } = useTimeSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsOnboarding, setSettingsOnboarding] = useState(false);
  const [legalDialog, setLegalDialog] = useState<LegalDialog>(null);
  const [cookieConsentVisible, setCookieConsentVisible] = useState(() => !loadCookieConsent());
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
    void preloadHomeChunks().catch(() => undefined);
    void minSplash.then(() => {
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
    const maybeOpenOnboarding = () => {
      const session = getSession();
      if (!session?.address) return;
      const key = onboardingKey(session.address);
      try {
        if (localStorage.getItem(key) === "done") return;
        localStorage.setItem(key, "done");
      } catch {
        // If storage is unavailable, show once for this session.
      }
      setSettingsOnboarding(true);
      setSettingsOpen(true);
    };
    maybeOpenOnboarding();
    return subscribeSession(maybeOpenOnboarding);
  }, []);

  function openSettings() {
    setSettingsOnboarding(false);
    setSettingsOpen(true);
  }

  function closeSettings() {
    setSettingsOpen(false);
    setSettingsOnboarding(false);
  }

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

  const referencePage = useMemo(() => {
    const key = hash.split("?")[0] ?? "";
    return REFERENCE_PAGES.has(key) ? (key as ReferencePageKey) : null;
  }, [hash]);

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
        <ConnectBar />
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
        <button type="button" className="settings-btn" onClick={openSettings}>
          {t("set.open")}
        </button>
        <a className="github-btn" href={GITHUB_URL} target="_blank" rel="noreferrer" aria-label={t("github.open")}>
          <GitHubIcon />
        </a>
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
        <NavLink href="#my-picks" label={t("nav.myPicks")} />
        <NavLink href="#leaderboard" label={t("nav.leaderboard")} />
        <NavLink href="#roasts" label={t("nav.roasts")} />
        <NavLink href="#guide" label={t("nav.guide")} reference />
        <NavLink href="#briefings" label={t("nav.briefings")} reference />
        <NavLink href="#matches" label={t("nav.matches")} reference />
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
          <Suspense fallback={null}>
            <LatestBriefingTeaser />
          </Suspense>
          <div id="newsroom" className="section-anchor">
            <Suspense fallback={<SectionSkeleton title={t("nav.gil")} />}>
              <NewsDeskChat onOpenSettings={openSettings} />
            </Suspense>
          </div>
          <div id="predictions" className="section-anchor">
            <DeferredSection fallback={<SectionSkeleton title={t("nav.predictions")} />}>
              <Suspense fallback={<SectionSkeleton title={t("nav.predictions")} />}>
                <PredictionsDesk />
              </Suspense>
            </DeferredSection>
          </div>
          <div id="my-picks" className="section-anchor">
            <DeferredSection fallback={<SectionSkeleton title={t("nav.myPicks")} />}>
              <Suspense fallback={<SectionSkeleton title={t("nav.myPicks")} />}>
                <MyPredictionsManager />
              </Suspense>
            </DeferredSection>
          </div>
          <div id="leaderboard" className="section-anchor">
            <DeferredSection fallback={<SectionSkeleton title={t("nav.leaderboard")} />}>
              <Suspense fallback={<SectionSkeleton title={t("nav.leaderboard")} />}>
                <Leaderboard />
              </Suspense>
            </DeferredSection>
          </div>
          <div id="roasts" className="section-anchor">
            <DeferredSection fallback={<SectionSkeleton title={t("nav.roasts")} />}>
              <Suspense fallback={<SectionSkeleton title={t("nav.roasts")} />}>
                <RoastWall />
              </Suspense>
            </DeferredSection>
          </div>
        </>
      )}

      <footer className="footer">
        <span className="stamp">{t("footer.stamp")}</span>
        <span className="footer-text">{t("footer.text")}</span>
        <nav className="footer-links" aria-label={t("footer.legalNav")}>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer">
            {t("footer.github")}
          </a>
          <button type="button" onClick={() => setLegalDialog("privacy")}>
            {t("footer.privacy")}
          </button>
          <button type="button" onClick={() => setLegalDialog("terms")}>
            {t("footer.terms")}
          </button>
        </nav>
      </footer>

      {cookieConsentVisible && (
        <CookieConsent
          onAccept={() => {
            try {
              localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
            } catch {
              // Ignore storage failures; consent still hides for this session.
            }
            setCookieConsentVisible(false);
          }}
          onOpenPrivacy={() => setLegalDialog("privacy")}
        />
      )}

      {legalDialog && <LegalDialogModal type={legalDialog} onClose={() => setLegalDialog(null)} />}

      {settingsOpen && (
        <Suspense fallback={null}>
          <SettingsPanel onClose={closeSettings} onboarding={settingsOnboarding} />
        </Suspense>
      )}
    </div>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 2C6.48 2 2 6.58 2 12.25c0 4.52 2.86 8.35 6.84 9.71.5.09.68-.22.68-.49 0-.24-.01-.88-.01-1.73-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.04 1.03-2.76-.1-.26-.45-1.31.1-2.72 0 0 .84-.28 2.75 1.05A9.3 9.3 0 0 1 12 6.96c.85 0 1.71.12 2.51.34 1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.46.1 2.72.64.72 1.03 1.64 1.03 2.76 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.8 0 .27.18.59.69.49A10.15 10.15 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z"
      />
    </svg>
  );
}

function CookieConsent({ onAccept, onOpenPrivacy }: { onAccept: () => void; onOpenPrivacy: () => void }) {
  const { t } = useI18n();
  return (
    <section className="cookie-consent" role="dialog" aria-live="polite" aria-label={t("cookie.title")}>
      <div>
        <strong>{t("cookie.title")}</strong>
        <p>{t("cookie.copy")}</p>
      </div>
      <div className="cookie-actions">
        <button type="button" className="cookie-secondary" onClick={onOpenPrivacy}>
          {t("cookie.privacy")}
        </button>
        <button type="button" className="cookie-primary" onClick={onAccept}>
          {t("cookie.accept")}
        </button>
      </div>
    </section>
  );
}

function LegalDialogModal({ type, onClose }: { type: Exclude<LegalDialog, null>; onClose: () => void }) {
  const { t } = useI18n();
  const prefix = `legal.${type}`;
  return (
    <div className="legal-overlay" onClick={onClose} role="presentation">
      <section className="legal-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby={`${type}-title`}>
        <div className="legal-head">
          <div>
            <span>{t("legal.kicker")}</span>
            <h3 id={`${type}-title`}>{t(`${prefix}.title`)}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label={t("set.close")}>
            ×
          </button>
        </div>
        <div className="legal-body">
          {[1, 2, 3, 4].map((item) => (
            <p key={item}>{t(`${prefix}.${item}`)}</p>
          ))}
        </div>
        <div className="legal-actions">
          <button type="button" onClick={onClose}>
            {t("legal.close")}
          </button>
        </div>
      </section>
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
    guide: <GuidePage />,
    "team-profiles": <TeamProfiles />,
    gallery: <GalleryWall />,
    briefings: <DailyBriefings />,
    matches: <MatchCenter />,
    notebook: <MemoryNotebook />,
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
