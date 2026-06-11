# Architecture — The Daily Walrus

> Links: [plan](01-plan.md) · [requirements](02-requirements.md) · [user-flows](04-user-flows.md) · [research-notes](06-research-notes.md) (SDK details + sources)
> Runtime tracking + global schedule memory: [07-runtime-tracking-design](07-runtime-tracking-design.md)

## 0. Core design principle
> **Walrus = the source of truth for memory. Supabase = a rebuildable index/cache.**
> This is the crux for meeting the "all agent state and memory on Walrus" criterion while still using Supabase for fast queries. If Supabase is lost, we **restore from Walrus**.
> **Wallet-required writes:** every user-facing output action uses a verified Sui session. Raw output payloads go to Walrus when a publisher is configured; an owned Sui `OutputRecord` stores `blobId + contentHash` as the public proof. Supabase only indexes the proof.
> **Global schedule memory:** WC2026 fixture memory lives in `daily-walrus:global:world-cup-2026`; Gil recalls it alongside per-user memory so schedule Q&A does not depend on a single user's notebook. Runtime proof/status is exposed at `/api/tracking/runtime` and the `#tracking` UI page.
> **Agentic Daily What's Up:** the autonomous publisher creates Gil-style World Cup dispatches, stores summary metadata in global Walrus Memory, indexes the post in Supabase, and optionally anchors the blob/hash with a Sui `OutputRecord`.
> **Live match operations:** public/provider data updates a rebuildable Supabase cache for fixtures, live state, events, lineups, and availability. Final score settlement remains a separate token-gated oracle action; provider data is evidence, not authority.

## 1. System diagram
```
┌───────────────────────────────────────────────────────────────────────┐
│  FRONTEND — React + Vite (static)                                       │
│  Deploy: WALRUS SITES (Mainnet)  →  https://roast2026wc.wal.app         │
│  - Chat with Gil (streaming)  - Prediction history / Memory panel       │
│  - Leaderboard (realtime)     - Roast card generator                    │
│  - "Verify on Walrus" links   - Before/After viewer                     │
│  Uses @mastra/client-js, sends { memory: { resource, thread } }         │
└───────────────┬───────────────────────────────────────────────────────┘
                │ HTTPS (CORS) + SSE streaming
                ▼
┌───────────────────────────────────────────────────────────────────────┐
│  MASTRA SERVER — Node HTTP API on Vercel                                 │
│  - gil agent: instructions (Gil persona) + tools                         │
│  - model: Gemini via Vercel AI Gateway                                   │
│  - tools: remember, recall, getFixture, makePrediction, scorePredictions,│
│           getLeaderboard, getMyRecord, verifyOnWalrus                    │
│  - memory hooks: write MemWal + mirror to Walrus (async)                │
└───┬───────────────────┬────────────────────┬──────────────────┬────────┘
    │ AI Gateway        │ Walrus Memory      │ Supabase (PG)    │ Walrus raw
    ▼                   ▼                    ▼                  ▼
┌──────────┐  ┌────────────────────┐  ┌──────────────────┐  ┌────────────────┐
│ Gemini   │  │ WALRUS MEMORY      │  │ SUPABASE (free)  │  │ @mysten/walrus │
│ via      │  │ @…/memwal (relayer)│  │ - predictions    │  │ writeBlob from │
│ Gateway  │  │ remember/recall/ask│  │ - fixtures cache │  │ session wallet │
│          │  │ Seal-encrypted     │  │ - leaderboard    │  │ (proof-of-write│
│          │  │ blobs on Walrus    │  │ - walrus_index   │  │  on Mainnet)   │
│          │  │ MAINNET ⭐         │  │ - users          │  │ + Quilt batch  │
└──────────┘  └─────────┬──────────┘  └──────────────────┘  └───────┬────────┘
                        │  blobs (canonical memory)                  │
                        └──────────────► WALRUS STORAGE (Mainnet) ◄──┘
```

## 2. Components & roles

