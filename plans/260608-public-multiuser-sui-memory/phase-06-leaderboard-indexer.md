---
phase: 6
title: "Leaderboard & Indexer"
status: pending
priority: P2
effort: "1d"
dependencies: [5]
---

# Phase 6: Leaderboard & Indexer

## Overview
Indexer đọc event on-chain (`PredictionSubmitted`/`PredictionScored`) → upsert Supabase (predictions mirror + leaderboard) → UI realtime. Leaderboard là **materialized view dựng lại được** từ chain.

## Requirements
- **Functional:** poll `queryEvents` theo type, cursor-persist; upsert `predictions` + per-user totals; leaderboard xếp hạng theo points; realtime push lên web.
- **Non-functional:** eventual consistency (vài giây) chấp nhận; cursor bền (resume sau restart); idempotent upsert.

## Architecture
- `event-indexer.ts` (server): loop `client.queryEvents({ query:{ MoveEventType: \`${PKG}::prediction_game::PredictionScored\` }, cursor, order:'ascending' })`; lưu cursor (Supabase `indexer_cursor`); upsert `predictions.result/scored_at` + `users.total_points/streak` (lấy `new_total` từ event).
- Leaderboard = `SELECT ... ORDER BY total_points DESC` (view sẵn có, điều chỉnh nguồn = chain mirror).
- Web: Supabase **realtime** subscribe leaderboard + my-record.

## Related Code Files
- Create: `apps/server/src/services/event-indexer.ts`, `packages/db/sql/0003_indexer.sql` (indexer_cursor, points cols), `apps/web/src/components/leaderboard.tsx`, `apps/web/src/lib/realtime.ts`
- Modify: `packages/db/sql/schema.sql` (leaderboard nguồn từ mirror), `apps/server/src/serve.ts` (chạy indexer loop), `apps/web/src/App.tsx` (Leaderboard section)
- Delete: —

## Implementation Steps
1. Schema: `indexer_cursor`, `users.total_points/streak/best_streak`, `predictions.tx_digest/chain_status`.
2. `event-indexer.ts`: cursor loop cho `PredictionSubmitted` (mirror prediction) + `PredictionScored` (cập nhật points/result). Idempotent.
3. Điều chỉnh `leaderboard` view → đọc từ `users.total_points` (đã do indexer cập nhật).
4. `leaderboard.tsx` + `realtime.ts`: render + subscribe realtime.
5. Verify: scoring on-chain (Phase 5) → trong vài giây leaderboard + my-record cập nhật, realtime đẩy.

## Success Criteria
- [ ] Indexer fold event → Supabase chính xác (mirror predictions + points), cursor resume được.
- [ ] Leaderboard xếp hạng đúng theo điểm on-chain; realtime cập nhật.
- [ ] Mất Supabase data → dựng lại được từ chain (chạy lại indexer từ cursor 0).

## Risk Assessment
- Indexer lag (eventual) → chấp nhận cho game; carry `new_total` trong event nên upsert đơn giản.
- Cursor mất → reset từ 0 (idempotent nên an toàn, chỉ chậm).
- queryEvents rate → backoff; cân nhắc GraphQL nếu cần.
