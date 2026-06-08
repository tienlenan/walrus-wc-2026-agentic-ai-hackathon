import { gil } from "../mastra/agents/gil.js";
import { recall, remember, memNamespace, isMemoryEnabled } from "@daily-walrus/walrus";

export interface ChatResult {
  text: string;
  usedMemories: string[];
  memoryEnabled: boolean;
}

/**
 * Trò chuyện với Gil CÓ trí nhớ Walrus (deterministic):
 *   1) recall ký ức liên quan của user  → 2) inject vào context
 *   3) Gil trả lời                        → 4) remember tin nhắn user (async)
 * Đây là nơi tạo ra hiệu ứng before/after.
 */
export async function chatWithGil(resourceId: string, message: string): Promise<ChatResult> {
  const ns = memNamespace(resourceId);

  const memories = await recall(ns, message).catch(() => [] as string[]);

  const notebook = memories.length
    ? `Sổ tay của Gil về người dùng này (ký ức từ các phiên trước — DÙNG để cá nhân hoá & cà khịa, và nói rõ "hôm trước ông…"):\n- ${memories.join("\n- ")}`
    : `Sổ tay của Gil về người dùng này: TRỐNG — đây là người mới, bạn chưa biết gì về họ. Đừng bịa ký ức.`;

  const res = await gil.generate([
    { role: "system", content: notebook },
    { role: "user", content: message },
  ]);

  // Ghi nhớ tin nhắn user (không chặn phản hồi).
  if (isMemoryEnabled()) {
    void remember(ns, `Người dùng nói: "${message}"`).catch((e) =>
      console.error("[memory] remember failed:", e?.message ?? e),
    );
  }

  return { text: res.text, usedMemories: memories, memoryEnabled: isMemoryEnabled() };
}