### 2.1 Frontend — React + Vite (Walrus Sites)
- Static SPA, built to `dist/`. Deployed with `site-builder ... deploy --epochs N ./dist`.
- **First-load performance:** the wallet/query provider stack (`@mysten/dapp-kit` + react-query) loads through a lazy boundary in `main.tsx` (`app-providers.tsx`), keeping the entry chunk to React + app shell (~254 kB raw / 81 kB br). Fonts are self-hosted subsetted WOFF2 (`src/styles/fonts.css`, no Google Fonts request). Walrus portals serve blob bytes verbatim with no negotiated compression, so deploys run `scripts/precompress-walrus-assets.mjs` (`WALRUS_PRECOMPRESS=1`): assets are brotli bytes on Walrus and `ws-resources.json` declares `content-encoding: br` + immutable cache headers.
- **SPA routing**: add `ws-resources.json` at the build root with `{"routes": {"/*": "/index.html"}}` (Walrus Sites is static, no server fallback → missing this file means a 404 when refreshing a sub-route).
- Calls the Mastra server via `@mastra/client-js`; **sends `{ memory: { resource: <suiAddress>, thread: <id> } }`** on every request → this is how memory follows the user.
- Chat, roast, match vote, and predictions require wallet connect + sign-in-with-Sui. Predictions create dedicated owned `Prediction` objects; chat/roast/vote create owned `OutputRecord` pointer objects.
- Chat messages render a Vercel-style JSON parts contract: `{ type:"text" }` parts are rendered with Streamdown, and `{ type:"tool-..." }` parts are routed through a local component registry. The UI never dumps raw tool JSON.
- Holds no secrets. All keys live on the server.

### 2.2 Mastra server (Node HTTP on Vercel)
- `@mastra/core` registers the Gil agent; the public API runs as a Node HTTP service behind Vercel.
- **Model:** **Gemini via Vercel AI Gateway** — `@ai-sdk/gateway` `createGateway({ apiKey: AI_GATEWAY_API_KEY })('google/gemini-3-flash')`. ⚠️ Passing a bare `google/...` string to Mastra routes to Google directly (requires GOOGLE_API_KEY) → you must use the gateway provider explicitly.
- **CORS:** allow `https://roast2026wc.wal.app`, local dev, and verified preview origins.
- **Tools** (each tool is a `createTool` with a zod schema): see §5.
- **Generative UI contract:** the chat service prefetches deterministic fixture/profile/private-history tool results when the user intent is clear, injects a compact tool context into Gil's prompt, and returns `parts[]` alongside `text`. These parts follow the AI SDK UIMessage shape (`text`, `tool-getFixtures`, `tool-getTeamProfile`, `tool-getMyPredictions`, `tool-getMyRoasts`, `tool-getMyMatchVotes`, `tool-getMyOutputRecords`, `tool-getMyDappActions`, `tool-getMyGameRecord`) so the frontend can render sourced cards.
- **Memory hooks:** after each turn → `remember` new facts into MemWal; mirror a profile snapshot to Walrus (async, without blocking the response).
- **Live-data ops:** protected oracle/admin paths run dry-run/apply sync jobs, store provider sync ledgers, and expose public read-only match-center data.
- **Cold start & caching:** the AI stack (`@mastra/core` via chat/roast/briefing services) is dynamically imported at its routes so fast JSON reads never pay its ~400ms+ import on a serverless cold start; the read-only roast feed lives in `roast-feed.ts` for the same reason. Public read endpoints return `cache-control: public, s-maxage=N, stale-while-revalidate=M` for Vercel edge caching (world-cup snapshot 300/600, briefings 300/3600, roasts 30/120, live matches 15/60, traits 3600/86400); `GET /api/game/snapshot` stays uncached because its payload is session-personalized. The SSE game stream shares one anonymous snapshot computation per tick across all connected clients.

