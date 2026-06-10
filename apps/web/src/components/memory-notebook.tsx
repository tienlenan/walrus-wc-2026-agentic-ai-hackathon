import { useEffect, useState } from "react";
import { getNotebook } from "../lib/world-cup-api";
import { useI18n } from "../lib/i18n";
import { useVerifiedSession } from "../lib/wallet-session";
import { useWalletSessionStore } from "../lib/wallet-session-store";
import "./memory-notebook.css";

export function MemoryNotebook() {
  const { t } = useI18n();
  const { signedIn } = useVerifiedSession();
  const clearSession = useWalletSessionStore((state) => state.clearSession);
  const [query, setQuery] = useState("bad takes, favourite teams, predictions, roasts");
  const [memories, setMemories] = useState<string[]>([]);
  const [memoryEnabled, setMemoryEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh(nextQuery = query) {
    if (!signedIn) {
      setMemories([]);
      setError(null);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const next = await getNotebook(nextQuery);
      setMemories(next.memories);
      setMemoryEnabled(next.memoryEnabled);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("401")) {
        clearSession();
        setMemories([]);
        setError(t("memory.sessionExpired"));
      } else {
        setError(t("memory.readErr"));
      }
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (signedIn) void refresh();
    else setMemories([]);
  }, [signedIn]);

  return (
    <section className="memory-notebook">
      <div className="notebook-head">
        <div>
          <div className="notebook-kicker">{t("memory.kicker")}</div>
          <h2>{t("memory.title")}</h2>
        </div>
        <span>{memoryEnabled ? t("memory.online") : t("memory.fallback")}</span>
      </div>

      <div className="before-after-live">
        <div>
          <span>{t("memory.before")}</span>
          <strong>{t("memory.fakeAmnesia")}</strong>
          <p>{t("memory.beforeCopy")}</p>
        </div>
        <div>
          <span>{t("memory.after")}</span>
          <strong>{signedIn ? (memories.length ? `${memories.length} ${t("memory.recalledNotes")}` : t("memory.noNotes")) : t("memory.walletRequired")}</strong>
          <p>{memories[0] ?? t("memory.afterCopy")}</p>
        </div>
      </div>

      <form
        className="notebook-query"
        onSubmit={(event) => {
          event.preventDefault();
          void refresh();
        }}
      >
        <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label={t("memory.queryLabel")} />
        <button type="submit" disabled={busy || !signedIn || !query.trim()}>
          {busy ? t("memory.reading") : signedIn ? t("memory.search") : t("common.signInFirst")}
        </button>
      </form>

      <div className="memory-list">
        {memories.map((memory, index) => (
          <div key={`${memory}-${index}`} className="memory-row">
            <span>{String(index + 1).padStart(2, "0")}</span>
            <p>{memory}</p>
          </div>
        ))}
        {!error && !busy && signedIn && memories.length === 0 && <div className="memory-empty">{t("memory.empty")}</div>}
      </div>

      {error && <div className="memory-error">{error}</div>}
    </section>
  );
}
