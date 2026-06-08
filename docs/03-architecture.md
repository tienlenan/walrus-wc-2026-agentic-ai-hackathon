# Architecture — The Daily Walrus

> Liên kết: [plan](01-plan.md) · [requirements](02-requirements.md) · [user-flows](04-user-flows.md) · [research-notes](06-research-notes.md) (chi tiết SDK + nguồn)

## 0. Nguyên tắc thiết kế cốt lõi
> **Walrus = nguồn chân lý cho trí nhớ. Supabase = index/cache có thể dựng lại.**
> Đây là điểm mấu chốt để đạt tiêu chí "all agent state and memory on Walrus" mà vẫn dùng được Supabase cho truy vấn nhanh. Nếu mất Supabase, ta **restore lại từ Walrus**.

## 1. Sơ đồ hệ thống
```
┌───────────────────────────────────────────────────────────────────────┐
│  FRONTEND — React + Vite (static)                                       │
│  Deploy: WALRUS SITES (Mainnet)  →  https://<suins>.wal.app             │
│  - Chat với Gil (streaming)   - Prediction history / Memory panel       │
│  - Leaderboard (realtime)     - Roast card generator                    │
│  - "Verify on Walrus" links   - Before/After viewer                     │
│  Dùng @mastra/client-js, truyền { memory: { resource, thread } }        │
└───────────────┬───────────────────────────────────────────────────────┘
                │ HTTPS (CORS) + SSE streaming
                ▼
┌───────────────────────────────────────────────────────────────────────┐
│  MASTRA SERVER — Hono (Node) trên Railway, port 4111                    │
│  - roastAgent: instructions (persona Gil) + tools                       │
│  - model: claude-opus-4-8 / claude-sonnet-4-6 (ai-sdk)                  │
│  - tools: remember, recall, getFixture, makePrediction, scorePredictions,│
│           getLeaderboard, getMyRecord, verifyOnWalrus                    │
│  - memory hooks: ghi MemWal + mirror sang Walrus (async)                │
└───┬───────────────────┬────────────────────┬──────────────────┬────────┘
    │ Claude (ai-sdk)   │ Walrus Memory      │ Supabase (PG)    │ Walrus raw
    ▼                   ▼                    ▼                  ▼
┌──────────┐  ┌────────────────────┐  ┌──────────────────┐  ┌────────────────┐
│ Anthropic│  │ WALRUS MEMORY      │  │ SUPABASE (free)  │  │ @mysten/walrus │
│ Claude   │  │ @…/memwal (relayer)│  │ - predictions    │  │ writeBlob từ   │
│ opus/    │  │ remember/recall/ask│  │ - fixtures cache │  │ session wallet │
│ sonnet   │  │ Seal-encrypted     │  │ - leaderboard    │  │ (proof-of-write│
│          │  │ blobs trên Walrus  │  │ - walrus_index   │  │  on Mainnet)   │
│          │  │ MAINNET ⭐         │  │ - users          │  │ + Quilt batch  │
└──────────┘  └─────────┬──────────┘  └──────────────────┘  └───────┬────────┘
                        │  blobs (canonical memory)                  │
                        └──────────────► WALRUS STORAGE (Mainnet) ◄──┘
```

## 2. Thành phần & vai trò

### 2.1 Frontend — React + Vite (Walrus Sites)
- SPA tĩnh, build ra `dist/`. Deploy bằng `site-builder ... deploy --epochs N ./dist`.
- **SPA routing**: thêm `ws-resources.json` ở gốc build với `{"routes": {"/*": "/index.html"}}` (Walrus Sites tĩnh, không có server fallback → thiếu file này sẽ 404 khi refresh route con).
- Gọi Mastra server qua `@mastra/client-js`; **truyền `{ memory: { resource: <suiAddress>, thread: <id> } }`** mỗi request → đây là cách memory bám theo user.
- Không giữ secret nào. Mọi key ở server.

### 2.2 Mastra server (Hono trên Railway)
- `@mastra/core` đăng ký `roastAgent`; chạy `mastra build` → `node .mastra/output/index.mjs`.
- **Model:** **Gemini qua Vercel AI Gateway** — `@ai-sdk/gateway` `createGateway({ apiKey: AI_GATEWAY_API_KEY })('google/gemini-3-flash')`. ⚠️ Truyền chuỗi `google/...` trần cho Mastra sẽ route sang Google trực tiếp (đòi GOOGLE_API_KEY) → phải dùng gateway provider tường minh.
- **CORS:** bật `server.cors.origin = ['https://<suins>.wal.app', 'http://localhost:5173']`.
- **Tools** (mỗi tool là `createTool` với zod schema): xem §5.
- **Memory hooks:** sau mỗi lượt → `remember` các fact mới vào MemWal; mirror snapshot hồ sơ sang Walrus (async, không chặn phản hồi).

