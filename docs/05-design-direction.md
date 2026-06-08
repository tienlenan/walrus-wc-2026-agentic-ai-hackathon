# Design Direction — The Daily Walrus

> Liên kết: [plan](01-plan.md) · [user-flows](04-user-flows.md) · [research-notes](06-research-notes.md)
> Nguyên tắc: **anti-AI-slop** — không glassmorphism crypto tối generic. Mọi màn = "một trang báo".

## 1. Concept: "THE DAILY WALRUS" (tabloid báo thể thao cổ điển)
Một tờ báo lá cải thể thao in giấy: tiêu đề hét to, lưới cột, halftone, dấu mộc "STOP PRESS". Mascot **Gil** là cây bút biếm hoạ của toà soạn. Mọi tính năng diễn đạt theo ẩn dụ báo chí: dự đoán = "Predictions Desk", roast = "Gil's Verdict", chia sẻ = "Report Card / back-page".

**Vì sao chọn:** vui + dễ chia sẻ + **không đụng hàng** crypto UI tối; bảng màu cream/teal/đỏ **gần với màu thật của Walrus** (teal `#37c3b0`) nên vừa nổi bật vừa "Walrus-native". Một BLV hải mã biết tuốt thì **đúng chất đặt vào một cột báo**.

**Fallback:** *Walrus Arcade* (8-bit, `Press Start 2P`) — nhại luôn font pixel `PP Neue Bit` của Walrus; sản xuất nhanh, cực meme. Giữ làm phương án B / mini-game.

## 2. Mascot: "Gil the Walrus"
BLV hải mã già đời, "xem World Cup từ 1954". **Ngà = ria mép handlebar**. Đội **mũ phóng viên có thẻ PRESS** (hoặc tai nghe BLV), kính nửa vành trễ mũi, khăn quàng theo màu theme. Tính cách: tỉnh bơ, biết tuốt, cà khịa nhưng thương — **không bao giờ cay độc**.
> Ownable nhờ combo **ngà-ria + mũ press**, khác hẳn mascot "Aurora" thân thiện của Walrus → cùng vũ trụ, khác nhân vật.

**Bộ 6 biểu cảm (sticker sheet, viền 2–3px, flat + 1 highlight, xuất PNG/SVG nền trong):**
1. **Smug** — mắt lim dim, nhếch mép, xoắn ngà (idle/mặc định).
2. **Roasting/cackling** — ngửa đầu cười, vỗ đùi (khi bạn đoán trật).
3. **Shocked** — mắt lồi, mũ bật, giọt mồ hôi (kết quả sốc/VAR).
4. **Disappointed** — nhìn qua kính, khoanh vây ("…thật à?").
5. **Celebrating** — hai vây giơ cao, confetti, khăn bay (bạn đoán trúng).
6. **"I told you so"** — chỉ vây vào camera, nháy mắt, kẹp clipboard có dấu ✓.

## 3. Design tokens (drop-in CSS variables)
```css
:root {
  /* Surfaces */
  --paper:    #f4ecd8;  /* newsprint ngả vàng (bg) */
  --paper-2:  #fbf7ec;  /* giấy trắng (surface/card) */
  --ink:      #1a1714;  /* mực in (text chính) */
  --ink-soft: #57514a;  /* mực nhạt (muted) */

  /* Brand / status */
  --teal:     #37c3b0;  /* teal Walrus thật — spot color */
  --teal-deep:#0a2540;  /* xanh mực đậm (heading nhấn) */
  --red:      #c8102e;  /* đỏ tabloid (kicker / danger) */
  --green:    #1f7a3d;  /* success / dự đoán đúng */

  /* Lines */
  --rule:     #d8cdb4;  /* hairline column rule */
  --rule-bold:#1a1714;  /* viền mạnh kiểu khung báo */

  /* Type */
  --font-display: "Anton", Impact, sans-serif;          /* headline hét */
  --font-masthead:"Playfair Display", Georgia, serif;   /* nameplate báo */
  --font-body:    "DM Sans", system-ui, sans-serif;     /* body (Walrus-native) */
  --font-mono:    "JetBrains Mono", monospace;          /* tỉ số/odds/stat */

  /* Shape */
  --radius: 4px;        /* báo in → bo góc rất nhẹ */
  --shadow-print: 2px 2px 0 var(--ink); /* đổ bóng "in lệch" hard shadow */
}
```
**Google Fonts:** `Anton`, `Playfair Display`, `DM Sans`, `JetBrains Mono`.

