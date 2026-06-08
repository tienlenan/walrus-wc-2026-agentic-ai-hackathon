# The Daily Walrus — Project Plan

> Bài dự thi **Walrus Memory World Cup** (5–24/6/2026, kết quả 2/7/2026).
> Tài liệu liên quan: [requirements](02-requirements.md) · [architecture](03-architecture.md) · [user-flows](04-user-flows.md) · [design-direction](05-design-direction.md) · [research-notes](06-research-notes.md)

## TL;DR (Tiếng Việt)
**The Daily Walrus** = một "tờ báo thể thao AI" về World Cup 2026, dẫn dắt bởi mascot **Gil — chú hải mã bình luận viên già đời, hay cà khịa**. Người dùng dự đoán kết quả, đưa hot-take; Gil **nhớ** mọi dự đoán/quan điểm (lưu trên **Walrus Memory / Mainnet**), theo dõi thành tích, rồi **cà khịa** bạn bằng chính lịch sử của bạn. Điểm ăn tiền: **trí nhớ thật** tạo ra khác biệt rõ rệt giữa "Gil ngày 1" và "Gil ngày 5+".

## Sản phẩm: The Daily Walrus
Một AI World Cup 2026 buddy theo phong cách **tờ báo lá cải thể thao cổ điển** ("THE DAILY WALRUS — EST. 2026"):
- **Hỏi–đáp**: lịch thi đấu, kết quả, phân tích trận vui vẻ.
- **Dự đoán**: user đoán tỉ số/đội thắng từng trận & cả giải; hệ thống chấm đúng/sai theo thời gian.
- **Trí nhớ + cà khịa**: Gil nhớ đội bạn yêu, các "hot-take", thành tích dự đoán → cà khịa cá nhân hoá ("Bạn lại đặt cửa đội đó à? Cặp ngà của tôi đoán còn chuẩn hơn").
- **Khoảnh khắc chia sẻ**: "Gil's Report Card" — tấm thẻ điểm/roast tự sinh để screenshot đăng #Walrus.

## Vì sao thắng được (map vào 3 tiêu chí chấm)
| Tiêu chí | Cách The Daily Walrus đáp ứng |
|---|---|
| **1. Memory Depth & Authenticity** | Dùng **Walrus Memory (MemWal)** thật trên Mainnet + sổ dự đoán có cấu trúc. Có "harness" tái lập được khoảnh khắc **before/after** (Gil ngày 1 trắng tay vs Gil ngày 5 nhắc đúng hot-take cũ của bạn). |
| **2. Creativity & Flair** | Concept **tabloid + mascot Gil** độc nhất, không "AI-slop". Roast card để chia sẻ → lan truyền. |
| **3. Technical Execution** | MVP gọn, chạy thật trên **Walrus Mainnet** (site + memory), stack hiện đại (Mastra + Claude + Supabase). "MVP chạy được" > "tham vọng mà hỏng". |

## Quyết định stack (tóm tắt — chi tiết ở [architecture](03-architecture.md))
- **Frontend:** React + Vite → deploy **Walrus Sites (Mainnet)** qua `site-builder`.
- **Agent runtime:** **Mastra** (`@mastra/core`) + **ai-sdk** + **Gemini qua Vercel AI Gateway** (`google/gemini-3-flash`).
- **Trí nhớ (ngôi sao):** **Walrus Memory** — `@mysten-incubation/memwal` — `remember`/`recall`/`ask`, lưu blob mã hoá (Seal) trên Walrus Mainnet. Cắm vào Mastra qua AI SDK middleware hoặc Mastra tools.
- **DB:** **Supabase free** (Postgres + pgvector + realtime) — sổ dự đoán, cache lịch/kết quả, leaderboard, bảng `walrus_index` (con trỏ tới blob/account), user registry.
- **Server:** Mastra Hono server host trên **Railway** (persistent, hỗ trợ streaming).
- **Ví:** Sui Ed25519 keypair làm **dedicated session wallet** (yêu cầu của BTC), nạp WAL + SUI.