### 2.3 Walrus Memory (MemWal) — the star
- Package `@mysten-incubation/memwal` (beta). Quick start:
```ts
import { WalrusMemory } from "@mysten-incubation/memwal";
const memwal = WalrusMemory.create({
  key: process.env.MEMWAL_DELEGATE_KEY!,      // ed25519 delegate key
  accountId: process.env.MEMWAL_ACCOUNT_ID!,  // onchain account (Sui) that owns the memory
  serverUrl: "https://relayer.memory.walrus.xyz", // MAINNET relayer
  namespace: `daily-walrus:${suiAddress}`,    // scoped per user
});
await memwal.remember("User is a Brazil fan, believes Brazil will win, and avoids underdog picks.");
const r = await memwal.recall({ query: "What do we know about this user's football taste?" });
```
- MemWal handles: **embeddings + semantic recall + Seal encryption + writing blobs to Walrus + on-chain ownership (Sui contract) + indexer + `restore`** (rebuilding the index from Walrus). → meets R-H1/H2/H3 cleanly and is **on-theme for the hackathon**.
- **Mastra integration:** MemWal has middleware for the Vercel AI SDK (`@mysten-incubation/memwal/ai`); since Mastra is built on the AI SDK, it plugs in. The safer option (clearer control): wrap `remember`/`recall` as **Mastra tools** and **inject recall results into the system prompt**. → the MVP goes the tools route first, tries middleware later.

### 2.4 Supabase (Postgres + pgvector + realtime)
- **NOT the home of canonical "agent memory"** — only an index/cache/structured app data → avoids conflict with R-H3.
- Use the **session pooler (port 5432)**, NOT the transaction PgBouncer (6543) with the `pg` client.
- Let Mastra create its own schema if using `@mastra/pg` (namespace `schemaName: 'mastra'`); keep app tables separate.
- **Warning:** the free tier **pauses after ~7 days** idle → keep-alive cron during the judging week.

### 2.5 Walrus raw (`@mysten/walrus`) — the hedge path
- A small service writes a **structured snapshot** (profile + prediction ledger) as a blob/Quilt **using the session wallet itself** → on-chain proof independent of the relayer (in case judges demand "written from your wallet").
- `writeBlob({ blob, deletable:true, epochs, signer: sessionKeypair })`; store the `blobId` in `walrus_index`.

## 3. Data model

### 3.1 On Walrus (canonical)
| Type | Content | Mechanism |
|---|---|---|
| **Memory items** | facts/opinions/predictions in semantic form | MemWal `remember` (encrypted blob + on-chain index) |
| **Profile snapshot** | fan profile (JSON) at a point in time | raw `writeBlob`/Quilt from the session wallet; pointer in Supabase |
| **Predictions snapshot** | prediction ledger (JSON) | periodic Quilt batch |
| **Output payload** | Gil chat replies, roast cards, vote payload hashes | raw Walrus publisher when configured; Sui `OutputRecord` always anchors hash/pointer |
| **Daily What's Up payload** | article markdown, source facts, agent trace, proof metadata | raw Walrus publisher; global MemWal summary; optional Sui `OutputRecord` pointer |

### 3.1.1 On Sui (owned proof objects)
| Object | Owner | Content |
|---|---|---|
| `Prediction` | user address | match/kind/payload for scoreable predictions |
| `OutputRecord` | user address | `kind`, `blob_id`, `content_hash`, `created_ms` for chat/roast/vote/profile pointers |

