---
phase: 2
title: "Move Contract"
status: pending
priority: P1
effort: "2d"
dependencies: []
---

# Phase 2: Move Contract (wc_predict)

## Overview
Viết + deploy Sui Move contract cho dự đoán World Cup 2026: predictions (kết quả/MVP/cầu thủ tệ/vô địch/đội đi tiếp), settle kết quả (oracle), scoring on-chain, emit events cho indexer. **Predictions = owned objects + events** (tránh contention). **Scoring/leaderboard = shared `Scoreboard` ghi bởi OracleCap** (tần suất thấp sau settle → contention chấp nhận).

> ⚠️ **Testnet-first (user):** scaffold/test/publish contract trên **Sui Testnet** trước (gas free faucet → dev gasless, không cần gas-station). **Migrate Mainnet ở Phase 8** khi nộp. Mọi step `--env mainnet` dưới đây → đổi `testnet` trong giai đoạn dev.

## Requirements
- **Functional:** `create_profile`, `submit_prediction` (khoá lúc kickoff bằng Clock), `register_match`/`settle_match` (OracleCap), `score_prediction` (pull, chỉ sửa object của user), events đầy đủ.
- **Non-functional:** AdminCap (cold) tách OracleCap (hot, rotatable); grade() thuần để unit test; published mainnet, giữ UpgradeCap.

## Architecture
- **Objects:** owned `Prediction`(per user/match/kind) + owned `Profile`(points/streak); shared `MatchRegistry`(Table<u64,Match>) — chỉ ghi khi register/settle, đọc-only khi submit.
- **Kinds:** scoreline(0), match_mvp(1), worst_player(2), champion(3), advance(4). Payload đóng gói `a,b,c,d,e:u32`.
- **Scoring (server-driven — RED TEAM fix):** sponsored tx KHÔNG ký thay user trên owned object → KHÔNG dùng `score_prediction` do user/keeper gọi. Thay vào: **shared `Scoreboard` object** (Table<address,Score>) ghi bởi **OracleCap**: server grade off-chain (từ predictions đã index) → `record_scores(OracleCap, scoreboard, [addr,points])` on-chain, emit `Scored`. `Prediction` vẫn **owned** (user submit + `PredictionSubmitted` event).
- **Leaderboard:** đọc shared `Scoreboard` (on-chain) + indexer mirror `Scored` → Supabase (Phase 6).
- Sketch module đầy đủ có trong research report (structs + entry fns + events); points: exact=5, winner=3, mvp=4, worst=2, advance=3, champion=25, streak +1.

## Related Code Files
- Create: `move/wc_predict/Move.toml`, `move/wc_predict/sources/prediction_game.move`, `move/wc_predict/sources/leaderboard_snapshot.move` (optional), `move/wc_predict/tests/prediction_game_tests.move`, `packages/contract/src/client.ts` (PTB wrappers), `packages/contract/src/ids.ts`
- Modify: `.env.example` / `.env.local` (+WC_PACKAGE_ID, WC_REGISTRY_ID, WC_ADMIN_CAP_ID, WC_ORACLE_CAP_ID), `pnpm-workspace.yaml` (nếu thêm packages/contract)
- Delete: —

## Implementation Steps
1. Scaffold `move/wc_predict` (Move.toml edition 2024, Sui dep rev `framework/mainnet`). Cài sui CLI qua suiup, `sui client switch --env mainnet`.
2. Viết `prediction_game.move`: structs (AdminCap, OracleCap, MatchRegistry, Match, MatchResult, Profile, Prediction), events, `init`, entry fns, `grade()` thuần.
3. `sui move build` + `sui move test` (unit test grade từng kind + lock-at-kickoff + double-settle guard).
4. `sui client publish --gas-budget 200000000` → capture packageId, AdminCap, OracleCap, MatchRegistry → `.env.local`. Set `published-at` để upgrade về sau; cất UpgradeCap như AdminCap (cold).
5. `grant_oracle` cho ví oracle hot (server settle).
6. `packages/contract/src/client.ts`: PTB wrappers (`buildSubmitPrediction`, `buildScorePrediction`, `buildSettleMatch`, `buildCreateProfile`) dùng `@mysten/sui` v2.17 `Transaction` + `tx.object(REGISTRY)` + Clock `0x6`. Trả tx kind-only để sponsor (Phase 1).

## Success Criteria
- [ ] `sui move build` + `sui move test` pass (cover các kind + lock + settle).
- [ ] Published **Sui Mainnet**; ids ghi vào `.env.local`.
- [ ] Chạy thử end-to-end: create_profile → submit_prediction → settle_match → score_prediction → `PredictionScored` emit (kiểm bằng queryEvents).

## Risk Assessment
- **Oracle key compromise** → chỉ sửa được kết quả (không có tiền trong contract); OracleCap rotatable, AdminCap/UpgradeCap cold.
- **Shared-registry contention** ở quy mô lớn → submit đọc-only; nếu cần shard theo vòng. Start 1 registry (KISS).
- **Champion/advance grade đơn giản hoá** (theo winner_team) → đủ cho MVP; bracket đầy đủ là stretch.
- Pin framework rev + sui CLI version (suiup) để tránh drift.
