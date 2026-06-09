---
phase: 6
title: "Leaderboard & Indexer"
status: implemented
priority: P2
effort: "1d"
dependencies: [5]
---

# Phase 6: Leaderboard & Indexer

## Overview
Indexer đọc event on-chain bằng Sui GraphQL (`MatchRegistered`/`PredictionSubmitted`/`Scored`) → upsert Supabase (predictions mirror + leaderboard) → UI realtime qua SSE. Leaderboard là view dựng lại được từ chain.

## Requirements
- **Functional:** GraphQL `events(filter:{type})` theo type, cursor-persist; upsert `predictions` + per-user totals; leaderboard xếp hạng theo points; realtime push lên web.
- **Non-functional:** eventual consistency (vài giây) chấp nhận; cursor bền (resume sau restart); idempotent upsert.

## Architecture
- `event-indexer.ts` (server): loop `SuiGraphQLClient.events(filter:{type})`; lưu cursor (Supabase `indexer_cursor`); upsert `predictions` + `users.total_points/streak` từ event.
- Leaderboard = `SELECT ... ORDER BY total_points DESC` (view sẵn có, điều chỉnh nguồn = chain mirror).
- Web: `/api/game/stream` SSE snapshot + polling fallback.

## Related Code Files
- Create: `apps/server/src/services/event-indexer.ts`, `apps/server/src/services/sui-events.ts`, `apps/server/src/dev/rebuild-indexer.ts`, `apps/web/src/components/leaderboard.tsx`
- Modify: `packages/db/sql/schema.sql` (leaderboard nguồn từ mirror), `apps/server/src/serve.ts` (chạy indexer loop), `apps/web/src/App.tsx` (Leaderboard section)
- Delete: —

## Implementation Steps
1. Schema: `indexer_cursor`, `users.total_points/streak/best_streak`, `predictions.tx_digest/chain_status`.
2. `event-indexer.ts`: cursor loop cho `PredictionSubmitted` (mirror prediction) + `Scored` (cập nhật points). Idempotent.
3. Điều chỉnh `leaderboard` view → đọc từ `users.total_points` (đã do indexer cập nhật).
4. `leaderboard.tsx`: render + subscribe SSE `/api/game/stream`, fallback polling.
5. Verify: scoring on-chain (Phase 5) → trong vài giây leaderboard + my-record cập nhật, realtime đẩy.

## Progress — 2026-06-09
- Done: `packages/db/sql/schema.sql` adds `indexer_cursor`, `scoring_events`, user totals/streak fields, prediction chain fields, rebuilt `leaderboard` view.
- Done: `apps/server/src/services/event-indexer.ts` indexes `MatchRegistered`, `MatchSettled`, `PredictionSubmitted`, `Scored` with GraphQL event cursors and idempotent score events.
- Done: `apps/server/src/services/game-snapshot.ts` + `apps/web/src/components/leaderboard.tsx` expose/read ranked leaderboard and My Record.
- Done: SSE stream `/api/game/stream` pushes live leaderboard snapshot; polling fallback remains.
- Verified: schema applied, cursor reset replay indexed 3 events, snapshot returned 1 fixture + 1 leaderboard row.
- Verified: no app imports of deprecated `SuiJsonRpcClient/queryEvents`; event filtering uses GraphQL per Sui SDK migration docs.

## Success Criteria
- [x] Indexer fold event → Supabase chính xác (mirror predictions + points), cursor resume được.
- [x] Leaderboard xếp hạng đúng theo điểm on-chain; realtime cập nhật.
- [x] Reset cursor → dựng lại mirror events idempotent.

## Risk Assessment
- Indexer lag (eventual) → chấp nhận cho game; carry `new_total` trong event nên upsert đơn giản.
- Cursor mất → reset từ 0 (idempotent nên an toàn, chỉ chậm).
- GraphQL event endpoint/network drift → `SUI_GRAPHQL_URL` env override.
