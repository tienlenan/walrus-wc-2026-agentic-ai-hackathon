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
| **Predictions + leaderboard** | Web submit form for 5 on-chain prediction kinds; GraphQL event indexer; gRPC oracle scoring service; vote MVP/worst; SSE snapshot stream |
| **WC2026 profiles/schedule** | 48 team profiles, 1,248 official squad rows, 72 group fixtures seeded; profile hash + optional Walrus blob publisher |
| **Roast Wall + Notebook** | Dedicated team/player roast API/UI, DB feed, Walrus memory callback; live Gil Notebook recall panel |
| **Wallet + output proof** | Chat/roast/notebook/vote/prediction actions require verified Sui session; chat/roast/vote create owned `OutputRecord` pointer txs |

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

> 2026-06-09 update: source now includes `OutputRecord` + `submit_output_record(kind, blob_id, content_hash)` for user-owned proof of chat/roast/vote/profile outputs. Current committed testnet package id above predates that addition; redeploy/upgrade is required before object-proof txs work against a live network.

## ▶️ Next steps — 3 phases (in priority order)

### 1. Predictions + Leaderboard on-chain
Make the game playable end-to-end.
- ✅ **Web:** prediction form (match result / MVP / worst player / champion / teams-advancing) → `buildSubmitPrediction` → sign with dapp-kit `useSignAndExecuteTransaction` (user pays testnet gas) → confirmation.
- ✅ **Indexer/API:** `MatchRegistered`/`PredictionSubmitted`/`Scored` → Supabase mirror with durable cursors; `/api/game/snapshot` returns fixtures + leaderboard + my record.
- ✅ **Server (oracle):** after results, grade off-chain → `buildRecordScores` signed by the OracleCap wallet → emit `Scored` events. Dry-run default; execute requires `ORACLE_ADMIN_TOKEN`.
- ✅ **Votes/live:** MVP/worst votes via signed session + `match_votes`; leaderboard uses SSE `/api/game/stream` with polling fallback.
- **Open decision:** end-user gas. v1 = user signs with own funded wallet (simplest). v2 = sponsored tx (Enoki gas-station) + zkLogin Google login for a truly public app (red-team Spike A).
- **Files:** `apps/web/src/components/predictions-desk.tsx`, `apps/web/src/components/leaderboard.tsx`, `apps/web/src/lib/game-api.ts`, `apps/server/src/services/event-indexer.ts`, `apps/server/src/services/game-snapshot.ts`, `apps/server/src/services/score-keeper.ts`, `apps/server/src/services/sui-events.ts`, `packages/db/sql/schema.sql`.

## Checkpoint 2026-06-09
- Applied DB schema migration: `fixtures`, `users`, `predictions`, `indexer_cursor`, `scoring_events`, `score_runs`, `match_votes`, `walrus_index`, `leaderboard`.
- Ran GraphQL event replay from empty cursor: `{ indexed: 3 }`.
- Verified snapshot from DB: 1 fixture, 1 leaderboard row, top user `0xf5ca...9f6d`, `totalPoints=10`, `accuracy=100`.
- Verified SDK path: no app imports of deprecated `SuiJsonRpcClient/queryEvents`; execution uses `SuiGrpcClient`, event filtering uses `SuiGraphQLClient`.
- Added WC2026 seed: `team_profiles=48`, `team_players=1248`, schedule fixtures `2026001..2026072`; replay marks chain fixture `1` only.
- Added `/api/world-cup/snapshot`, `/api/roast`, `/api/roasts`, `/api/gil/notebook`; replaced Coming Soon UI with Team Profiles, Roast Wall, Gil Notebook.
- Added deploy readiness: `apps/server/Dockerfile`, `scripts/deploy-walrus-site.sh`, `scripts/keep-alive.ts`.
- Added wallet-required write path: removed guest `reader-*` identity fallback; chat/roast/notebook require sign-in-with-Sui.
- Added Sui output proof path: Move `OutputRecord`, web `buildSubmitOutputRecord` signer, `/api/outputs/register`, `sui_output_records` index.

### 2. Roast Engine (troll + image generation)
The emphasized feature: realtime player/team roast text **+ generated troll images**.
- ✅ **Text/card MVP:** dedicated "roast a player/team" action works via `/api/roast`; roasts save in DB and remember callback in Walrus Memory.
- ✅ **UI:** Roast Wall can target team or official squad player.
- **Stretch:** realtime live-event detector + image generation; needs live events/image quota/storage decision.
- **Files:** `apps/server/src/services/roast-engine.ts`, `apps/web/src/components/roast-wall.tsx`.

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
