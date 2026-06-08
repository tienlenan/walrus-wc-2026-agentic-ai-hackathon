import { useEffect, useRef, useState, type FormEvent } from "react";
import { askGil } from "../lib/gil-api";
import { useI18n } from "../lib/i18n";
import { loadAiSettings, resolveAiLang } from "../lib/ai-settings";
import "./news-desk-chat.css";

interface Msg {
  role: "user" | "gil";
  text: string;
  memories?: string[];
}

export function NewsDeskChat() {
  const { t, lang } = useI18n();
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
    setInput("");
    setError(null);
    setMessages((m) => [...m, { role: "user", text: msg }]);
    setLoading(true);
    try {
      const ai = loadAiSettings();
      const reply = await askGil(msg, {
        lang: resolveAiLang(ai.aiLang, lang),
        instructions: ai.instructions || undefined,
      });
      setMessages((m) => [...m, { role: "gil", text: reply.text, memories: reply.usedMemories }]);
    } catch {
      setError(t("chat.error"));
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
      <div className="newsroom-head">
        <span>{t("chat.live")}</span>
        <span className="live-dot">● LIVE</span>
      </div>

      <div className="chat-log">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p>{t("chat.empty")}</p>
            <div className="starters">
              {starters.map((s) => (
                <button key={s} className="starter" onClick={() => void send(s)} disabled={loading}>
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
          disabled={loading}
          aria-label={t("chat.placeholder")}
        />
        <button type="submit" disabled={loading || !input.trim()}>
          {t("chat.send")}
        </button>
      </form>
    </section>
  );
}
