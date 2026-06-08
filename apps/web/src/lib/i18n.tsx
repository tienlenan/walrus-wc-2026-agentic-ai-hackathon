import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type Lang = "vi" | "en";

// Flat dictionary keyed by string id. Add UI strings here; t() falls back vi → key.
const DICT: Record<Lang, Record<string, string>> = {
  vi: {
    "brand.eyebrow": "Powered by Walrus · Mainnet · Trust the Tusk",
    "brand.tagline": "Memory Edition — FIFA World Cup 2026",
    "brand.est": "EST. 2026",
    "brand.edition": "No. 001 · ấn bản memory",
    "lead.kicker": "Độc quyền từ bàn bình luận",
    "lead.headline": "“Tôi nhớ hết mấy kèo trật của ông.”",
    "lead.lede":
      "Gil — chú hải mã bình luận viên già đời — theo dõi từng dự đoán World Cup 2026 của bạn, lưu vĩnh viễn trên Walrus, rồi cà khịa bằng chính lịch sử của bạn. Càng dùng lâu, Gil càng biết rõ… và càng phũ. Hỏi thử lão xem.",
    "sec.pred.k": "Bàn dự đoán",
    "sec.pred.b": "Đặt kèo từng trận. Gil ghi sổ — và không bao giờ quên.",
    "sec.board.k": "Bảng xếp hạng",
    "sec.board.b": "Xếp hạng độ chính xác. Realtime, và phũ phàng.",
    "sec.ba.k": "Before / After",
    "sec.ba.b": "Gil ngày 1 vs Gil ngày N. Bằng chứng trí nhớ thật.",
    "sec.note.k": "Sổ tay của Gil",
    "sec.note.b": "Mọi thứ Gil nhớ về bạn — lưu trên Walrus, xác minh on-chain.",
    "sec.soon": "Sắp ra mắt",
    "footer.stamp": "Stop Press",
    "footer.text": "Build: M3 · Mastra + Gemini + Walrus Memory + Sui · trí nhớ đang lên sóng…",
    "chat.live": "🦭 Trực tiếp từ bàn của Gil",
    "chat.empty": "Phỏng vấn trực tiếp lão Gil. Hỏi gì cũng được — và coi chừng bị cà khịa.",
    "chat.you": "Bạn hỏi",
    "chat.gil": "Gil",
    "chat.remembers": "📓 Gil nhớ:",
    "chat.loading": "Gil đang lật sổ tay…",
    "chat.error": "Gil đang lạc đâu đó trong toà soạn… (server đã chạy chưa?)",
    "chat.placeholder": "Hỏi Gil về World Cup 2026, hay phán một kèo…",
    "chat.send": "Gửi",
    "starter.1": "World Cup 2026 ai vô địch?",
    "starter.2": "Tôi là fan Brazil, Brazil sẽ vô địch!",
    "starter.3": "Cà khịa tuyển Anh giùm tôi.",
    "set.open": "Cài đặt",
    "set.title": "Cài đặt AI",
    "set.aiLang": "Ngôn ngữ Gil trả lời",
    "set.auto": "Tự động (theo app)",
    "set.vi": "Tiếng Việt",
    "set.en": "English",
    "set.instr": "Chỉ dẫn riêng cho Gil (tuỳ chọn)",
    "set.instrPh": "VD: cà khịa nhẹ thôi, xưng “tớ”, tập trung tuyển Việt Nam…",
    "set.save": "Lưu",
    "set.close": "Đóng",
    "set.saved": "Đã lưu ✓",
    "set.tip": "💡 Bạn có thể chọn ngôn ngữ và thêm chỉ dẫn riêng cho Gil trong Cài đặt AI.",
    "ui.langLabel": "Ngôn ngữ",
  },
  en: {
    "brand.eyebrow": "Powered by Walrus · Mainnet · Trust the Tusk",
    "brand.tagline": "Memory Edition — FIFA World Cup 2026",
    "brand.est": "EST. 2026",
    "brand.edition": "No. 001 · memory edition",
    "lead.kicker": "Exclusive from the press desk",
    "lead.headline": "“I remember every bet you botched.”",
    "lead.lede":
      "Gil — the grizzled walrus pundit — tracks your every World Cup 2026 prediction, stores it forever on Walrus, then roasts you with your own history. The longer you use him, the better he knows you… and the harsher he gets. Go on, ask him.",
    "sec.pred.k": "Predictions Desk",
    "sec.pred.b": "Call every match. Gil writes it down — and never forgets.",
    "sec.board.k": "Leaderboard",
    "sec.board.b": "Accuracy rankings. Realtime, and brutal.",
    "sec.ba.k": "Before / After",
    "sec.ba.b": "Gil day 1 vs Gil day N. Proof the memory is real.",
    "sec.note.k": "Gil's Notebook",
    "sec.note.b": "Everything Gil remembers about you — stored on Walrus, verified on-chain.",
    "sec.soon": "Coming soon",
    "footer.stamp": "Stop Press",
    "footer.text": "Build: M3 · Mastra + Gemini + Walrus Memory + Sui · memory now on air…",
    "chat.live": "🦭 Live from Gil's Desk",
    "chat.empty": "A live interview with old Gil. Ask anything — and brace for the roast.",
    "chat.you": "You asked",
    "chat.gil": "Gil",
    "chat.remembers": "📓 Gil remembers:",
    "chat.loading": "Gil is flipping through his notebook…",
    "chat.error": "Gil wandered off somewhere in the newsroom… (is the server running?)",
    "chat.placeholder": "Ask Gil about World Cup 2026, or call a bet…",
    "chat.send": "Send",
    "starter.1": "Who wins World Cup 2026?",
    "starter.2": "I'm a Brazil fan — Brazil takes it all!",
    "starter.3": "Roast England for me.",
    "set.open": "Settings",
    "set.title": "AI Settings",
    "set.aiLang": "Gil's reply language",
    "set.auto": "Auto (follow app)",
    "set.vi": "Tiếng Việt",
    "set.en": "English",
    "set.instr": "Custom instructions for Gil (optional)",
    "set.instrPh": "e.g. keep the roast light, focus on the USA squad…",
    "set.save": "Save",
    "set.close": "Close",
    "set.saved": "Saved ✓",
    "set.tip": "💡 You can pick a language and add your own instructions for Gil in AI Settings.",
    "ui.langLabel": "Language",
  },
};

interface I18nValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nValue | null>(null);
const LS_KEY = "dw.lang";

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved === "vi" || saved === "en") return saved;
    return navigator.language?.toLowerCase().startsWith("en") ? "en" : "vi";
  } catch {
    return "vi";
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(LS_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);
  const t = useCallback((key: string) => DICT[lang][key] ?? DICT.vi[key] ?? key, [lang]);
  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within <I18nProvider>");
  return ctx;
}
