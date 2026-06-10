// Boot splash card + cartoon chaos backdrop. Shared by App (animated line) and
// main.tsx Suspense fallback (static line), so the provider chunk can load behind it.
const BOOT_IMAGES = [
  "/gallery/cartoon-walrus-better-than-idols.svg",
  "/gallery/cartoon-ronaldo-airmail.svg",
  "/gallery/cartoon-messi-walking-chess.svg",
  "/gallery/cartoon-gyokeres-hair-xg.svg",
  "/gallery/cartoon-haaland-loading-service.svg",
  "/gallery/cartoon-england-penalty-lawyer.svg",
];

export function BootSplash({ line }: { line: string }) {
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