### 3.2 On Supabase (index/cache — rebuildable from Walrus)
```sql
-- users
users(id uuid pk, sui_address text unique, memwal_account_id text,
      display_name text, favorite_team text, created_at timestamptz)

-- prediction ledger (scoring)
predictions(id uuid pk, user_id uuid fk, match_id text,
      kind text,                 -- winner | scoreline | match_mvp | worst_player | champion | advance
      payload jsonb,             -- normalized team/player pick, e.g. {"winnerSide":"home","teamCode":"BRA"} or {"homeScore":2,"awayScore":1}
      created_at timestamptz, locked_at timestamptz,
      result text,               -- 'pending' | 'correct' | 'wrong'
      scored_at timestamptz)

-- fixtures/results cache
fixtures(match_id text pk, stage text, home text, away text,
      kickoff timestamptz, status text, home_score int, away_score int,
      updated_at timestamptz)

-- pointers to Walrus (verify)
walrus_index(id uuid pk, user_id uuid fk, kind text,   -- 'profile'|'predictions'|'memory'
      blob_id text, object_id text, epoch int, hash text, updated_at timestamptz)

-- Sui output object proof index
sui_output_records(id uuid pk, user_id uuid fk, output_kind text,
      resource_type text, resource_id text, sui_object_id text,
      tx_digest text, blob_id text, content_hash text, walrus_status text,
      created_at timestamptz)

-- leaderboard (materialized view from predictions)
leaderboard_mv(user_id, display_name, total, correct, accuracy, streak)
```
- **Realtime** pushes leaderboard & match-result updates.
- `pgvector` is only needed if we do semantic recall ourselves in Mastra; if we rely on MemWal's recall it can be dropped → fewer dependencies.
- **Prediction target contract:** UI picks team/player targets from `team_profiles` / `team_players`. Mainnet Move kind space stays unchanged; winner uses the existing `advance` kind with a payload marker, then the indexer normalizes it to `kind='winner'`.
- **Scoring weights:** scoreline exact = 10, scoreline correct result = 3, winner = 4, MVP = 8, worst player = 6, team advance = 5, champion = 20. Non-objective kinds require oracle/manual correctness unless a richer official source exists.

## 4. Memory flow (this is the "scoring" part)

### 4.1 Write (when the user interacts)
```
verified wallet user sends a message / roast / vote / prediction
  → Mastra agent processes
  → publish/hash output payload for Walrus                     [sync for hash, optional publisher]
  → client signs Sui tx: Prediction or OutputRecord             [user-owned proof object]
  → write structured data/proof index to Supabase               [sync, fast]
  → memwal.remember(fact)                                    [async]
  → (periodically) snapshot profile+predictions → Walrus blob/Quilt (session wallet)
  → store blobId in walrus_index
```

### 4.2 Read (before Gil answers)
```
request with { resource: suiAddress, thread }
  → memwal.recall({ query: context })  → relevant memories
  → deterministic tool resolver fetches fixtures/team profiles when the prompt asks for them
  → deterministic private resolver fetches wallet-scoped prediction/roast/vote/proof/action history when asked
  → read record/streak from Supabase
  → inject "Gil's notebook" + tool context into the system prompt
  → Gil generates a personalized answer
  → response returns Markdown text + JSON render parts for cards
```

### 4.3 Before/After (proving criterion 1)
- **Day-1 baseline:** call the agent with a brand-new `resource` (empty memory) → a generic answer.
- **Day-N:** same question, same `resource` with ≥4 days accumulated → an answer that correctly recalls the old hot-take/record.
- The harness saves both to render the **Before/After viewer** (F-UI-5) and to record the demo. Because memory is **resource-scoped**, the same code path produces different output → proof that "memory really works".

