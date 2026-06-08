import { useEffect, useRef, useState, type FormEvent } from "react";
import { askGil } from "../lib/gil-api";
import "./news-desk-chat.css";

interface Msg {
  role: "user" | "gil";
  text: string;
  memories?: string[];
}

const STARTERS = [
  "World Cup 2026 ai vô địch?",
  "Tôi là fan Brazil, Brazil sẽ vô địch!",
  "Cà khịa tuyển Anh giùm tôi.",
];

export function NewsDeskChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

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
      const reply = await askGil(msg);
      setMessages((m) => [...m, { role: "gil", text: reply.text, memories: reply.usedMemories }]);
    } catch {
      setError("Gil đang lạc đâu đó trong toà soạn… (đã chạy `pnpm dev:server` chưa?)");
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
        <span>🦭 Live from Gil's Desk</span>
        <span className="live-dot">● LIVE</span>
      </div>

      <div className="chat-log">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p>Phỏng vấn trực tiếp lão Gil. Hỏi gì cũng được — và coi chừng bị cà khịa.</p>
            <div className="starters">
              {STARTERS.map((s) => (
                <button key={s} className="starter" onClick={() => void send(s)} disabled={loading}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "msg msg-user" : "msg msg-gil"}>
            <div className="msg-label">{m.role === "user" ? "Bạn hỏi" : "Gil"}</div>
            <div className="msg-text">{m.text}</div>
            {m.memories && m.memories.length > 0 && (
              <div className="mem-note" title="Ký ức lấy từ Walrus Memory">
                📓 Gil nhớ: {m.memories.join(" · ")}
              </div>
            )}
          </div>
        ))}

        {loading && <div className="msg msg-gil loading">Gil đang lật sổ tay…</div>}
        {error && <div className="chat-error">{error}</div>}
        <div ref={endRef} />
      </div>

      <form className="chat-form" onSubmit={onSubmit}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Hỏi Gil về World Cup 2026, hay phán một kèo…"
          disabled={loading}
          aria-label="Tin nhắn gửi Gil"
        />
        <button type="submit" disabled={loading || !input.trim()}>
          Gửi
        </button>
      </form>
    </section>
  );
}
