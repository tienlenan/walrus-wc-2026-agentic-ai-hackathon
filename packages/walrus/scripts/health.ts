// Check configuration + MemWal relayer. Run: pnpm --filter @daily-walrus/walrus memwal:health
import { isMemoryEnabled, memoryHealth } from "../src/index";

console.log("MEMWAL configured:", isMemoryEnabled());
if (isMemoryEnabled()) {
  console.log("Relayer health:", await memoryHealth());
} else {
  console.log("→ Chưa provision (MEMWAL_ACCOUNT_ID / MEMWAL_DELEGATE_KEY còn trống).");
}
