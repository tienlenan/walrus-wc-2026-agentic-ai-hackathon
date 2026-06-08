// Per-user AI settings (reply language + custom instructions), persisted in localStorage.
// "auto" follows the app i18n language; otherwise the explicit choice wins.
export interface AiSettings {
  aiLang: "auto" | "vi" | "en";
  instructions: string;
}

const LS_KEY = "dw.ai-settings";

export function loadAiSettings(): AiSettings {
  try {
    const j = JSON.parse(localStorage.getItem(LS_KEY) || "{}") as Partial<AiSettings>;
    return {
      aiLang: j.aiLang === "vi" || j.aiLang === "en" ? j.aiLang : "auto",
      instructions: typeof j.instructions === "string" ? j.instructions : "",
    };
  } catch {
    return { aiLang: "auto", instructions: "" };
  }
}

export function saveAiSettings(s: AiSettings): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

/** Resolve the language Gil should reply in: explicit setting, else fall back to the app language. */
export function resolveAiLang(aiLang: AiSettings["aiLang"], appLang: string): "vi" | "en" {
  if (aiLang === "vi" || aiLang === "en") return aiLang;
  return appLang === "en" ? "en" : "vi";
}
