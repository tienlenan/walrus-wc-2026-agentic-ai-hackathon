// Smoke test remember/recall. Run: pnpm --filter @daily-walrus/walrus memwal:smoke
import { remember, recall, memNamespace, isMemoryEnabled } from "../src/index";

if (!isMemoryEnabled()) {
  console.log("Memory chưa cấu hình — provision trước đã.");
  process.exit(0);
}

const ns = memNamespace("smoke-user");
console.log("→ remember …");
await remember(ns, "User thích đội Walrus FC, số áo may mắn là 26, ghét kèo cửa dưới.");
console.log("→ recall …");
const hits = await recall(ns, "user thích đội nào, số áo gì?");
console.log("recall:", hits);
