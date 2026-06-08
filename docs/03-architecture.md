# Architecture — The Daily Walrus

> Links: [plan](01-plan.md) · [requirements](02-requirements.md) · [user-flows](04-user-flows.md) · [research-notes](06-research-notes.md) (SDK details + sources)

## 0. Core design principle
> **Walrus = the source of truth for memory. Supabase = a rebuildable index/cache.**
> This is the crux for meeting the "all agent state and memory on Walrus" criterion while still using Supabase for fast queries. If Supabase is lost, we **restore from Walrus**.

## 1. System diagram
```
┌───────────────────────────────────────────────────────────────────────┐
│  FRONTEND — React + Vite (static)                                       │
│  Deploy: WALRUS SITES (Mainnet)  →  https://<suins>.wal.app             │
│  - Chat with Gil (streaming)  - Prediction history / Memory panel       │
│  - Leaderboard (realtime)     - Roast card generator                    │
│  - "Verify on Walrus" links   - Before/After viewer                     │
│  Uses @mastra/client-js, sends { memory: { resource, thread } }         │
└───────────────┬───────────────────────────────────────────────────────┘
                │ HTTPS (CORS) + SSE streaming
                ▼
┌───────────────────────────────────────────────────────────────────────┐
│  MASTRA SERVER — Hono (Node) on Railway, port 4111                      │
│  - roastAgent: instructions (Gil persona) + tools                       │
│  - model: claude-opus-4-8 / claude-sonnet-4-6 (ai-sdk)                  │
│  - tools: remember, recall, getFixture, makePrediction, scorePredictions,│
│           getLeaderboard, getMyRecord, verifyOnWalrus                    │
│  - memory hooks: write MemWal + mirror to Walrus (async)                │
└───┬───────────────────┬────────────────────┬──────────────────┬────────┘
    │ Claude (ai-sdk)   │ Walrus Memory      │ Supabase (PG)    │ Walrus raw
    ▼                   ▼                    ▼                  ▼
┌──────────┐  ┌────────────────────┐  ┌──────────────────┐  ┌────────────────┐
│ Anthropic│  │ WALRUS MEMORY      │  │ SUPABASE (free)  │  │ @mysten/walrus │
│ Claude   │  │ @…/memwal (relayer)│  │ - predictions    │  │ writeBlob from │
│ opus/    │  │ remember/recall/ask│  │ - fixtures cache │  │ session wallet │
│ sonnet   │  │ Seal-encrypted     │  │ - leaderboard    │  │ (proof-of-write│
│          │  │ blobs on Walrus    │  │ - walrus_index   │  │  on Mainnet)   │
│          │  │ MAINNET ⭐         │  │ - users          │  │ + Quilt batch  │
└──────────┘  └─────────┬──────────┘  └──────────────────┘  └───────┬────────┘
                        │  blobs (canonical memory)                  │
                        └──────────────► WALRUS STORAGE (Mainnet) ◄──┘
```

## 2. Components & roles

### 2.1 Frontend — React + Vite (Walrus Sites)
- Static SPA, built to `dist/`. Deployed with `site-builder ... deploy --epochs N ./dist`.
- **SPA routing**: add `ws-resources.json` at the build root with `{"routes": {"/*": "/index.html"}}` (Walrus Sites is static, no server fallback → missing this file means a 404 when refreshing a sub-route).
- Calls the Mastra server via `@mastra/client-js`; **sends `{ memory: { resource: <suiAddress>, thread: <id> } }`** on every request → this is how memory follows the user.
- Holds no secrets. All keys live on the server.

### 2.2 Mastra server (Hono on Railway)
- `@mastra/core` registers `roastAgent`; run `mastra build` → `node .mastra/output/index.mjs`.
- **Model:** **Gemini via Vercel AI Gateway** — `@ai-sdk/gateway` `createGateway({ apiKey: AI_GATEWAY_API_KEY })('google/gemini-3-flash')`. ⚠️ Passing a bare `google/...` string to Mastra routes to Google directly (requires GOOGLE_API_KEY) → you must use the gateway provider explicitly.
- **CORS:** set `server.cors.origin = ['https://<suins>.wal.app', 'http://localhost:5173']`.
- **Tools** (each tool is a `createTool` with a zod schema): see §5.
- **Memory hooks:** after each turn → `remember` new facts into MemWal; mirror a profile snapshot to Walrus (async, without blocking the response).

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
await memwal.remember("User is a Brazil fan, believes Brazil will win, hates betting on underdogs.");
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