### 2.3 Walrus Memory (MemWal) — ngôi sao
- Package `@mysten-incubation/memwal` (beta). Quick start:
```ts
import { WalrusMemory } from "@mysten-incubation/memwal";
const memwal = WalrusMemory.create({
  key: process.env.MEMWAL_DELEGATE_KEY!,      // ed25519 delegate key
  accountId: process.env.MEMWAL_ACCOUNT_ID!,  // account onchain (Sui) sở hữu memory
  serverUrl: "https://relayer.memory.walrus.xyz", // MAINNET relayer
  namespace: `daily-walrus:${suiAddress}`,    // scope theo user
});
await memwal.remember("User là CĐV Brazil, tin Brazil vô địch, ghét kèo cửa dưới.");
const r = await memwal.recall({ query: "Ta biết gì về gu bóng đá của user này?" });
```
- MemWal tự lo: **embeddings + semantic recall + Seal encryption + ghi blob lên Walrus + ownership on-chain (Sui contract) + indexer + `restore`** (dựng lại index từ Walrus). → đáp ứng R-H1/H2/H3 gọn gàng và **đúng chủ đề hackathon**.
- **Tích hợp Mastra:** MemWal có middleware cho Vercel AI SDK (`@mysten-incubation/memwal/ai`); vì Mastra build trên AI SDK nên cắm được. Phương án an toàn hơn (kiểm soát rõ): bọc `remember`/`recall` thành **Mastra tools** và **inject kết quả recall vào system prompt**. → MVP đi đường tools trước, thử middleware sau.

### 2.4 Supabase (Postgres + pgvector + realtime)
- **KHÔNG phải nơi chứa "trí nhớ agent" canonical** — chỉ là index/cache/structured app data → tránh xung đột với R-H3.
- Dùng **session pooler (port 5432)**, KHÔNG dùng transaction PgBouncer (6543) với client `pg`.
- Để Mastra tự tạo schema riêng nếu dùng `@mastra/pg` (namespace `schemaName: 'mastra'`); bảng app tách riêng.
- **Cảnh báo:** free tier **tạm dừng sau ~7 ngày** idle → cron keep-alive trong tuần chấm.

### 2.5 Walrus raw (`@mysten/walrus`) — đường hedge
- Một service nhỏ ghi **snapshot có cấu trúc** (hồ sơ + sổ dự đoán) thành blob/Quilt **bằng chính session wallet** → bằng chứng on-chain độc lập với relayer (phòng khi BGK đòi "ví của bạn ghi").
- `writeBlob({ blob, deletable:true, epochs, signer: sessionKeypair })`; lưu `blobId` vào `walrus_index`.

## 3. Mô hình dữ liệu

### 3.1 Trên Walrus (canonical)
| Loại | Nội dung | Cơ chế |
|---|---|---|
| **Memory items** | fact/quan điểm/dự đoán dạng ngữ nghĩa | MemWal `remember` (blob mã hoá + index on-chain) |
| **Profile snapshot** | hồ sơ CĐV (JSON) tại mốc thời gian | raw `writeBlob`/Quilt từ session wallet; con trỏ ở Supabase |
| **Predictions snapshot** | sổ dự đoán (JSON) | Quilt batch định kỳ |

### 3.2 Trên Supabase (index/cache — có thể dựng lại từ Walrus)
```sql
-- người dùng
users(id uuid pk, sui_address text unique, memwal_account_id text,
      display_name text, favorite_team text, created_at timestamptz)

-- sổ dự đoán (chấm điểm)
predictions(id uuid pk, user_id uuid fk, match_id text,
      kind text,                 -- 'winner' | 'scoreline' | 'tournament'
      payload jsonb,             -- vd {"winner":"BRA"} hoặc {"home":2,"away":1}
      created_at timestamptz, locked_at timestamptz,
      result text,               -- 'pending' | 'correct' | 'wrong'
      scored_at timestamptz)

-- cache lịch/kết quả
fixtures(match_id text pk, stage text, home text, away text,
      kickoff timestamptz, status text, home_score int, away_score int,
      updated_at timestamptz)

-- con trỏ tới Walrus (verify)
walrus_index(id uuid pk, user_id uuid fk, kind text,   -- 'profile'|'predictions'|'memory'
      blob_id text, object_id text, epoch int, hash text, updated_at timestamptz)

-- leaderboard (materialized view từ predictions)
leaderboard_mv(user_id, display_name, total, correct, accuracy, streak)
```
- **Realtime** đẩy cập nhật leaderboard & kết quả trận.
- `pgvector` chỉ cần nếu ta tự làm semantic recall ở Mastra; nếu dựa vào recall của MemWal thì có thể bỏ → giảm phụ thuộc.

## 4. Luồng trí nhớ (đây là phần "ăn điểm")

### 4.1 Ghi (khi user tương tác)
```
user gửi tin / đặt dự đoán
  → Mastra agent xử lý
  → ghi structured vào Supabase (predictions/users)         [sync, nhanh]
  → memwal.remember(fact)                                    [async]
  → (định kỳ) snapshot profile+predictions → Walrus blob/Quilt (session wallet)
  → lưu blobId vào walrus_index
```

