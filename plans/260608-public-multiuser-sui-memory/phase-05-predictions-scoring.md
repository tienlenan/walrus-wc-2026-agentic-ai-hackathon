---
phase: 5
title: "Predictions & Scoring"
status: implemented
priority: P1
effort: "2d"
dependencies: [1, 2, 4]
---

# Phase 5: Predictions & Scoring

## Overview
UI + luồng dự đoán (kết quả trận, MVP, cầu thủ tệ, vô địch, đội đi tiếp) → submit lên contract; server oracle chấm off-chain và ghi shared Scoreboard; hybrid MVP/worst user vote.

> ⚠️ **RED TEAM:** Scoring đổi sang **server grade off-chain → ghi shared `Scoreboard` (OracleCap)** (sponsored tx không ký thay user trên owned `Prediction`). Bỏ "score_prediction do user/keeper gọi". HTTP execute bắt buộc `ORACLE_ADMIN_TOKEN`; dry-run là default.

## Requirements
- **Functional:** form dự đoán theo trận + theo giải; `submit_prediction`, khoá lúc kickoff; sau kết quả → `record_scores` bằng OracleCap; points/streak; trang "thành tích của tôi".
- **Non-functional:** UI theme tabloid (Predictions Desk); optimistic UI + mirror từ event; idempotent (1 prediction/user/match/kind).

## Architecture
- **Predictions Desk (web):** chọn trận (từ `fixtures`) → form theo kind → `buildSubmitPrediction` → dapp-kit wallet execute. Champion/advance dùng cùng form.
- **Hybrid MVP/worst:** sau trận, hiện rating seed + nút vote; vote ghi `match_votes`.
- **Scoring trigger:** server keeper → dry-run/execute predictions chưa scored của trận đó → `buildRecordScores` qua `SuiGrpcClient`.
- **Mirror:** predictions/scoring hiển thị từ Supabase (indexer Phase 6), không đọc thẳng chain ở hot path.

## Related Code Files
- Create: `apps/web/src/components/predictions-desk.tsx`, `apps/server/src/services/score-keeper.ts`, `apps/server/src/dev/score-match.ts`
- Modify: `apps/web/src/App.tsx` (thêm Predictions Desk + My Record), `packages/contract/src/client.ts` (submit/score builders), `packages/db` (mirror predictions: +tx_digest, chain_status)
- Delete: —

## Implementation Steps
1. `predictions-desk.tsx`: chọn trận, nhập theo kind, submit qua wallet tx; disable sau kickoff.
2. Champion + advance forms (theo đội/vòng).
3. MVP/worst vote UI sau trận (ghi `match_votes`).
4. `score-keeper.ts`: grade predictions chưa scored → `record_scores` bằng OracleCap qua `SuiGrpcClient`.
5. `my-record.tsx`: points, streak, lịch sử đúng/sai (từ Supabase mirror).
6. Verify: user dự đoán 1 trận (on-chain) → settle → được chấm on-chain → điểm phản ánh ở My Record + sẵn cho leaderboard.

## Progress — 2026-06-09
- Done: `apps/web/src/components/predictions-desk.tsx` supports 5 contract kinds and user-pays signing through dapp-kit.
- Done: MVP/worst vote tables/API/UI (`match_votes`, `/api/game/vote`).
- Done: `apps/server/src/services/score-keeper.ts` supports dry-run and guarded execute via `SuiGrpcClient`.
- Done: `apps/web/src/lib/game-api.ts` reads fixture/record/vote snapshot from server.
- Decision: no historical data preservation; reset/replay is acceptable before public data.

## Success Criteria
- [x] User submit đủ 5 loại dự đoán (on-chain), khoá đúng lúc kickoff.
- [x] Sau result, oracle service có thể ghi `record_scores` → points/streak cập nhật on-chain + mirror.
- [x] MVP/worst vote hoạt động; My Record hiển thị đúng từ snapshot.

## Risk Assessment
- Scoring cần trigger → server keeper guarded by `ORACLE_ADMIN_TOKEN`; dry-run trước execute.
- Lock-at-kickoff dựa Clock on-chain (không tin client).
- Idempotency: contract chặn double-score (`EAlreadyScored`); UI chặn double-submit.
