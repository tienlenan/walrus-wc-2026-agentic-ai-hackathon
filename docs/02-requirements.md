# Requirements — The Daily Walrus

> Liên kết: [plan](01-plan.md) · [architecture](03-architecture.md) · [user-flows](04-user-flows.md) · [design-direction](05-design-direction.md)

## 1. Mục tiêu & phạm vi
Xây một AI agent (mascot **Gil the Walrus**) chủ đề **FIFA World Cup 2026** có **trí nhớ bền vững trên Walrus Mainnet**, thể hiện rõ khác biệt hành vi theo thời gian (before/after), kèm giao diện web công khai để "nhìn thấy" trí nhớ hoạt động (lịch sử dự đoán, roast, leaderboard).

**Trong phạm vi (MVP):** chat với Gil, dự đoán trận, chấm điểm dự đoán, trí nhớ MemWal, roast cá nhân hoá, lịch/kết quả, leaderboard, roast card chia sẻ, deploy Mainnet.
**Ngoài phạm vi (lúc này):** đăng nhập mạng xã hội, thanh toán, mobile app native, đa ngôn ngữ đầy đủ, mô hình tự huấn luyện.

---

## 2. Yêu cầu bắt buộc của Hackathon (compliance — KHÔNG được thiếu)
Map trực tiếp từ luật sự kiện. Đây là tiêu chí pass/fail.

- [ ] **R-H1** Agent tích hợp **Walrus Memory** theo dõi dự đoán/quan điểm/tương tác gắn với **World Cup 2026**.
- [ ] **R-H2** **Trí nhớ bền vững thật**: agent tham chiếu được điều đã học ở phiên trước theo cách "ngày 1 không thể làm được" → có màn **before/after** (ngày 1 vs sau ≥ 4 ngày).
- [ ] **R-H3** **Toàn bộ agent state + memory lưu trên Walrus, deploy Mainnet.**
- [ ] **R-H4** **Giao diện công khai** cho thấy trí nhớ đang hoạt động (prediction history / roast / debate log…).
- [ ] **R-H5** Deploy submission trên **Walrus Mainnet** + cung cấp **địa chỉ ví riêng (dedicated wallet)**.
- [ ] **R-H6** **Link project live** + **video demo ≤ 3 phút**.
- [ ] **R-H7** Hoàn thành **Walrus Memory feedback form** (kèm GitHub tickets nếu có).
- [ ] **R-H8** Có mặt trên **DeepSurge** + nộp **Airtable form** + **GitHub repo public** + **logo/mô tả/website/contact**.
- [ ] **R-H9** Join **Walrus Discord**; post demo/screenshot/link kèm **#Walrus** trên X.

---

## 3. Yêu cầu chức năng (Functional)

### 3.1 Trí nhớ & cá nhân hoá (lõi — ưu tiên P0)
- **F-MEM-1** Mỗi user có danh tính ổn định (`resourceId` = địa chỉ Sui) để memory bám theo qua các phiên.
- **F-MEM-2** Gil **ghi nhớ** (`remember`) các sự kiện: đội yêu thích/ghét, hot-take, mỗi dự đoán, tâm trạng, "khoảnh khắc" đáng nhớ.
- **F-MEM-3** Gil **gợi nhớ** (`recall`) ngữ cảnh liên quan trước khi trả lời, và **trích dẫn lại** ký ức cũ trong câu trả lời.
- **F-MEM-4** Memory **lưu canonical trên Walrus** (MemWal/Mainnet); Supabase chỉ là index/cache (xem architecture).
- **F-MEM-5** **Hồ sơ CĐV (working profile)** tiến hoá: đội yêu thích, đối thủ, thành tích W–L, "chữ ký hot-take", mức độ "cay cú".
- **F-MEM-6** **Before/after harness**: công cụ/route nội bộ tái lập câu hỏi giống nhau với trạng thái memory rỗng vs đã tích luỹ để chứng minh khác biệt (phục vụ demo & chấm).

### 3.2 Dự đoán & chấm điểm (P0)
- **F-PRED-1** User dự đoán: đội thắng/hoà, (tuỳ chọn) tỉ số, cho từng trận; và dự đoán dài hạn (vô địch, vua phá lưới…).
- **F-PRED-2** Lưu dự đoán vào **sổ dự đoán** (Supabase) kèm timestamp, đồng thời `remember` vào MemWal.
- **F-PRED-3** Khi có kết quả → **tự chấm đúng/sai**, cập nhật thành tích & streak.
- **F-PRED-4** Khoá dự đoán sau giờ bóng lăn (không cho sửa sau kèo).

