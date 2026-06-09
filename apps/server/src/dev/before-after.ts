// Verify the memory before/after effect: cold, teach, then warm.
// Run: pnpm --filter @daily-walrus/server before-after [userSuffix]
import { chatWithGil } from "../services/chat-with-gil.js";
import { remember, memNamespace, isMemoryEnabled } from "@daily-walrus/walrus";

// Default to a fresh user on every run. Pass a suffix to reuse a previous user.
const uid = "verify-" + (process.argv[2] ?? Math.random().toString(36).slice(2, 8));
console.log("memory enabled:", isMemoryEnabled(), "| user:", uid);

const Q = "Ông còn nhớ gì về tôi và đội tôi thích không?";

console.log("\n=== BEFORE (cold) - Gil knows nothing yet ===");
const before = await chatWithGil(uid, Q);
console.log("🦭", before.text.slice(0, 220));
console.log("   usedMemories:", before.usedMemories);

console.log("\n=== TEACH - write memory and wait for indexing ===");
await remember(memNamespace(uid), "User là fan cứng Brazil và tin chắc Brazil vô địch World Cup 2026.");
console.log("✓ remembered");

console.log("\n=== AFTER (warm) - Gil recalls it ===");
const after = await chatWithGil(uid, Q);
console.log("🦭", after.text);
console.log("\n   usedMemories:", after.usedMemories);
