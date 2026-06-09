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

const DEFAULT_SUGGESTIONS = {
  vi: [
    "Hỏi lịch thi đấu hôm nay và trận nào còn mở kèo.",
    "Cà khịa Brazil nhưng đừng quên nhắc Argentina.",
    "Troll Ronaldo, rồi tiện tay kéo Messi vào phiên tòa.",
    "Tôi nên dự đoán trận nào để đỡ bị Gil treo lên bảng nhục?",
    "Roast tuyển Anh như thể VAR cũng thấy ngại.",
    "Kèo nào đang mở on-chain? Gil đọc biên lai cho tôi.",
  ],
  en: [
    "Ask today's fixtures and which matches are still open.",
    "Roast Brazil, then drag Argentina into the courtroom.",
    "Troll Ronaldo, and make Messi catch a stray too.",
    "Which prediction can I make without funding Gil's comedy fund?",
    "Roast England like even VAR feels embarrassed.",
    "Which on-chain gates are open? Read me the receipts.",
  ],
};

const CONTEXT_SUGGESTIONS = [
  {
    keys: ["ronaldo", "cr7", "cristiano"],
    vi: [
      "Nếu troll Ronaldo sút phạt bắn chim thì kéo Messi đi bộ vuốt râu vào luôn.",
      "So sánh Ronaldo runway sút phạt với Messi đi bộ mở khóa hàng thủ.",
      "Portugal còn kèo nào mở để CR7 ký biên lai không?",
    ],
    en: [
      "If Ronaldo's free kick hits row Z, make Messi's walking chess catch a stray.",
      "Compare Ronaldo's runway free kicks with Messi strolling through defensive paperwork.",
      "Which Portugal matches are open for a CR7 receipt?",
    ],
  },
  {
    keys: ["messi", "leo"],
    vi: [
      "Troll Messi đi bộ vuốt râu, rồi tiện tay hỏi Ronaldo sút phạt bay tới đâu.",
      "Argentina gặp ai sắp tới và kèo nào còn mở?",
      "So Messi walking chess với Ronaldo launch window đi Gil.",
    ],
    en: [
      "Roast Messi's walking chess, then ask where Ronaldo's free kick landed.",
      "Who do Argentina play next and which gates are still open?",
      "Compare Messi walking through a chessboard with Ronaldo requesting a launch window.",
    ],
  },
  {
    keys: ["gyokeres", "gyökeres", "viktor", "sweden", "thụy điển"],
    vi: [
      "Troll Gyokeres vuốt tóc, rồi hỏi Haaland có cần thợ giao bóng không.",
      "Nếu vuốt tóc tính xG thì Sweden đang đứng đâu trên bảng?",
      "Sweden còn trận nào mở kèo để Gil ghi biên lai?",
    ],
    en: [
      "Roast Gyokeres checking the hair, then ask whether Haaland needs delivery service.",
      "If hair checks counted as xG, where would Sweden rank?",
      "Which Sweden matches are still open for Gil's receipt desk?",
    ],
  },
  {
    keys: ["odegaard", "ødegaard", "oodegaard", "norway", "na uy"],
    vi: [
      "Troll Odegaard nhấp nhử quả bóng, rồi kéo Haaland loading spinner vào.",
      "Norway có lịch nào để Haaland không phải tự ship bóng không?",
      "So Odegaard scan 4K với Messi đi bộ chess-master.",
    ],
    en: [
      "Roast Odegaard interviewing the ball, then drag Haaland's loading spinner into it.",
      "Which Norway fixture lets Haaland receive actual service?",
      "Compare Odegaard scanning in 4K with Messi's walking chess routine.",
    ],
  },
  {
    keys: ["haaland", "erling"],
    vi: [
      "Troll Haaland robot ghi bàn, rồi hỏi Odegaard có deliver bóng đúng hẹn không.",
      "Norway còn trận nào mở kèo và Gil đánh giá cửa sao?",
      "Nếu Haaland đói bóng thì ai trên Norway đáng bị roast?",
    ],
    en: [
      "Roast Haaland's goal robot mode, then ask whether Odegaard delivers on time.",
      "Which Norway matches are open and how risky is the bet?",
      "If Haaland gets starved, who in Norway deserves the roast?",
    ],
  },
  {
    keys: ["brazil", "brazin", "brasil", "bra", "vini", "vinicius"],
    vi: [
      "Cà khịa Brazil nhảy samba, rồi kéo Argentina vào đối chứng.",
      "Roast Vini rê bóng như nộp đơn kiện hậu vệ.",
      "Brazil còn trận nào mở on-chain để ký kèo vô địch?",
    ],
    en: [
      "Roast Brazil's samba confidence, then subpoena Argentina for comparison.",
      "Roast Vini dribbling like he is filing a case against the full-back.",
      "Which Brazil gates are open for a champion receipt?",
    ],
  },
  {
    keys: ["argentina", "arg", "lautaro", "alvarez"],
    vi: [
      "Troll Argentina, nhưng nhớ kéo Brazil vào vì derby miệng không thể thiếu.",
      "Messi đi bộ chess-master thì Argentina cửa nào theo lịch?",
      "Argentina còn trận nào mở kèo để Gil lưu biên lai?",
    ],
    en: [
      "Roast Argentina, but drag Brazil in because football court needs both witnesses.",
      "If Messi is walking chess, what does Argentina's fixture path look like?",
      "Which Argentina matches are open for Gil to notarize?",
    ],
  },
  {
    keys: ["england", "anh", "kane", "harry"],
    vi: [
      "Roast England như thể penalty spot vừa gọi luật sư.",
      "Troll Kane rơi về midfield, rồi hỏi England còn kèo nào mở.",
      "England lịch tới thế nào và cửa tự làm meme là bao nhiêu?",
    ],
    en: [
      "Roast England like the penalty spot just hired a lawyer.",
      "Roast Kane dropping into midfield, then ask which England gates are open.",
      "What is England's next fixture and their probability of becoming a meme?",
    ],
  },
  {
    keys: ["france", "pháp", "mbappe", "mbappé"],
    vi: [
      "Troll Mbappe chạy nhanh tới mức chiến thuật bảng phải xin nghỉ.",
      "France còn trận nào mở và kèo nào ít làm Gil cười nhất?",
      "So Mbappe turbo mode với Vini courtroom dribble.",
    ],
    en: [
      "Roast Mbappe sprinting so fast the tactics board needs a sick day.",
      "Which France matches are open and which bet gives Gil the least comedy?",
      "Compare Mbappe turbo mode with Vini's courtroom dribble.",
    ],
  },
];

