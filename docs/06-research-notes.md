# Research Notes (reference) — verified ~Jun 8, 2026

> SDK/CLI/ID details to use when building. ⚠️ = needs re-verifying at code time (everything is very new / beta).

## A. Walrus Memory (MemWal) — the star
- **An official product** from Mysten/Walrus (launched ~May 21, 2026, **beta but usable on Mainnet**). Not just a pattern.
- **Package:** `@mysten-incubation/memwal` (TS, ⚠️ ~v0.0.7 — **pin the version**) + Python SDK.
- **Includes:** Relayer (HTTP, handles encryption/embedding/storage/retrieval) · **Seal** E2E encryption · Sui contract (ownership + delegate access) · Indexer · Dashboard/Playground.
- **Ops:** `remember` (store+embed) · `recall` (semantic search) · `analyze` (extract facts) · `ask` (recall+LLM) · `restore` (rebuild the index from Walrus).
- **Integration:** middleware for the **Vercel AI SDK** (`@mysten-incubation/memwal/ai`) → since Mastra is built on the AI SDK it plugs in; no official Mastra adapter yet → treat it as integration work (go the **Mastra tools** route wrapping remember/recall first).
- **Endpoints:** the **Mainnet** Relayer `https://relayer.memory.walrus.xyz` (Testnet `…-staging…`). Account/delegate key created at `memory.walrus.xyz`. Setup skill: `curl -sL https://memory.walrus.xyz/skills/setup`.
- **Docs:** https://docs.wal.app/walrus-memory/getting-started/what-is-walrus-memory · `/quick-start` · https://walrus.xyz/products/walrus-memory/
- **Quick start:**
```bash
npm install @mysten-incubation/memwal
```
```ts
import { WalrusMemory } from "@mysten-incubation/memwal";
const memwal = WalrusMemory.create({
  key: "<ed25519-delegate-private-key>",
  accountId: "<memwal-account-id>",
  serverUrl: "https://relayer.memory.walrus.xyz",
  namespace: "daily-walrus:<userSuiAddress>",
});
const job = await memwal.remember("User is a Brazil fan, believes Brazil will win.");
await memwal.waitForRememberJob(job.job_id);
const res = await memwal.recall({ query: "What do we know about this user?" });
```
- ⚠️ **Judging risk:** the hosted relayer writes blobs with the **relayer's wallet**. If judges demand "written from your wallet" → self-host the relayer (needs a wallet funded with WAL+SUI) **or** keep the raw `@mysten/walrus` path (section B). Recommendation: do both; ask on Discord to be safe.

## B. Raw Walrus blob — `@mysten/walrus`
- **Package:** `@mysten/walrus` (⚠️ ~v1.1.7) + `@mysten/sui`.
- **Mainnet objects (verified):** `systemObjectId 0x2134d52768ea07e8c43570ef975eb3e4c27a39fa6396bef985b5abc58d03ddd2` · `stakingPoolId 0x10b9d30c28448939ce6c4d6c6e0ffce4a7f8a4ada8248bdad09ef8b70e4a3904`.
```ts
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { WalrusClient } from '@mysten/walrus';
const suiClient = new SuiClient({ url: getFullnodeUrl('mainnet') });
const walrus = new WalrusClient({ network: 'mainnet', suiClient,
  packageConfig: { systemObjectId: '0x2134…ddd2', stakingPoolId: '0x10b9…3904' } });

const { blobId } = await walrus.writeBlob({
  blob: new TextEncoder().encode(JSON.stringify(profile)),
  deletable: true, epochs: 26, signer: sessionKeypair });   // 1 epoch = 14 days
const bytes = await walrus.readBlob({ blobId });
```
- **Quilt** (`writeFiles` with multiple `WalrusFile`) batches many small blobs into 1 tx → much cheaper (docs: ~106x for 100KB, ~420x for 10KB). Use it for multi-item snapshots.
- **HTTP API:** read Mainnet via the public aggregator (e.g. `https://aggregator.walrus-mainnet.walrus.space/v1/blobs/<blobId>`); ⚠️ **there is no public Mainnet publisher** (writing costs SUI+WAL) → you must write yourself with a funded wallet.
- **Mutable memory:** blobs are immutable → keep a **pointer on a Sui object** (HEAD) pointing to the latest blobId; or an append-only log (`prevBlobId`). MemWal already handles this.

## C. Mainnet cost & wallet
- Price **$0.023/GB/month** paid in **WAL** (includes erasure coding ~4.5–5x). Small blobs are dominated by the **fixed per-blob fee** → **Quilt** is the biggest cost lever; write **async/batched**, not 1 blob per message.
- You need **WAL** (storage) + **SUI** (gas, up to 3 tx per write + a deposit for the Sui object — burn it back to recover most of it).
- Calculator: https://costcalculator.wal.app/ · `walrus info` / `walrus store --dry-run`.
- Fund the wallet: buy SUI → swap SUI→WAL via the `walrus` CLI. Sample config: `curl --create-dirs https://docs.wal.app/setup/client_config.yaml -o ~/.config/walrus/client_config.yaml`.
- **Session wallet:** `new Ed25519Keypair()`; store `getSecretKey()` (suiprivkey…) in a secret; `toSuiAddress()` to fund it. Mainnet RPC `getFullnodeUrl('mainnet')`.

