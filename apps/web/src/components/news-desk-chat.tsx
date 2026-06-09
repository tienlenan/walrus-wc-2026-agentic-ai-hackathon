import { useEffect, useRef, useState, type FormEvent } from "react";
import { askGil } from "../lib/gil-api";
import { useI18n } from "../lib/i18n";
import { loadAiSettings, resolveAiLang } from "../lib/ai-settings";
import { useSuiOutputRecorder } from "../lib/sui-output-record";
import { useVerifiedSession } from "../lib/wallet-session";
import "./news-desk-chat.css";

interface Msg {
  role: "user" | "gil";
  text: string;
  memories?: string[];
  proofDigest?: string;
}

function shortDigest(digest: string): string {
  return `${digest.slice(0, 10)}...${digest.slice(-6)}`;
}

export function NewsDeskChat({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { t, lang } = useI18n();
  const { signedIn } = useVerifiedSession();
  const recordOutput = useSuiOutputRecorder();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const starters = [t("starter.1"), t("starter.2"), t("starter.3")];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const msg = text.trim();
    if (!msg || loading) return;
    if (!signedIn) {
      setError("Connect wallet and sign in first.");
      return;
    }
    setInput("");
    setError(null);
    setMessages((m) => [...m, { role: "user", text: msg }]);
    setLoading(true);
    try {
      const ai = loadAiSettings();
      const reply = await askGil(msg, {
        lang: resolveAiLang(ai.aiLang, lang),
        roastSeverity: ai.roastSeverity,
        instructions: ai.instructions || undefined,
      });
      const proof = await recordOutput({
        outputKind: "chat",
        resourceType: "chat_message",
        resourceId: `chat-${Date.now().toString(36)}`,
        payload: { message: msg, reply: reply.text, usedMemories: reply.usedMemories },
        pointer: reply.outputPointer,
      });
      setMessages((m) => [...m, { role: "gil", text: reply.text, memories: reply.usedMemories, proofDigest: proof.txDigest }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("chat.error"));
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  return (
    <section className="newsroom">
      <div className="ai-tip">
        {t("set.tip")}{" "}
        <button type="button" className="ai-tip-link" onClick={onOpenSettings}>
          {t("set.open")}
        </button>
      </div>
      <div className="newsroom-head">
        <button type="button" className="newsroom-settings" onClick={onOpenSettings}>
          ⚙ {t("set.open")}
        </button>
        <span>{t("chat.live")}</span>
        <span className="live-dot">● LIVE</span>
      </div>

      <div className="chat-log">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p>{t("chat.empty")}</p>
            <div className="starters">
              {starters.map((s) => (
                <button key={s} className="starter" onClick={() => void send(s)} disabled={loading || !signedIn}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "msg msg-user" : "msg msg-gil"}>
            <div className="msg-label">{m.role === "user" ? t("chat.you") : t("chat.gil")}</div>
            <div className="msg-text">{m.text}</div>
            {m.memories && m.memories.length > 0 && (
              <div className="mem-note" title="Walrus Memory">
                {t("chat.remembers")} {m.memories.join(" · ")}
              </div>
            )}
            {m.proofDigest && <div className="mem-note">Sui OutputRecord {shortDigest(m.proofDigest)}</div>}
          </div>
        ))}

        {loading && <div className="msg msg-gil loading">{t("chat.loading")}</div>}
        {error && <div className="chat-error">{error}</div>}
        <div ref={endRef} />
      </div>

      <form className="chat-form" onSubmit={onSubmit}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("chat.placeholder")}
          disabled={loading || !signedIn}
          aria-label={t("chat.placeholder")}
        />
        <button type="submit" disabled={loading || !signedIn || !input.trim()}>
          {signedIn ? t("chat.send") : "Sign in first"}
        </button>
      </form>
    </section>
  );
}