## 4. Hệ thống hình ảnh & texture
- **Halftone**: chấm tròn cho ảnh/đổ bóng Gil (cảm giác in báo).
- **Hairline rules** giữa cột; **khung viền đậm** quanh "box" quan trọng.
- **Masthead nameplate**: "THE DAILY WALRUS · EST. 2026 · MEMORY EDITION" + dateline (matchweek).
- **Dấu mộc xoay**: "STOP PRESS", "EXCLUSIVE", "GIL'S VERDICT" — xoay nhẹ 3–6°.
- **Faux barcode / dateline / pull-quote** để lấp khoảng trống cho ra chất báo.
- **Teal như mực spot**: nền grayscale, teal điểm xuyết (link, nhấn, "ink stamp").
- Ảnh Gil = **biếm hoạ halftone**, đặt cạnh byline.

## 5. Ngôn ngữ component
| Thành phần | Diễn đạt tabloid |
|---|---|
| Header app | **Masthead** nameplate + dateline + "ấn bản hôm nay" |
| Chat với Gil | **Cột phỏng vấn**: bóng chat = đoạn báo; câu roast = **pull-quote "GIL'S VERDICT"** có viền |
| Đặt dự đoán | **"Predictions Desk"** kiểu phiếu cá cược ghim lên báo |
| Lịch/kết quả | **Bảng tỉ số** mono trong khung, kiểu bảng kết quả cuối báo |
| My Record / Notebook | **"Gil's Notebook"** — trang sổ tay, các fact như mẩu cắt dán |
| Leaderboard | **Bảng xếp hạng** kiểu cột "standings" |
| Before/After | **Hai trang báo cạnh nhau**: "SỐ RA NGÀY 1" vs "SỐ MỚI NHẤT" |
| Empty/loading | "Gil đang lục sổ…", "Toà soạn đang lên khuôn…" |

## 6. "Gil's Report Card" — shareable (1080×1350) ⭐
Ảnh tự sinh để screenshot đăng **#Walrus / #TrustTheTusk**. Bố cục trên→dưới:
1. **Masthead bar**: "THE DAILY WALRUS · PREDICTION REPORT CARD" + dateline.
2. **Hero**: Gil (biểu cảm theo phong độ) bên trái + **grade A+→F** đóng mộc đỏ bên phải.
3. **Stat line** (mono): `PREDICTIONS 12 · CORRECT 4 · STREAK 0 · ACCURACY 33%`.
4. **The roast** (pull-quote): *"Ông đặt cửa đội đó thắng? Cặp ngà của tôi đoán còn chuẩn hơn."*
5. **Mini fixtures**: 2–3 quả bóng generic, dự đoán vs thực tế (✔/✗).
6. **Footer**: "Powered by Walrus · lưu mãi mãi, y như mấy kèo trật của ông" + teal mark.
> Render bằng canvas/`satori`→PNG ở server, hoặc html-to-image ở client.

## 7. Iconography World Cup 2026 — DO / DON'T
Đồng chủ nhà **Mỹ/Canada/Mexico**, hè 2026, **48 đội** (bracket lớn rất hợp theme).
**DO (an toàn, tự vẽ được):** bóng generic ngũ-lục giác (CC0); vạch sân (vòng tròn giữa, vòng cấm) như hình học; **bracket/cây đấu loại**, scoreboard, đồng hồ; confetti/khăn/cờ-bunting generic; lá phong / xương rồng-mặt trời / sao-sọc **dạng motif hình học trung tính**; boots, còi, thẻ vàng-đỏ, cờ góc.
**DON'T (dính nhãn hiệu):** ❌ tên/huy hiệu **FIFA**, **cúp vô địch**, **logo/mascot 2026 chính thức**; ❌ huy hiệu ĐTQG/liên đoàn, **áo đấu**, **logo nhà tài trợ**; ❌ **trái bóng/typeface chính thức**; ❌ **tên/khuôn mặt cầu thủ thật** trong ảnh marketing (cà khịa trong gameplay thì ok, nhưng đừng ship chân dung); ❌ tự nhận "chính thức" — luôn rõ là app fan/parody.

## 8. Accessibility & responsive
- Tương phản: ink trên paper đạt; đỏ/teal chỉ dùng cho nhấn, không cho text nhỏ trên nền sát màu.
- Mobile-first: masthead co lại, lưới cột → 1 cột; bảng tỉ số scroll ngang.
- Không phụ thuộc màu để truyền đạt đúng/sai → kèm icon ✔/✗ + nhãn.
- Tôn trọng `prefers-reduced-motion` (tắt confetti/animation mạnh).

## 9. Việc cần làm khi build UI
- [ ] Vẽ/sinh **6 biểu cảm Gil** (sticker sheet) + 1 logo nameplate.
- [ ] Dựng **design tokens** (CSS vars / Tailwind theme) từ §3.
- [ ] Component lõi: Masthead, VerdictPullQuote, Scoreboard, PredictionSlip, NotebookCard, BeforeAfter, ReportCard.
- [ ] Roast card generator (satori/canvas).
- [ ] Halftone + hard-shadow utilities.
> Khi vào giai đoạn build UI, cân nhắc chạy skill **hallmark** để audit/nâng chất lượng và giữ "anti-AI-slop".