### 3.3 Hỏi–đáp & phân tích (P1)
- **F-QA-1** Trả lời lịch thi đấu, kết quả, bảng xếp hạng (từ cache Supabase + nguồn dữ liệu bóng đá).
- **F-QA-2** Phân tích trận vui vẻ, có cá tính; **cà khịa cầu thủ/đội** ở mức giải trí, không xúc phạm.
- **F-QA-3** Tranh luận hot-take: Gil nhớ lập trường cũ của bạn và "vạch" khi bạn tiền hậu bất nhất.

### 3.4 Giao diện hiển thị trí nhớ (P0 — bắt buộc R-H4)
- **F-UI-1** **Prediction history**: dòng thời gian các dự đoán + đúng/sai + streak.
- **F-UI-2** **Memory panel / "Gil's notebook"**: hiển thị những gì Gil đang nhớ về bạn (đọc từ Walrus → chứng minh on-chain).
- **F-UI-3** **Leaderboard**: xếp hạng độ chính xác (realtime).
- **F-UI-4** **Roast card generator**: sinh ảnh "Gil's Report Card" để tải/đăng.
- **F-UI-5** **Before/after viewer**: đặt cạnh nhau câu trả lời của Gil "ngày 1" vs "bây giờ" cho cùng một câu hỏi.

### 3.5 Walrus & on-chain (P0)
- **F-W-1** Deploy site lên **Walrus Sites Mainnet**; SPA routing qua `ws-resources.json`.
- **F-W-2** Memory ghi lên **Walrus Mainnet**; lưu `blobId`/account id để verify.
- **F-W-3** (Hedge) Một đường **ghi raw `@mysten/walrus`** từ session wallet để chứng minh on-chain độc lập với relayer.
- **F-W-4** Trang/nút **"verify on Walrus"**: từ UI mở được blob/đối tượng trên explorer/aggregator.

---

## 4. Yêu cầu phi chức năng (Non-functional)
- **NF-1 Hiệu năng:** phản hồi chat dạng **streaming**; thao tác UI < 200ms; ghi Walrus chạy **async** ngoài luồng trả lời.
- **NF-2 Chi phí:** nằm trong free tier Supabase + ngân sách WAL/SUI nhỏ; **Quilt** gom blob nhỏ.
- **NF-3 Độ ổn định khi demo:** chống Supabase pause & host idle (keep-alive/cron) trong cửa sổ chấm.
- **NF-4 Bảo mật:** API key (Anthropic, DB) chỉ ở server; **không** lộ ra frontend. Session wallet key trong secret manager. MemWal mã hoá Seal.
- **NF-5 Khả năng kiểm chứng:** mọi tuyên bố "đã lưu trên Walrus" phải mở được on-chain/aggregator để BGK tự kiểm.
- **NF-6 Khả dụng:** responsive (desktop + mobile), tải nhanh trên Walrus Sites (asset tối ưu).
- **NF-7 An toàn nội dung:** roast giải trí, tránh thù ghét/xúc phạm thật; tránh vi phạm nhãn hiệu FIFA/cầu thủ (xem design-direction §iconography).
- **NF-8 Khả năng tái lập:** seed data + script để dựng lại "tài khoản đã có lịch sử" phục vụ demo.

---

## 5. Định nghĩa "Done" cho MVP
1. Người lạ mở link Walrus Site, kết nối/ tạo ví, chat với Gil, đặt vài dự đoán.
2. Quay lại sau (phiên mới) → Gil **nhắc đúng** điều đã học, **cà khịa** theo thành tích.
3. Memory **xác minh được** đang nằm trên Walrus Mainnet.
4. Có **before/after** thuyết phục + **roast card** chia sẻ được.
5. Đủ checklist compliance §2.

## 6. Ưu tiên (MoSCoW)
- **Must:** F-MEM-1..6, F-PRED-1..3, F-UI-1/2/5, F-W-1/2, toàn bộ §2.
- **Should:** F-QA-1..3, F-UI-3/4, F-PRED-4, F-W-3/4.
- **Could:** voice, đa ngôn ngữ, mini-game pixel, NFT thẻ roast.
- **Won't (now):** mobile native, thanh toán, social login.
