---
phase: 7
title: "Realtime Roast Engine"
status: completed
priority: P1
effort: "2.5d"
dependencies: [3, 4]
---

# Phase 7: Realtime Roast Engine ⭐ (tính năng ngôi sao)

## Overview
Gil **roast cầu thủ / cả đội theo thời gian thực** khi trận đang diễn ra, lấy "nguyên liệu" từ **live events (API-Football) + web fetch tin tức** nạp vào DB. Gil **nhớ đã roast ai** (Walrus Memory) để callback. User cũng **request roast** bất kỳ cầu thủ/đội.

> ⚠️ **RED TEAM / scope (Balanced):** Pipeline AI gen ảnh **CHƯA tồn tại** (chỉ có text Gemini; `ai-multimodal` là skill CLI, thiếu key/storage). → **MVP = roast text + HTML/CSS "report card"** (mascot asset + record + memory callback → screenshot; deterministic, IP-safe, $0). **Realtime AI gen ảnh = STRETCH** sau **Spike C** (xác nhận HTTP endpoint Imagen/Gemini-image + key + storage). Nếu làm: CHỈ mascot/template composite (không free-gen mặt/logo thật), hard ceiling/ngày, bounded queue, rate-limit nút on-demand, moderation API trước khi publish. Rate budget API-Football: chỉ poll **1 featured match** realtime.

## Requirements
- **Functional:**
  - Phát hiện sự kiện "roastable" realtime (thẻ đỏ, phản lưới, sút hỏng pen, bị thay <60', thua đậm, bỏ lỡ cơ hội ngon) → Gil sinh roast text nhắm player/team.
  - **AI gen ảnh troll** cho roast (meme/caricature/mascot).
  - **Roast Wall / ticker realtime** trên web; user bấm "Roast cầu thủ/đội này" → roast + ảnh on-demand.
  - Lưu roast (DB + `remember` vào Walrus để Gil callback sau).
- **Non-functional:**
  - **An toàn IP/likeness:** KHÔNG ảnh mặt cầu thủ thật → dùng **mascot Gil phản ứng**, **caricature generic**, hoặc **thẻ meme dạng chữ** (TÊN dạng text + motif bóng đá generic). Tránh logo/áo đấu thật.
  - **An toàn nội dung:** vui, cà khịa, KHÔNG thù ghét/phân biệt/bôi nhọ thật → guardrail trong prompt + filter.
  - **Chi phí image-gen:** chỉ gen cho sự kiện đáng + cache theo event-type + template; quota/ngày.
  - Web fetch rate-limit + nguồn ổn định; fallback API-Football.

## Architecture
- **Live signal:** mở rộng ingest (P4) poll `fixtures/{id}/events` + `players` khi trận live → bảng `match_events`. **Roastable detector** (rule-based) tạo job roast `{target_type, target, event, match_id}`.
- **Web fetch enrichment:** `web-fetch-facts.ts` lấy tin/phong độ/chấn thương/chuyển nhượng cho target (API-Football transfers/injuries + 1 news source nhẹ) → cache `roast_facts` trong DB. Gil dùng làm nguyên liệu (đúng yêu cầu "web fetch hoặc thông tin load vào db").
- **Roast text:** Gil (Gemini) viết roast từ `event + roast_facts + memory(recall)` → publish/hash payload → user ký `OutputRecord` object → lưu `roasts` + proof index.
- **Roast image:** `roast-image.ts` gọi **ai-multimodal skill (Gemini "Nano Banana" / Imagen)** sinh ảnh: Gil mascot phản ứng (cầm thẻ đỏ, facepalm, "I told you so"), hoặc thẻ meme chữ (WANTED/CLOWN/"L") với tên text + bóng generic. Cache theo `(event_type, target)`; lưu Supabase Storage hoặc Walrus blob (verify on-chain bonus).
- **Realtime feed:** `roasts` → Supabase realtime → **Roast Wall** + ticker. On-demand: nút roast → job ngay.
- **Memory tie-in:** mỗi roast `remember(accountId, ns, "Đã roast <target>: <gist>")` → Gil callback ở chat + roast sau.

## Related Code Files
- Create: `apps/server/src/services/roast-engine.ts` (detector + orchestrator), `apps/server/src/services/roast-image.ts` (gen ảnh qua ai-multimodal), `apps/server/src/services/web-fetch-facts.ts`, `packages/db/sql/0004_roasts.sql` (`match_events`, `roast_facts`, `roasts`), `apps/web/src/components/roast-wall.tsx`, `apps/web/src/components/roast-ticker.tsx`, `apps/web/src/lib/roast-api.ts`, `apps/server/src/routes/roast.ts`
- Modify: `apps/server/src/services/ingest-fixtures.ts` (poll live events), `apps/server/src/services/chat-with-gil.ts` (nạp roast_facts + nhớ đã roast), `packages/shared/src/gil-persona.ts` (giọng roast realtime + guardrail), `apps/web/src/App.tsx` (Roast Wall section)
- Delete: —

## Implementation Steps
1. Schema `0004_roasts.sql`: `match_events(match_id,minute,type,player_id,team_id)`, `roast_facts(target,kind,text,fetched_at)`, `roasts(id,target_type,target,match_id,text,image_url,event_type,created_at)`.
2. Ingest mở rộng: poll live events trận đang đá → `match_events`; detector roastable → job.
3. `web-fetch-facts.ts`: fetch tin/form/chấn thương cho target → `roast_facts` (cache + rate-limit). (WebFetch/API-Football.)
4. `roast-engine.ts`: orchestrate → Gil sinh roast text (Gemini, guardrail) → lưu `roasts` + `remember` Walrus.
5. `roast-image.ts`: gen ảnh troll qua **ai-multimodal** (Gemini Nano Banana/Imagen), prompt **mascot/caricature/text-meme, KHÔNG mặt thật**; cache theo event-type; lưu storage.
6. `roast-wall.tsx` + `roast-ticker.tsx` + realtime; nút "Roast cầu thủ/đội" on-demand (`/api/roast`).
7. Tie-in memory: Gil callback đã roast ai (chat + roast).
8. Guardrail test: nội dung vui-không-thù-ghét; ảnh không mặt thật/logo thật.

## Success Criteria
- [x] User request roast 1 cầu thủ/đội → nhận roast text/card on-demand via `/api/roast`.
- [x] Roast Wall renders recent roasts from `/api/roasts`.
- [x] On-demand roast requires verified Sui session and records `OutputRecord` proof metadata after wallet signature.
- [x] Nội dung roast có prompt guardrail: vui, không thù ghét, không bôi nhọ đời tư/protected class.
- [x] Gil nhớ đã roast bằng Walrus Memory callback khi MemWal env bật.
- [ ] Realtime live-event detector + AI image troll remains stretch until live data/image quota is configured.

## Risk Assessment
- **IP/likeness (mặt cầu thủ, logo, áo đấu thật)** → chỉ mascot Gil/caricature/text-meme + motif generic; review prompt + (tùy) filter ảnh. Đây là rủi ro pháp lý chính.
- **Chi phí image-gen realtime** → chỉ gen sự kiện đáng + cache + template; quota/ngày; on-demand giới hạn.
- **An toàn nội dung** → guardrail prompt (vui, không xúc phạm thật/phân biệt); tránh nhate.
- **Web fetch nguồn** → chọn nguồn free/ổn định; rate-limit; fallback API-Football events.
- **Realtime tải** khi nhiều trận song song → batch/queue job roast.
