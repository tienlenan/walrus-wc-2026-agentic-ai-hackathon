# 🦭📰 The Daily Walrus — Walrus Memory World Cup

> Bài dự thi cho **Walrus Sessions: Walrus Memory World Cup** (Walrus Foundation).
> Luật chính thức: https://thewalrussessions.wal.app/memory-world-cup/index.html

## TL;DR (Tiếng Việt)
**The Daily Walrus** là một "tờ báo thể thao AI" về **FIFA World Cup 2026**, dẫn dắt bởi mascot
**Gil — chú hải mã bình luận viên già đời, hay cà khịa**. Người dùng dự đoán kết quả & đưa hot-take;
Gil **nhớ** mọi dự đoán/quan điểm — lưu **canonical trên Walrus Memory / Mainnet** — rồi theo dõi
thành tích và **cà khịa cá nhân hoá** bằng chính lịch sử của bạn. Điểm ăn tiền: **trí nhớ thật** tạo
khác biệt rõ rệt giữa "Gil ngày 1" và "Gil ngày 5+" (before/after). Giao diện web công khai (prediction
history, Gil's Notebook, roast card) cho thấy trí nhớ "đang hoạt động".

## 📂 Tài liệu (bắt đầu ở đây)
| Doc | Nội dung |
|---|---|
| [docs/01-plan.md](docs/01-plan.md) | Concept sản phẩm, lộ trình/milestone, rủi ro, quyết định còn mở |
| [docs/02-requirements.md](docs/02-requirements.md) | Yêu cầu chức năng/phi chức năng + compliance hackathon |
| [docs/03-architecture.md](docs/03-architecture.md) | Kiến trúc hệ thống, data model, luồng trí nhớ, deploy, env |
| [docs/04-user-flows.md](docs/04-user-flows.md) | Các luồng người dùng (gồm màn before/after) |
| [docs/05-design-direction.md](docs/05-design-direction.md) | Theme "The Daily Walrus", mascot Gil, design tokens, roast card |
| [docs/06-research-notes.md](docs/06-research-notes.md) | Chi tiết SDK/CLI/ID + nguồn (MemWal, Walrus, Mastra, Supabase) |

## 🧱 Stack
- **Frontend:** React + Vite → deploy **Walrus Sites (Mainnet)**
- **Agent:** **Mastra** (ai-sdk) + **Claude** (`claude-opus-4-8` / `claude-sonnet-4-6`)
- **Trí nhớ (ngôi sao):** **Walrus Memory** — `@mysten-incubation/memwal` (Mainnet)
- **DB:** **Supabase** free (Postgres + pgvector + realtime) — index/cache, KHÔNG phải nơi chứa memory canonical
- **Server:** Mastra Hono server trên **Railway**
- **Ví:** Sui Ed25519 session wallet (WAL + SUI)

## Mốc thời gian
- **Hackathon:** 5/6/2026 → 24/6/2026
- **Công bố kết quả:** 2/7/2026

## Phải xây gì (yêu cầu bắt buộc)
- Agent tích hợp **Walrus Memory** để theo dõi dự đoán / quan điểm / tương tác gắn với **FIFA World Cup 2026**.
- **Trí nhớ thật sự bền vững:** phải tham chiếu được điều đã học về user ở phiên trước — một khoảnh khắc
  *before/after* rõ ràng (agent ngày 1 vs. agent sau ít nhất 4 ngày sử dụng).
- **Toàn bộ state + memory của agent lưu trên Walrus**, deploy trên **Mainnet**.
- Có **giao diện/site công khai** nơi nhìn thấy trí nhớ đang hoạt động (prediction history, roast thành tích,
  debate log, hoặc hình thức khác làm trí nhớ trở nên rõ ràng và có ý nghĩa).
- Tạo **ví riêng (dedicated wallet)** cho session.
- Cung cấp **link project live** + **video demo ≤ 3 phút**.

## Tiêu chí chấm điểm
1. **Memory Depth & Authenticity** — trí nhớ có thực sự thay đổi hành vi agent theo thời gian không?
   Tín hiệu rõ nhất là khoảnh khắc before/after thật.
2. **Creativity & Flair** — có thú vị, đáng chia sẻ, dùng bối cảnh World Cup một cách bất ngờ/vui không?
   Project nào trông giống nhau sẽ bị điểm thấp dù kỹ thuật tốt.
3. **Technical Execution & Completeness** — có chạy live trên Walrus Mainnet, ổn định, MVP hoàn chỉnh không?
   Một MVP nhỏ mà chạy được ăn điểm cao hơn project tham vọng mà không hoạt động.

## Giải thưởng (denominated in WAL)
| Best Submission | Giải |
|---|---|
| 1st | $500 |
| 2nd | $400 |
| 3rd | $300 |
| 4th | $200 |
| 5th | $100 |

- **Best Feedback:** 6 người thắng, mỗi người $50 WAL.
- **Special Prizes:** $200 WAL (theo quyết định của ban giám khảo).
- **Referral:** referrer hợp lệ nhận thêm 25% giá trị giải (chỉ áp dụng giải 1st–5th).

## Checklist nộp bài
- [ ] Đăng ký trên nền tảng **DeepSurge**
- [ ] Điền form nộp bài: https://airtable.com/appoDAKpC74UOqoDa/shrIl2BMnzMwpuLhO
- [ ] Project chạy live trên **Walrus Mainnet** + có trên DeepSurge
- [ ] Giao diện công khai cho thấy trí nhớ hoạt động
- [ ] Video demo ≤ 3 phút
- [ ] Cung cấp địa chỉ ví riêng cho session
- [ ] Hoàn thành Walrus Memory feedback form (kèm GitHub tickets nếu có)
- [ ] Tham gia Walrus Discord: https://discord.com/invite/walrusprotocol
- [ ] Đăng demo/screenshot/link kèm **#Walrus** trên X
- [ ] GitHub repo public

## Trạng thái project
- [x] **M0** — Chốt ý tưởng (The Daily Walrus) + tech stack + plan/requirements/architecture/flows/design
- [ ] **M1** — Skeleton: monorepo, Vite app, Mastra server, Supabase, session wallet
- [ ] **M2** — Memory spine: tích hợp Walrus Memory (MemWal) + sổ dự đoán + before/after ⭐ *bắt đầu sớm*
- [ ] **M3** — Core UX: chat Gil, dự đoán, lịch/kết quả, leaderboard
- [ ] **M4** — Theme polish: design system + mascot Gil + roast card
- [ ] **M5** — Deploy Walrus Mainnet + Supabase prod + Railway + SuiNS
- [ ] **M6** — Video demo ≤3', feedback form, post #Walrus, submit DeepSurge/Airtable