### 3.2 On Supabase (index/cache — rebuildable from Walrus)
```sql
-- users
users(id uuid pk, sui_address text unique, memwal_account_id text,
      display_name text, favorite_team text, created_at timestamptz)

-- prediction ledger (scoring)
predictions(id uuid pk, user_id uuid fk, match_id text,
      kind text,                 -- 'winner' | 'scoreline' | 'tournament'
      payload jsonb,             -- e.g. {"winner":"BRA"} or {"home":2,"away":1}
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

-- leaderboard (materialized view from predictions)
leaderboard_mv(user_id, display_name, total, correct, accuracy, streak)
```
- **Realtime** pushes leaderboard & match-result updates.
- `pgvector` is only needed if we do semantic recall ourselves in Mastra; if we rely on MemWal's recall it can be dropped → fewer dependencies.

## 4. Memory flow (this is the "scoring" part)

### 4.1 Write (when the user interacts)
```
user sends a message / places a prediction
  → Mastra agent processes
  → write structured data to Supabase (predictions/users)    [sync, fast]
  → memwal.remember(fact)                                    [async]
  → (periodically) snapshot profile+predictions → Walrus blob/Quilt (session wallet)
  → store blobId in walrus_index
```

### 4.2 Read (before Gil answers)
```
request with { resource: suiAddress, thread }
  → memwal.recall({ query: context })  → relevant memories
  → read record/streak from Supabase
  → inject "Gil's notebook" into the system prompt
  → Claude generates a personalized + roasting reply
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
| `getFixture` | `{ team?, date? }` | reads the `fixtures` cache (Supabase) |
| `makePrediction` | `{ matchId, kind, payload }` | writes `predictions` + remember |
| `scorePredictions` | `{ matchId }` | compares the result → updates correct/wrong, streak |
| `getMyRecord` | `{}` | the user's W–L, accuracy, streak |
| `getLeaderboard` | `{ limit? }` | top by accuracy |
| `verifyOnWalrus` | `{ kind }` | returns `blobId/objectId` + an aggregator/explorer URL to verify |

## 6. Deployment
| Component | Infrastructure | Notes |
|---|---|---|
| Frontend | **Walrus Sites Mainnet** | `site-builder --context=mainnet deploy --epochs 12 ./dist`; attach **SuiNS** for a nice URL; `ws-resources.json` for the SPA |
| Mastra server | **Railway** | Node container running `node .mastra/output/index.mjs`; persistent; streaming |
| DB | **Supabase** | session pooler; keep-alive cron |
| Memory | **MemWal relayer (Mainnet)** + Walrus | `relayer.memory.walrus.xyz` |
| Wallet | Sui Ed25519 | session wallet, funded with **WAL + SUI**; 1 epoch = 14 days |

## 7. Secrets & configuration (env)
**Server (Railway):** `AI_GATEWAY_API_KEY`, `GIL_MODEL` (e.g. `google/gemini-3-flash`), `DATABASE_URL` (Supabase session pooler), `MEMWAL_ACCOUNT_ID`, `MEMWAL_DELEGATE_KEY`, `MEMWAL_RELAYER_URL`, `SESSION_WALLET_KEY` (suiprivkey…), `SUI_RPC_URL`, `WALRUS_AGGREGATOR_URL`, `CORS_ORIGINS`.
**Frontend (Vite, public):** `VITE_MASTRA_URL`, `VITE_SUI_NETWORK=mainnet`, `VITE_WALRUS_AGGREGATOR_URL`, `VITE_SUINS_NAME`.
> Rule: anything secret → server only. `VITE_*` is always public.

## 8. Proposed directory structure (monorepo, pnpm workspaces)
```
walrus-memory-world-cup/
├─ apps/
│  ├─ web/            # React + Vite (deploy to Walrus Sites)
│  └─ server/         # Mastra + tools + memory hooks (deploy to Railway)
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
- A World Cup fixtures/results data source (free football API) → cache into `fixtures`.
