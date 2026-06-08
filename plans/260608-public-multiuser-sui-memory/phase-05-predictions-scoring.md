---
phase: 5
title: "Predictions & Scoring"
status: pending
priority: P1
effort: "2d"
dependencies: [1, 2, 4]
---

# Phase 5: Predictions & Scoring

## Overview
UI + luồng dự đoán (kết quả trận, MVP, cầu thủ tệ, vô địch, đội đi tiếp) → submit lên contract (sponsored); chấm điểm on-chain sau khi settle; hybrid MVP/worst (rating seed + user vote).

> ⚠️ **RED TEAM:** Scoring đổi sang **server grade off-chain → ghi shared `Scoreboard` (OracleCap)** (sponsored tx không ký thay user trên owned `Prediction`/`Profile`). Bỏ "score_prediction do user/keeper gọi". Dùng **reconciliation sweep idempotent** (quét predictions settled & unscored) thay one-shot event; thêm **sponsor balance watchdog**. Chi tiết: plan.md §Per-phase deltas P5 + Phase 2.

## Requirements
- **Functional:** form dự đoán theo trận + theo giải; `submit_prediction` (sponsored/fallback), khoá lúc kickoff; sau `settle_match` → `score_prediction` (server sponsored auto, hoặc user tự); points/streak; trang "thành tích của tôi".
- **Non-functional:** UI theme tabloid (Predictions Desk); optimistic UI + mirror từ event; idempotent (1 prediction/user/match/kind).

## Architecture
- **Predictions Desk (web):** chọn trận (từ `fixtures`) → form theo kind → `buildSubmitPrediction` (Phase 2) → sponsored execute (Phase 1). Champion/advance là form riêng.
- **Hybrid MVP/worst:** sau trận, hiện rating seed + nút vote; vote ghi `match_votes`.
- **Scoring trigger:** server keeper — sau `MatchSettled` (Phase 4) → với mỗi prediction chưa scored của trận đó, gọi `score_prediction` (Oracle/sponsored) → `PredictionScored`.
- **Mirror:** predictions/scoring hiển thị từ Supabase (indexer Phase 6), không đọc thẳng chain ở hot path.

## Related Code Files
- Create: `apps/web/src/components/predictions-desk.tsx`, `apps/web/src/components/prediction-form.tsx`, `apps/web/src/components/my-record.tsx`, `apps/web/src/lib/predictions-api.ts`, `apps/server/src/services/score-keeper.ts`, `apps/server/src/routes/predictions.ts`
- Modify: `apps/web/src/App.tsx` (thêm Predictions Desk + My Record), `packages/contract/src/client.ts` (submit/score builders), `packages/db` (mirror predictions: +tx_digest, chain_status)
- Delete: —

## Implementation Steps
1. `predictions-desk.tsx` + `prediction-form.tsx`: chọn trận, nhập theo kind, submit qua sponsored tx; disable sau kickoff.
2. Champion + advance forms (theo đội/vòng).
3. MVP/worst vote UI sau trận (ghi `match_votes`).
4. `score-keeper.ts`: lắng `MatchSettled` → loop predictions chưa scored → `score_prediction` sponsored.
5. `my-record.tsx`: points, streak, lịch sử đúng/sai (từ Supabase mirror).
6. Verify: user dự đoán 1 trận (on-chain) → settle → được chấm on-chain → điểm phản ánh ở My Record + sẵn cho leaderboard.

## Success Criteria
- [ ] User submit đủ 5 loại dự đoán (on-chain, sponsored), khoá đúng lúc kickoff.
- [ ] Sau settle, prediction được `score_prediction` → points/streak cập nhật on-chain + mirror.
- [ ] MVP/worst vote hoạt động; My Record hiển thị đúng.

## Risk Assessment
- Scoring cần trigger → server keeper sponsored; nếu user tự trigger thì leaderboard thiếu → ưu tiên keeper.
- Lock-at-kickoff dựa Clock on-chain (không tin client).
- Idempotency: contract chặn double-score (`EAlreadyScored`); UI chặn double-submit.
