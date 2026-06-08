# Research Notes (reference) — verified ~8/6/2026

> Chi tiết SDK/CLI/ID để dùng khi build. ⚠️ = cần verify lại lúc code (mọi thứ rất mới / beta).

## A. Walrus Memory (MemWal) — ngôi sao
- **Là sản phẩm chính thức** của Mysten/Walrus (ra mắt ~21/5/2026, **beta nhưng dùng được trên Mainnet**). Không chỉ là pattern.
- **Package:** `@mysten-incubation/memwal` (TS, ⚠️ ~v0.0.7 — **pin version**) + Python SDK.
- **Gồm:** Relayer (HTTP, lo encryption/embedding/storage/retrieval) · **Seal** E2E encryption · Sui contract (ownership + delegate access) · Indexer · Dashboard/Playground.
- **Ops:** `remember` (store+embed) · `recall` (semantic search) · `analyze` (trích fact) · `ask` (recall+LLM) · `restore` (dựng lại index từ Walrus).
- **Tích hợp:** middleware cho **Vercel AI SDK** (`@mysten-incubation/memwal/ai`) → vì Mastra build trên AI SDK nên cắm được; chưa có adapter Mastra chính thức → coi như integration work (đi đường **Mastra tools** wrap remember/recall trước).
- **Endpoints:** Relayer **Mainnet** `https://relayer.memory.walrus.xyz` (Testnet `…-staging…`). Account/delegate key tạo ở `memory.walrus.xyz`. Setup skill: `curl -sL https://memory.walrus.xyz/skills/setup`.
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
const job = await memwal.remember("User là CĐV Brazil, tin Brazil vô địch.");
await memwal.waitForRememberJob(job.job_id);
const res = await memwal.recall({ query: "Ta biết gì về user này?" });
```
- ⚠️ **Rủi ro chấm điểm:** relayer hosted ghi blob bằng **ví của relayer**. Nếu BGK đòi "ví của bạn ghi" → self-host relayer (cần ví nạp WAL+SUI) **hoặc** giữ đường raw `@mysten/walrus` (mục B). Khuyến nghị: làm cả hai; hỏi Discord cho chắc.

## B. Walrus blob raw — `@mysten/walrus`
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
  deletable: true, epochs: 26, signer: sessionKeypair });   // 1 epoch = 14 ngày
const bytes = await walrus.readBlob({ blobId });
```
- **Quilt** (`writeFiles` với nhiều `WalrusFile`) gom nhiều blob nhỏ trong 1 tx → rẻ hơn nhiều (docs: ~106x cho 100KB, ~420x cho 10KB). Dùng cho snapshot nhiều mục.
- **HTTP API:** read Mainnet qua public aggregator (vd `https://aggregator.walrus-mainnet.walrus.space/v1/blobs/<blobId>`); ⚠️ **không có public publisher Mainnet** (write tốn SUI+WAL) → phải tự ghi bằng ví funded.
- **Mutable memory:** blob immutable → giữ **con trỏ trên Sui object** (HEAD) trỏ tới blobId mới nhất; hoặc append-only log (`prevBlobId`). MemWal đã tự lo việc này.

## C. Chi phí & ví Mainnet
- Giá **$0.023/GB/tháng** trả bằng **WAL** (đã gồm erasure coding ~4.5–5x). Blob nhỏ bị **phí cố định/blob** chi phối → **Quilt** là đòn bẩy chi phí lớn nhất; ghi **async/batch**, đừng 1 blob/tin nhắn.
- Cần **WAL** (storage) + **SUI** (gas, tới 3 tx/lần ghi + deposit cho Sui object — burn lại để hoàn phần lớn).
- Calculator: https://costcalculator.wal.app/ · `walrus info` / `walrus store --dry-run`.
- Nạp ví: mua SUI → swap SUI→WAL qua `walrus` CLI. Config mẫu: `curl --create-dirs https://docs.wal.app/setup/client_config.yaml -o ~/.config/walrus/client_config.yaml`.
- **Session wallet:** `new Ed25519Keypair()`; lưu `getSecretKey()` (suiprivkey…) vào secret; `toSuiAddress()` để nạp tiền. Mainnet RPC `getFullnodeUrl('mainnet')`.

## D. Walrus Sites (deploy frontend)
```bash
# install site-builder (macOS)
curl -sSfL https://raw.githubusercontent.com/Mystenlabs/suiup/main/install.sh | sh
suiup install site-builder@mainnet
# mainnet config
curl https://raw.githubusercontent.com/MystenLabs/walrus-sites/refs/heads/mainnet/sites-config.yaml -o ~/.config/walrus/sites-config.yaml
# build + deploy
npm run build   # Vite -> ./dist
site-builder --context=mainnet deploy --epochs 12 ./dist
# update lại site cũ: thêm --object-id 0x<site-object-id>
```
- **SPA routing (bắt buộc):** tạo `ws-resources.json` ở gốc build:
```json
{ "routes": { "/*": "/index.html" } }
```
(file này đọc lúc deploy, không được serve; thiếu nó → refresh route con bị 404.)
- URL: Base36 subdomain `https://<base36>.wal.app` (từ object id; `site-builder convert`); gắn **SuiNS** (suins.io) để có URL đẹp.
- Mainnet sites package: `0x5a0c509a659ba982f91ff1189872b8d528f8c02b5f6285a3931fc4c2869ccc9c`.
- Docs: https://docs.wal.app/docs/sites/getting-started/installing-the-site-builder · `/publishing-your-first-site` · `/configuration`