### 4.2 Đọc (trước khi Gil trả lời)
```
request kèm { resource: suiAddress, thread }
  → memwal.recall({ query: ngữ cảnh })  → các ký ức liên quan
  → đọc record/streak từ Supabase
  → inject "Gil's notebook" vào system prompt
  → Claude sinh câu trả lời có cá nhân hoá + cà khịa
```

### 4.3 Before/After (chứng minh tiêu chí 1)
- **Day-1 baseline:** gọi agent với `resource` mới tinh (memory rỗng) → câu trả lời chung chung.
- **Day-N:** cùng câu hỏi, cùng `resource` đã tích luỹ ≥4 ngày → câu trả lời nhắc đúng hot-take/thành tích cũ.
- Harness lưu lại cả hai để render **Before/After viewer** (F-UI-5) và quay demo. Vì memory **resource-scoped**, cùng code path nhưng output khác → bằng chứng "memory làm việc thật".

## 5. Danh sách tools của agent (zod-typed)
| Tool | Input | Việc làm |
|---|---|---|
| `recallMemory` | `{ query }` | `memwal.recall` → trả ký ức liên quan để nạp ngữ cảnh |
| `rememberMemory` | `{ fact, tags? }` | `memwal.remember` fact mới |
| `getFixture` | `{ team?, date? }` | đọc cache `fixtures` (Supabase) |
| `makePrediction` | `{ matchId, kind, payload }` | ghi `predictions` + remember |
| `scorePredictions` | `{ matchId }` | so kết quả → cập nhật correct/wrong, streak |
| `getMyRecord` | `{}` | W–L, accuracy, streak của user |
| `getLeaderboard` | `{ limit? }` | top theo accuracy |
| `verifyOnWalrus` | `{ kind }` | trả `blobId/objectId` + URL aggregator/explorer để verify |

## 6. Triển khai (deployment)
| Thành phần | Hạ tầng | Ghi chú |
|---|---|---|
| Frontend | **Walrus Sites Mainnet** | `site-builder --context=mainnet deploy --epochs 12 ./dist`; gắn **SuiNS** cho URL đẹp; `ws-resources.json` cho SPA |
| Mastra server | **Railway** | container Node chạy `node .mastra/output/index.mjs`; persistent; streaming |
| DB | **Supabase** | session pooler; cron keep-alive |
| Memory | **MemWal relayer (Mainnet)** + Walrus | `relayer.memory.walrus.xyz` |
| Wallet | Sui Ed25519 | session wallet, nạp **WAL + SUI**; 1 epoch = 14 ngày |

## 7. Bí mật & cấu hình (env)
**Server (Railway):** `AI_GATEWAY_API_KEY`, `GIL_MODEL` (vd `google/gemini-3-flash`), `DATABASE_URL` (Supabase session pooler), `MEMWAL_ACCOUNT_ID`, `MEMWAL_DELEGATE_KEY`, `MEMWAL_RELAYER_URL`, `SESSION_WALLET_KEY` (suiprivkey…), `SUI_RPC_URL`, `WALRUS_AGGREGATOR_URL`, `CORS_ORIGINS`.
**Frontend (Vite, public):** `VITE_MASTRA_URL`, `VITE_SUI_NETWORK=mainnet`, `VITE_WALRUS_AGGREGATOR_URL`, `VITE_SUINS_NAME`.
> Quy tắc: bất cứ thứ gì là bí mật → chỉ ở server. `VITE_*` luôn public.

## 8. Cấu trúc thư mục đề xuất (monorepo, pnpm workspaces)
```
walrus-memory-world-cup/
├─ apps/
│  ├─ web/            # React + Vite (deploy Walrus Sites)
│  └─ server/         # Mastra + tools + memory hooks (deploy Railway)
├─ packages/
│  ├─ walrus/         # wrapper MemWal + raw @mysten/walrus + Quilt helpers
│  ├─ db/             # schema Supabase + truy vấn + migrations
│  └─ shared/         # types, zod schemas, persona Gil, prompt
├─ docs/              # tài liệu (file này)
└─ scripts/           # seed, keep-alive cron, deploy, before/after harness
```

## 9. Mở / cần xác minh khi build
- Cơ chế tích hợp MemWal ↔ Mastra (middleware AI SDK vs tools) — thử nghiệm ở M2.
- MemWal hosted relayer có đủ "ví của bạn ghi" theo BGK không → giữ đường raw `@mysten/walrus` (§2.5) làm bằng chứng; hỏi Discord.
- Pin chính xác version `@mysten-incubation/memwal`, `@mysten/walrus@1.x`, `@mastra/*` (đang chuyển v1).
- Nguồn dữ liệu lịch/kết quả World Cup (API bóng đá free) → cache vào `fixtures`.
