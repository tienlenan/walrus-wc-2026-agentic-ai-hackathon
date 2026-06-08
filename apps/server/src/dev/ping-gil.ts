// Verify nhanh Gil trả lời (bỏ qua HTTP layer).
// Chạy: pnpm --filter @daily-walrus/server ping ["câu hỏi"]
import { gil } from "../mastra/agents/gil";

const prompt = process.argv[2] ?? "Chào Gil! Ông là ai, và World Cup 2026 tổ chức ở đâu?";

const res = await gil.generate(prompt);
console.log("\n🦭 GIL:", res.text, "\n");