function shortDigest(digest: string): string {
  return `${digest.slice(0, 10)}...${digest.slice(-6)}`;
}

function normalizeForSuggestion(text: string): string {
  return text
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
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

  const contextText = normalizeForSuggestion([input, ...messages.slice(-4).map((message) => message.text)].join(" "));
  const contextualSuggestions = CONTEXT_SUGGESTIONS.filter((rule) =>
    rule.keys.some((key) => contextText.includes(normalizeForSuggestion(key))),
  ).flatMap((rule) => rule[lang]);
  const suggestions = [...contextualSuggestions, ...DEFAULT_SUGGESTIONS[lang]].filter(
    (suggestion, index, all) => all.indexOf(suggestion) === index,
  );
  const visibleSuggestions = suggestions.slice(0, contextualSuggestions.length > 0 ? 9 : 6);

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
        <span>{t("chat.live")}</span>
        <span className="live-dot">● LIVE</span>
      </div>
      <div className="suggestion-rail" aria-label={t("chat.suggestions")}>
        <div className="suggestion-title">{t(contextualSuggestions.length > 0 ? "chat.suggestionsContext" : "chat.suggestions")}</div>
        <div className="starters">
          {visibleSuggestions.map((s) => (
            <button key={s} className="starter" onClick={() => void send(s)} disabled={loading || !signedIn}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="chat-log">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p>{t("chat.empty")}</p>
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