## 5. Agent tool list (zod-typed)
| Tool | Input | What it does |
|---|---|---|
| `recallMemory` | `{ query }` | `memwal.recall` → returns relevant memories to load context |
| `rememberMemory` | `{ fact, tags? }` | `memwal.remember` a new fact |
| `getFixtures` | `{ group?, team?, date?, status?, prediction?, limit? }` | reads fixture cache, merged with prediction-gate state |
| `getTeamProfile` | `{ team }` | returns flag, coach, squad sample, fixture list, and Walrus blob proof |
| `getMyPredictions` | `{ limit? }` | wallet-scoped prediction history with result/points/tx context |
| `getMyRoasts` | `{ limit? }` | wallet-scoped roast history with Walrus/Sui proof pointers |
| `getMyMatchVotes` | `{ limit? }` | wallet-scoped MVP/worst-player votes |
| `getMyOutputRecords` | `{ limit? }` | wallet-owned Sui `OutputRecord` proof index |
| `getMyDappActions` | `{ limit? }` | merged timeline from predictions, roasts, votes, and output proofs |
| `getMyGameRecord` | `{}` | wallet-scoped points, accuracy, streak, and graded count |
| `makePrediction` | `{ matchId, kind, payload }` | writes a wallet-owned `Prediction`; payload is normalized from catalog-picked team/player options |
| `scorePredictions` | `{ matchId, homeScore, awayScore, manualScores? }` | auto-grades scoreline/winner, applies default/manual points for subjective kinds, updates streak |
| `getMyRecord` | `{}` | the user's W–L, accuracy, streak |
| `getLeaderboard` | `{ limit? }` | top by accuracy |
| `verifyOnWalrus` | `{ kind }` | returns `blobId/objectId` + an aggregator/explorer URL to verify |

## 5.1 Agentic Daily What's Up

Daily What's Up adds a six-role workflow without changing the app name:

1. **Orchestrator** creates an idempotent run for a date/type.
2. **Scout agent** reads fixture gates, team/player cache, official schedule links, configured public sources, and optional manual side stories.
3. **Synthesizer agent** converts source facts into match angles, team notes, player watch, and memory hooks.
4. **Writer agent** loads the dedicated briefing memory path (`daily-walrus:global:world-cup-2026:briefings`), writes an English Gil-style markdown article, and avoids recent summaries.
5. **Moderator agent** removes wagering language, rejects unsupported source IDs, and keeps the tone as fun commentary.
6. **Publisher agent** writes the full JSON payload to Walrus Blob when configured, remembers a short summary in `daily-walrus:global:world-cup-2026:briefings`, stores the UI row in `daily_briefings`, and optionally signs a Sui `OutputRecord`.

If the generated article is too close to recent briefing memory, the workflow rejects that draft and re-runs scout/synthesis/writing up to three attempts before publishing.

Runtime endpoints:

| Endpoint | Purpose |
|---|---|
| `GET /api/briefings/latest` | Latest public briefing for UI teaser/page |
| `GET /api/briefings` | Briefing history |
| `GET /api/briefings/:id` | One briefing by ID or slug |
| `POST /api/oracle/briefings/run` | Protected manual/cron publisher path |
| `GET /api/oracle/briefings/runs` | Protected run ledger |

Data tables:

| Table | Purpose |
|---|---|
| `daily_briefings` | UI index, proof pointers, source list, agent trace |
| `agent_runs` | workflow status, input/output JSON, failure ledger |

## 5.2 World Cup live data operations

The live-data layer prepares the app for official WC match windows without widening the scoring trust boundary.

Provider strategy:

| Provider | Role |
|---|---|
| `openfootball` / static schedule | No-credential fallback for fixture visibility and smoke checks |
| `api-football` | Credentialed provider for fixture refresh, live events, lineups, and injury/availability data |

Protected jobs:

| Job | Scope | Writes |
|---|---|---|
| `fixtures_full` | tournament or provider fixture | fixture cache, provider map, global schedule memory refresh |
| `live_tick` | match | live state + timeline events |
| `finalize_result` | match | final provider state for operator review; does not settle predictions by itself |
| `lineups` | match | team formations, starters, substitutes, coach |
| `pre_match` | match/team | player availability notes such as injury/suspension |

Public endpoints:

| Endpoint | Purpose |
|---|---|
| `GET /api/matches/live` | List live/upcoming/finished match details for the match center |
| `GET /api/matches/:matchId/live` | One match with fixture, live state, events, lineups, and availability |

Protected endpoints:

| Endpoint | Purpose |
|---|---|
| `GET /api/admin/live-data/status` | Provider capability/config state and recent sync runs |
| `POST /api/oracle/live-data/sync` | Dry-run/apply one live-data job |
| `POST /api/oracle/live-data/override` | Record manual operator override evidence |