## Lộ trình & milestone (hôm nay 8/6 → hạn 24/6)
> ⏱️ **Đường găng (critical path):** màn before/after cần **≥ 4 ngày** memory tích luỹ thật. Phải cho MemWal **ghi memory thật chậm nhất ~12/6** để kịp có "ngày 1 vs ngày 5+" lúc chấm. → *Dựng vòng lặp trí nhớ TRƯỚC, polish sau.*

| Mốc | Nội dung | Mục tiêu ngày |
|---|---|---|
| **M0** | Plan / requirements / architecture / design (tài liệu này) | 8/6 ✅ |
| **M1 — Skeleton** | Monorepo, Vite app, Mastra server "hello agent", Supabase project, tạo session wallet + nạp WAL/SUI | 8–10/6 |
| **M2 — Memory spine** ⭐ | Tích hợp **MemWal** (remember/recall), sổ dự đoán Supabase, harness before/after, **bắt đầu ghi memory thật** | 10–12/6 |
| **M3 — Core UX** | Chat với Gil (streaming), UI dự đoán, lịch/kết quả, leaderboard | 12–16/6 |
| **M4 — Theme polish** | Design system "The Daily Walrus", art mascot Gil (6 biểu cảm), roast card generator | 15–19/6 |
| **M5 — Deploy Mainnet** | Build → Walrus Sites Mainnet, Supabase prod, Railway, gắn tên SuiNS, `ws-resources.json` cho SPA | 18–21/6 |
| **M6 — Nộp bài** | Video demo ≤3', Walrus Memory feedback form, post #Walrus trên X, submit DeepSurge + Airtable | 21–24/6 |

## Sổ rủi ro (từ research)
| Rủi ro | Ảnh hưởng | Giảm thiểu |
|---|---|---|
| BGK diễn giải "memory trên Walrus *từ ví của bạn*" — relayer hosted ghi bằng ví của relayer | Có thể mất điểm tiêu chí 1 | Giữ thêm **1 đường ghi raw `@mysten/walrus`** từ session wallet để chứng minh on-chain; hỏi BTC qua Discord |
| **MemWal là beta** (v0.0.7), API đổi | Vỡ build | Pin version; fallback raw `@mysten/walrus` |
| **Supabase free tạm dừng sau ~7 ngày** không hoạt động + Railway free idle | App "chết" đúng lúc chấm | Cron keep-alive, hoặc trả phí cho cửa sổ demo |
| Chi phí Mainnet (WAL + SUI), phí cố định mỗi blob lớn với blob nhỏ | Tốn / chậm | Nạp ví sớm; **Quilt** gom blob nhỏ; ghi memory **async**, batch |
| Mastra đang chuyển v1 | Lệch API | Pin version, theo migration notes |
| Mastra nhận chuỗi `google/...` trần → route sang Google trực tiếp (đòi GOOGLE_API_KEY) | Lỗi model | Dùng `@ai-sdk/gateway` `createGateway({apiKey: AI_GATEWAY_API_KEY})` tường minh |

## Quyết định còn mở (cần xác nhận)
1. **Tên & theme:** Product = **"The Daily Walrus"**, theme = **tabloid báo thể thao** (mascot Gil). Fallback: **Walrus Arcade** (8-bit). → *OK chứ?*
2. **Danh tính user:** MVP dùng **địa chỉ Sui làm `resourceId`** (không cần auth nặng); có thể thêm Supabase Auth sau. → mặc định: wallet-as-identity.
3. **Embeddings/recall:** Ưu tiên **dùng recall của MemWal** (relayer tự lo embeddings) → không cần OpenAI key. Mastra semantic recall chỉ là tuỳ chọn.
4. **Host server:** **Railway** cho Mastra server. (Mastra Cloud là phương án 2.)

→ Nếu bạn duyệt các mặc định trên, bước kế tiếp là **M1: dựng skeleton** (xem [requirements](02-requirements.md) & [architecture](03-architecture.md)).
