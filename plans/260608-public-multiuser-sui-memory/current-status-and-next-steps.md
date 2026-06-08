# The Daily Walrus — Current Status & Next Steps

> Checkpoint 2026-06-08. Last commit on `main`: `9cfd269`.
> Repo: https://github.com/tienlenan/walrus-wc-2026-agentic-ai-hackathon

## ✅ LIVE & verified

| Area | State |
|---|---|
| **Walrus Memory** (judging criterion #1) | Gil remembers across sessions; before/after verified server-side; `memoryEnabled: true` |
| **Auth** | sign-in-with-Sui (nonce → personal-message signature → HMAC session) |
| **Move contract `wc_predict`** | **Published to testnet, verified on-chain** (register_match + submit_prediction + record_scores all `success`) |
| **i18n vi/en** | VI/EN toggle, persisted; whole UI translated |
| **Language-aware AI + datetime** | EN→English, VI→Vietnamese; current date/time injected (Gil knows "today is 8/6/2026, 3 days to kickoff") |
| **AI settings + notice** | Panel: reply language + custom instructions; tip banner |
| **Docs + code comments** | All 6 docs + db/walrus/contract comments → English |

## On-chain deployment (testnet)

| Object | ID |
|---|---|
| Package | `0x4e62c20fc179f4492d777046dccd06eebd0cedaa83511ea8fde7b8262c6a58a5` |
| MatchRegistry (shared) | `0x80397659cc299b6e6d2e8b3849a25fb695a498f18e5fcd82b50b8d5d577e349f` |
| Scoreboard (shared) | `0x18b4c86498ca88289e0c05bc1a0c58eaca21a8b74fb6bff4a2c882af6adc39fb` |
| AdminCap | `0x837dd54c2a1e800c494ab0cba7609413a059aa757cbfb46cb15924c2aefd9898` |
| OracleCap | `0x8507abecde0c135926846ca768a6707e5b1e6cce330706d281c45c4b04661a08` |
| Deployer | `0xf5ca4f02cf58d6448b6429c691b53c89c56b30c3ded38b45e73ce78829e99f6d` (has ~1 SUI testnet) |

Design: predictions = **owned `Prediction`** (user submits, locked at kickoff via Clock); scoring = **shared `Scoreboard` written by `OracleCap`** (server grades off-chain → `record_scores`). TS PTB builders in `packages/contract` (env-or-deployment fallback).

## ▶️ Next steps — 3 phases (in priority order)

### 1. Predictions + Leaderboard on-chain
Make the game playable end-to-end.
- **Web:** prediction form (match result / MVP / worst player / champion / teams-advancing) → `buildSubmitPrediction` → sign with dapp-kit `useSignAndExecuteTransaction` (user pays testnet gas) → confirmation.
- **Server (oracle):** after results, grade off-chain → `buildRecordScores` signed by the OracleCap wallet → emit `Scored` events.
- **Leaderboard:** read shared `Scoreboard` (devInspect `score_of` or index `Scored` events) → ranked table; Supabase realtime cache.
- **Open decision:** end-user gas. v1 = user signs with own funded wallet (simplest). v2 = sponsored tx (Enoki gas-station) + zkLogin Google login for a truly public app (red-team Spike A).
- **Files:** `apps/web/src/components/predictions-*`, `apps/web/src/lib/predict.ts`, `apps/server/src/services/oracle-*`, `packages/db` predictions/leaderboard tables.

### 2. Roast Engine (troll + image generation)
The emphasized feature: realtime player/team roast text **+ generated troll images**.
- **Text:** already works via Gil; add a dedicated "roast a player/team" action + live-data fetch (API-Football free / openfootball) loaded into Supabase.
- **Image:** verify a server-callable image-gen endpoint (Gemini image / Imagen via gateway) + a place to store/serve the result (Supabase storage or Walrus blob). **Spike this first** before building.
- **Files:** `apps/server/src/services/roast-*`, `apps/web/src/components/roast-*`.

### 3. Deploy public (Walrus Sites mainnet)
Hackathon submission requirement — public, accessible site.
- **Web:** `vite build` → `site-builder publish` to Walrus Sites (needs WAL on mainnet) + `ws-resources.json` for SPA routing.
- **Server:** host the Node API (Railway/Fly) so the deployed site can reach `/api/gil/chat`; set `VITE_MASTRA_URL` + `CORS_ORIGINS`.
- **Memory:** already on Walrus Mainnet (MemWal account live).

## 🔴 Before public demo / judging (red-team P0)
- **Rotate all secrets** passed through chat: `SUPABASE_SECRET_KEY`, `AI_GATEWAY_API_KEY`, DB password, `MEMWAL_DELEGATE_KEY`. They are server-only + gitignored, but were shared in plaintext during dev.

## Run locally
```bash
pnpm install
pnpm dev:server         # Node http + tsx, :4111 (loads .env.local → memory ON)
pnpm --filter @daily-walrus/web dev   # Vite, :5173
# contract: cd move/wc_predict && sui move build|test ; sui client publish (testnet)
```
