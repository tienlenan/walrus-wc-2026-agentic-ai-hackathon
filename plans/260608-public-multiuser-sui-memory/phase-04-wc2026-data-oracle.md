---
phase: 4
title: "WC2026 Data & Oracle"
status: pending
priority: P2
effort: "1.5d"
dependencies: [2]
---

# Phase 4: WC2026 Data & Oracle

## Overview
Nạp lịch/kết quả/rating cầu thủ từ **API-Football** (free) + **openfootball** (fallback) vào Supabase `fixtures`; **oracle** đẩy kết quả lên contract (`settle_match`) để chấm điểm; seed MVP/cầu thủ tệ từ rating (hybrid với vote).

## Requirements
- **Functional:** seed lịch từ openfootball; poll API-Football fixtures/results/player-ratings (`league=1&season=2026`); cache Supabase; oracle settle_match sau khi trận xong; seed MVP(rating cao nhất)/worst(thấp nhất) + bảng vote.
- **Non-functional:** tôn trọng cap 100 req/ngày (cache, chỉ poll trận live/just-finished); rating có thể trống trước 11/6 → fallback vote.

## Architecture
- `packages/data`: `api-football.ts` (header `x-apisports-key`, endpoints fixtures/events/lineups/players), `openfootball.ts` (static JSON schedule).
- `ingest-fixtures.ts` (server): seed + poll → upsert Supabase `fixtures` (+ player ratings cho trận xong).
- `settle-oracle.ts` (server, OracleCap, sponsored): map kết quả Supabase → `settle_match(matchId, home, away, winner, mvp_player, worst_player)`.
- **Hybrid MVP/worst:** seed `mvp_player`/`worst_player` từ rating; bảng `match_votes` cho user vote; chốt = rating nếu đủ tin, else vote-major (quy tắc cấu hình).

## Related Code Files
- Create: `packages/data/src/api-football.ts`, `packages/data/src/openfootball.ts`, `packages/data/src/index.ts`, `packages/data/package.json`, `apps/server/src/services/ingest-fixtures.ts`, `apps/server/src/services/settle-oracle.ts`, `packages/db/sql/0002_votes.sql` (bảng `match_votes`)
- Modify: `packages/db/sql/schema.sql` (fixtures + player rating cols), `.env.example` (+FOOTBALL_API_KEY, FOOTBALL_API_BASE), `apps/server/src/serve.ts` (cron/endpoint ingest)
- Delete: —

## Implementation Steps
1. `packages/data`: client API-Football + loader openfootball. Map team/player ids ổn định.
2. Mở rộng `fixtures` (stage/round, player ratings json) + bảng `match_votes(match_id,user_id,kind,player_id)`.
3. `ingest-fixtures.ts`: seed schedule (openfootball) → upsert; job poll trận live/finished (cron nhẹ) → cập nhật score + ratings; cache để né cap.
4. Trên contract: `register_match` cho từng trận (kickoff_ms từ lịch) — admin sponsored.
5. `settle-oracle.ts`: sau trận xong, tính MVP/worst (rating hoặc vote) → `settle_match` (OracleCap, sponsored).
6. Verify: fixtures đầy; 1 trận finished → settle on-chain; MVP/worst có giá trị.

## Success Criteria
- [ ] `fixtures` Supabase đầy lịch + cập nhật kết quả ≥1 trận thật.
- [ ] 1 trận `settle_match` thành công on-chain (MatchSettled emit).
- [ ] MVP/worst seed từ rating; bảng vote ghi nhận được vote.

## Risk Assessment
- Rating trống trước giải → ưu tiên vote; chốt rule rating-vs-vote cấu hình được.
- Cap 100 req/ngày → cache mạnh + openfootball; chỉ poll trận đang diễn ra/just-finished.
- Oracle centralized (chấp nhận hackathon) — OracleCap tách AdminCap, settle 1 lần/trận.