## E. Mastra + ai-sdk + Claude
- **Packages:** `@mastra/core`, `@mastra/memory`, `@mastra/pg`, `@mastra/client-js`, `@ai-sdk/anthropic`. ⚠️ Mastra đang chuyển **v1** → pin version, theo migration.
- **Model:** router string `model: 'anthropic/claude-sonnet-4-6'` (cần `ANTHROPIC_API_KEY`) — ⚠️ router có thể **chưa có `claude-opus-4-8`** (mới thấy tới opus-4-7). An toàn: provider trực tiếp `createAnthropic(...)('claude-opus-4-8')`.
- **Server:** `mastra dev` (Hono, **port 4111**, auto REST + Studio). Prod: `mastra build` → `node .mastra/output/index.mjs`. CORS: `server.cors.origin = ['https://<suins>.wal.app','http://localhost:5173']`.
- **Client:** `@mastra/client-js` → `client.getAgent('roast-agent').stream(msg, { memory: { resource: userId, thread } })`.
- **Memory (nếu tự làm thay/bổ trợ MemWal):** `@mastra/memory` `Memory` với `workingMemory` (resource-scoped, template Markdown — hồ sơ bền vững) + `semanticRecall` (pgvector) + `lastMessages`. Resource-scoped cần LibSQL/Postgres/Upstash. Embedder: `openai/text-embedding-3-small` (cần OpenAI key) hoặc `@mastra/fastembed` (local/free).
- **Custom storage adapter = bẫy** (domain `memory` rộng, ít docs) → KHÔNG tự viết full adapter; chỉ `MastraVector` là nhỏ gọn. Dùng **hook mirror-to-Walrus**.
- Docs: https://mastra.ai/docs/memory/overview · `/working-memory` · `/semantic-recall` · https://mastra.ai/reference/storage/postgresql · https://mastra.ai/models/providers/anthropic

## F. Supabase (free)
- Limits 2026: **500MB** Postgres · **pgvector included** · 50k MAU auth · realtime (200 concurrent / 2M msg) · edge functions 500k/mo · **2 project** · ⚠️ **pause sau ~7 ngày idle**.
- ⚠️ May 2026: project mới cần **grants Postgres tường minh** cho Data API (nếu REST 403 → check grants/RLS).
- **Gotchas với `@mastra/pg`:** dùng **session pooler (5432)**, KHÔNG transaction PgBouncer (6543); để Mastra tự tạo schema (`schemaName:'mastra'`), **đừng** trỏ vào bảng embeddings có sẵn (issue #6263); cần SSL.
- Vai trò: pgvector (nếu dùng Mastra recall) · `walrus_index` · cache `fixtures` · `leaderboard` · realtime · auth (tuỳ chọn).
- ⚠️ **Pause + host idle = rủi ro demo lớn** → cron keep-alive hoặc trả phí cửa sổ chấm.

## G. Hosting Mastra server
- **Railway** (top pick: persistent, streaming, env vars dễ) > Render (free **spin-down** idle) > Fly.io > Mastra Cloud (managed) > Vercel (serverless timeout, PG pooling awkward) > Cloudflare (tránh — pg TCP khó).

## H. Brand & theme (verified từ live CSS)
- Mascot Walrus chính thức = **"Aurora"**; tagline **"Trust the Tusk."** → ta làm mascot riêng **"Gil"** (cùng vũ trụ, khác nhân vật).
- **Màu verified:** teal `#37c3b0` · ink `#0d0f12` · cream `#faf8f5` · mint `#98EFDD` · lavender `#CAB1FF` · lime `#E8FF75` · purple `#6800FF` · sky `#A1C8FF` · electric blue `#0098F5`.
- **Fonts verified:** `PP Neue Bit` (pixel display, nhúng trên wal.app) · `DM Sans` · `JetBrains Mono` · `Inter`.
- Theme đã chọn: **THE DAILY WALRUS** (tabloid). Tokens chi tiết ở [design-direction](05-design-direction.md).
- Nguồn: walrus.xyz · docs.wal.app (curl browser-UA; ⚠️ WebFetch 403 với *.wal.app) · costcalculator.wal.app · npm @mysten-incubation/memwal & @mysten/walrus · github MystenLabs/walrus(+walrus-sites).