Supabase live-data tables:

| Table | Purpose |
|---|---|
| `provider_entity_map` | Maps local IDs to provider IDs |
| `provider_sync_runs` | Run ledger with mode/status/count/hash/error |
| `match_live_states` | Latest provider live state for a fixture |
| `match_events` | Timeline events keyed by provider/match |
| `match_lineups` | Team formation, coach, confirmation state |
| `match_lineup_players` | Starters/substitutes and pitch grid coordinates |
| `player_availability` | Injury/suspension/availability notes |
| `admin_live_data_overrides` | Manual evidence trail for operator corrections |

Operator contract:

1. Run provider jobs in `dry_run` first.
2. Apply cache updates only when provider data is acceptable.
3. Compare final provider result with the official visible result.
4. Call `/api/oracle/score` only after operator review.

Runbook: [wc-live-data-ops-runbook](wc-live-data-ops-runbook.md).

## 6. Deployment
| Component | Infrastructure | Notes |
|---|---|---|
| Frontend | **Walrus Sites Mainnet** | `site-builder --context=mainnet deploy --epochs 12 ./dist`; attach **SuiNS** for a nice URL; `ws-resources.json` for the SPA |
| Mastra server | **Vercel** | Node HTTP API at `https://gil-var-shamebook-api.vercel.app`; keep endpoints stateless and memory-backed |
| DB | **Supabase** | session pooler; keep-alive cron |
| Memory | **MemWal relayer (Mainnet)** + Walrus | `relayer.memory.walrus.xyz` |
| Wallet | Sui Ed25519 | session wallet, funded with **WAL + SUI**; 1 epoch = 14 days |

## 7. Secrets & configuration (env)
**Server (Vercel):** `AI_GATEWAY_API_KEY`, `GIL_MODEL` (e.g. `google/gemini-3-flash`), `DATABASE_URL` (Supabase session pooler), `MEMWAL_ACCOUNT_ID`, `MEMWAL_DELEGATE_KEY`, `MEMWAL_RELAYER_URL`, `SESSION_WALLET_KEY` (suiprivkey…), `SUI_RPC_URL`, `WALRUS_AGGREGATOR_URL`, `CORS_ORIGINS`, `ORACLE_ADMIN_TOKEN`, `LIVE_DATA_PROVIDER`, `API_FOOTBALL_KEY`, `LIVE_DATA_STALE_MS`.
**Frontend (Vite, public):** `VITE_MASTRA_URL`, `VITE_SUI_NETWORK=mainnet`, `VITE_WALRUS_AGGREGATOR_URL`, `VITE_SUINS_NAME`.
> Rule: anything secret → server only. `VITE_*` is always public.

## 8. Proposed directory structure (monorepo, pnpm workspaces)
```
walrus-memory-world-cup/
├─ apps/
│  ├─ web/            # React + Vite (deploy to Walrus Sites)
│  └─ server/         # Mastra-compatible tools + memory hooks (deploy to Vercel)
├─ packages/
│  ├─ walrus/         # MemWal wrapper + raw @mysten/walrus + Quilt helpers
│  ├─ db/             # Supabase schema + queries + migrations
│  └─ shared/         # types, zod schemas, Gil persona, prompt
├─ docs/              # documentation (this file)
└─ scripts/           # seed, keep-alive cron, deploy, before/after harness
```

## 9. Open / to verify during the build
- The MemWal ↔ Mastra integration mechanism (AI SDK middleware vs tools) — experiment in M2.
- Whether the MemWal hosted relayer is enough for "written from your wallet" per the judges → keep the raw `@mysten/walrus` path (§2.5) as proof; ask on Discord.
- Pin the exact versions of `@mysten-incubation/memwal`, `@mysten/walrus@1.x`, `@mastra/*` (migrating to v1).
- A licensed/reliable live sports data source for official match windows. The adapter is in place; provider choice/limits remain an ops decision.