## D. Walrus Sites (deploy the frontend)
```bash
# install site-builder (macOS)
curl -sSfL https://raw.githubusercontent.com/Mystenlabs/suiup/main/install.sh | sh
suiup install site-builder@mainnet
# mainnet config
curl https://raw.githubusercontent.com/MystenLabs/walrus-sites/refs/heads/mainnet/sites-config.yaml -o ~/.config/walrus/sites-config.yaml
# build + deploy
npm run build   # Vite -> ./dist
site-builder --context=mainnet deploy --epochs 12 ./dist
# update an existing site: add --object-id 0x<site-object-id>
```
- **SPA routing (required):** create `ws-resources.json` at the build root:
```json
{ "routes": { "/*": "/index.html" } }
```
(this file is read at deploy time, not served; missing it → refreshing a sub-route gives a 404.)
- URL: a Base36 subdomain `https://<base36>.wal.app` (from the object id; `site-builder convert`); attach **SuiNS** (suins.io) for a nice URL.
- Mainnet sites package: `0x5a0c509a659ba982f91ff1189872b8d528f8c02b5f6285a3931fc4c2869ccc9c`.
- Docs: https://docs.wal.app/docs/sites/getting-started/installing-the-site-builder · `/publishing-your-first-site` · `/configuration`

## E. Mastra + ai-sdk + Claude
- **Packages:** `@mastra/core`, `@mastra/memory`, `@mastra/pg`, `@mastra/client-js`, `@ai-sdk/anthropic`. ⚠️ Mastra is migrating to **v1** → pin the version, follow the migration.
- **Model:** router string `model: 'anthropic/claude-sonnet-4-6'` (needs `ANTHROPIC_API_KEY`) — ⚠️ the router may **not have `claude-opus-4-8` yet** (only seen up to opus-4-7). Safe: the direct provider `createAnthropic(...)('claude-opus-4-8')`.
- **Server:** `mastra dev` (Hono, **port 4111**, auto REST + Studio). Prod: `mastra build` → `node .mastra/output/index.mjs`. CORS: `server.cors.origin = ['https://<suins>.wal.app','http://localhost:5173']`.
- **Client:** `@mastra/client-js` → `client.getAgent('roast-agent').stream(msg, { memory: { resource: userId, thread } })`.
- **Memory (if doing it ourselves to replace/supplement MemWal):** `@mastra/memory` `Memory` with `workingMemory` (resource-scoped, a Markdown template — a persistent profile) + `semanticRecall` (pgvector) + `lastMessages`. Resource-scoped needs LibSQL/Postgres/Upstash. Embedder: `openai/text-embedding-3-small` (needs an OpenAI key) or `@mastra/fastembed` (local/free).
- **A custom storage adapter = a trap** (the `memory` domain is broad, with sparse docs) → do NOT write a full adapter yourself; only `MastraVector` is compact. Use a **mirror-to-Walrus hook**.
- Docs: https://mastra.ai/docs/memory/overview · `/working-memory` · `/semantic-recall` · https://mastra.ai/reference/storage/postgresql · https://mastra.ai/models/providers/anthropic

## F. Supabase (free)
- Limits 2026: **500MB** Postgres · **pgvector included** · 50k MAU auth · realtime (200 concurrent / 2M msg) · edge functions 500k/mo · **2 projects** · ⚠️ **pauses after ~7 days idle**.
- ⚠️ May 2026: new projects need **explicit Postgres grants** for the Data API (if REST 403 → check grants/RLS).
- **Gotchas with `@mastra/pg`:** use the **session pooler (5432)**, NOT the transaction PgBouncer (6543); let Mastra create its own schema (`schemaName:'mastra'`), **don't** point it at an existing embeddings table (issue #6263); requires SSL.
- Roles: pgvector (if using Mastra recall) · `walrus_index` · `fixtures` cache · `leaderboard` · realtime · auth (optional).
- ⚠️ **Pause + host idle = a big demo risk** → keep-alive cron or pay for the judging window.

## G. Hosting the Mastra server
- **Railway** (top pick: persistent, streaming, easy env vars) > Render (free **spin-down** when idle) > Fly.io > Mastra Cloud (managed) > Vercel (serverless timeout, awkward PG pooling) > Cloudflare (avoid — pg TCP is hard).

## H. Brand & theme (verified from live CSS)
- The official Walrus mascot = **"Aurora"**; tagline **"Trust the Tusk."** → we make our own mascot **"Gil"** (same universe, different character).
- **Verified colors:** teal `#37c3b0` · ink `#0d0f12` · cream `#faf8f5` · mint `#98EFDD` · lavender `#CAB1FF` · lime `#E8FF75` · purple `#6800FF` · sky `#A1C8FF` · electric blue `#0098F5`.
- **Verified fonts:** `PP Neue Bit` (pixel display, embedded on wal.app) · `DM Sans` · `JetBrains Mono` · `Inter`.
- Chosen theme: **THE DAILY WALRUS** (tabloid). Detailed tokens in [design-direction](05-design-direction.md).
- Sources: walrus.xyz · docs.wal.app (curl with a browser-UA; ⚠️ WebFetch 403s on *.wal.app) · costcalculator.wal.app · npm @mysten-incubation/memwal & @mysten/walrus · github MystenLabs/walrus(+walrus-sites).
