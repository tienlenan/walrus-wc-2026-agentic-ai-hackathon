# User Flows — The Daily Walrus

> Liên kết: [requirements](02-requirements.md) · [architecture](03-architecture.md) · [design-direction](05-design-direction.md)

Ký hiệu: **Gil** = mascot/agent. `resourceId` = địa chỉ Sui của user (neo trí nhớ).

---

## Bản đồ màn hình
```
Landing ("THE DAILY WALRUS" front page)
 ├─ Onboard / Connect (tạo hoặc nối ví Sui → resourceId)
 ├─ Newsroom (chat chính với Gil)            ← màn lõi
 ├─ Predictions desk (đặt & xem dự đoán)
 ├─ My Record / Gil's Notebook (memory panel + history)
 ├─ Leaderboard (realtime)
 ├─ Before/After (chứng minh trí nhớ)        ← cho BGK & demo
 └─ Roast Card (sinh ảnh chia sẻ)
```

---

## Flow 1 — Onboarding & danh tính (ngày đầu)
**Mục tiêu:** có `resourceId` ổn định để memory bám theo.
1. User mở `https://<suins>.wal.app` → trang nhất "tờ báo" với Gil chào.
2. Chọn **"Bước vào toà soạn"** → tạo ví Sui ngay trong app *hoặc* nối ví có sẵn.
   - Tạo mới: app sinh Ed25519 keypair → đó là `resourceId`; nhắc user sao lưu.
3. (Tuỳ chọn) khai báo **đội yêu thích** → `remember("CĐV <team>")` + lưu `users.favorite_team`.
4. Gil chào theo kiểu tabloid: *"Lại một tân binh dự đoán. Để xem cặp ngà này sai mấy lần…"*
> Day-1 baseline được chụp tại đây (memory rỗng) để sau dựng Before/After.

## Flow 2 — Hỏi–đáp & phân tích (bất kỳ lúc nào)
1. User hỏi: "Tối nay có trận nào hay?" / "Brazil đá với ai?"
2. Agent gọi `getFixture` (cache Supabase) → trả lịch/kết quả + **bình luận vui** có cá tính.
3. Nếu hỏi về cầu thủ → phân tích + cà khịa nhẹ (an toàn, không xúc phạm thật, không dùng tên/khuôn mặt thật trong ảnh — xem design §iconography).
4. Gil `recall` trước khi trả lời → chèn ngữ cảnh cá nhân nếu có ("Đội ruột của ông lại đá đấy").

## Flow 3 — Đặt dự đoán (P0)
1. Tại **Predictions desk** (hoặc ngay trong chat) user chọn trận → dự đoán **đội thắng/hoà** và (tuỳ chọn) **tỉ số**.
2. `makePrediction` → ghi `predictions` (Supabase) + `remember("Dự đoán <match>: <payload>")` (MemWal).
3. Gil phản ứng tức thì dựa trên **lịch sử**: *"Lại đặt cửa trên à? Lần trước ông đoán kiểu này trật lất đấy."*
4. Dự đoán **khoá** khi tới giờ bóng lăn (`locked_at`).

## Flow 4 — Chấm điểm & cập nhật thành tích (tự động khi có kết quả)
1. Job cập nhật `fixtures` (kết quả) → `scorePredictions(matchId)`.
2. Mỗi dự đoán → `correct`/`wrong`; cập nhật **W–L, accuracy, streak**; refresh `leaderboard_mv`.
3. `remember` "khoảnh khắc": *"User trượt dự đoán <match> — streak đứt ở 0."* → nguyên liệu để roast sau.
4. Realtime đẩy cập nhật lên **Leaderboard** & **My Record**.

## Flow 5 — Phiên quay lại & ROAST cá nhân hoá (ngày 2..N) ⭐
**Đây là flow thể hiện "trí nhớ làm việc".**
1. User quay lại (phiên/thread mới) cùng `resourceId`.
2. Trước khi trả lời, agent `recall` + đọc record → dựng **"Gil's notebook"**.
3. Gil mở lời bằng chính lịch sử user: *"Chào người đoán giỏi. 2/9 đúng. Hôm nay lại tính khen đội ruột chứ gì?"*
4. Nếu user đổi lập trường → Gil **vạch mâu thuẫn**: *"Tuần trước ông bảo Pháp vô địch, giờ lại Argentina?"*
5. User có thể bấm **"Gil nhớ gì về tôi?"** → mở **Memory panel** (đọc từ Walrus) + link **verify on Walrus**.

## Flow 6 — Before/After viewer (cho BGK & video) ⭐
**Mục tiêu:** chứng minh tiêu chí *Memory Depth & Authenticity*.
1. Vào trang **Before/After**.
2. Cột trái = **"Gil ngày 1"**: trả lời câu hỏi mẫu với memory rỗng (đã chụp lúc onboard, hoặc chạy với `resource` sạch).
3. Cột phải = **"Gil bây giờ"**: cùng câu hỏi, `resource` đã tích luỹ ≥4 ngày → trả lời cá nhân hoá, nhắc đúng dự đoán/hot-take cũ.
4. Highlight phần "chỉ có được nhờ trí nhớ" (vd: trích nguyên hot-take cũ + ngày).
5. Nút **"Mở blob trên Walrus"** để BGK tự kiểm chứng nguồn ký ức.

## Flow 7 — Roast Card chia sẻ (lan truyền)
1. User bấm **"Lấy thẻ điểm của tôi"**.
2. App render **"Gil's Report Card"** 1080×1350: masthead + biểu cảm Gil (ăn mừng/roast) + grade A+→F + dòng stat (`PREDICTIONS · CORRECT · STREAK · ACCURACY`) + 1 câu roast + footer "Powered by Walrus".
3. Tải ảnh / nút **"Đăng #Walrus"** (mở X với caption sẵn).

## Flow 8 — Verify on Walrus (niềm tin & điểm kỹ thuật)
1. Ở Memory panel / Report card → nút **"Verify on Walrus"**.
2. Mở `blobId`/`objectId` trên aggregator/explorer Mainnet → cho thấy ký ức/snapshot thật nằm on-chain.
3. Phục vụ NF-5 (khả năng kiểm chứng) & tăng tin tưởng khi chấm.

---

## Trạng thái rỗng & lỗi (đừng quên)
- **Empty:** user mới chưa có lịch sử → Gil "khích" đặt dự đoán đầu tiên thay vì màn trống.
- **Chưa tới kết quả:** dự đoán hiển thị "pending"; không chấm sớm.
- **Mất mạng/relayer lỗi:** vẫn cho chat cơ bản; ghi memory **retry async**; báo nhẹ "Gil đang lục sổ…".
- **Supabase paused/host idle:** keep-alive cron; nếu chậm → loading state thân thiện.

## Đo lường thành công (cho demo)
- ≥1 tài khoản có **≥4 ngày** lịch sử thật trước khi chấm.
- Before/After cho khác biệt **nhìn là thấy**.
- ≥1 roast card được chia sẻ công khai (#Walrus).
- Memory mở được on-chain trong < 3 cú click.
