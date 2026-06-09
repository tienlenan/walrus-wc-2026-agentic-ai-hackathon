# 2026-06-09 Testnet Verification Report

## Scope
- Phase 2 testnet verification for The Daily Walrus.
- Environment: testnet + walrus memory resources from `.env.local`.
- Executor: local pnpm 9.15.9 at `/Users/mpdh/Library/pnpm/pnpm`.

## Commands Run
### Database
- `pnpm --filter @daily-walrus/db test:connection`
- `pnpm --filter @daily-walrus/server indexer:replay`

### Fixtures & scoring scripts
- `pnpm --filter @daily-walrus/server run register:fixtures`
- `pnpm --filter @daily-walrus/server run register:fixtures -- --match=2 --execute`
- `pnpm --filter @daily-walrus/server run score:match -- --match=2 --home=1 --away=0`
- `pnpm --filter @daily-walrus/server run before-after -- verify-user`
- `pnpm --filter @daily-walrus/server run ping -- "Who wins WC 2026?"`

### Sui CLI execute fallback
- `sui client call ... prediction_game::register_match ... --args ... 2 ...`
- `sui client call ... prediction_game::submit_prediction ... --args ... 2 0 1 0 0 0 0 0x6`
- `sui client call ... prediction_game::record_scores ...`
- `sui client call ... prediction_game::settle_match ...`
- `sui client call ... prediction_game::register_match ...` for the remaining 102 fixtures.

### Walrus gallery blobs
- `walrus --context testnet store --epochs 1 --json apps/web/public/gallery/*.svg`

### App build
- `pnpm build:web`
- `pnpm --filter @daily-walrus/web build`
- `PATH=/Users/mpdh/.local/bin:/Users/mpdh/Library/pnpm:$PATH pnpm -r typecheck`
- `PATH=/Users/mpdh/.local/bin:/Users/mpdh/Library/pnpm:$PATH pnpm build`

### Cleanup / runtime tracking
- `pnpm --filter @daily-walrus/db db:clean-app-data`
- `curl http://127.0.0.1:4111/api/tracking/runtime`
- `curl http://127.0.0.1:4111/api/game/snapshot`

## Results
- `test:connection`: ✅ PASS (PostgreSQL + public tables detected).
- `indexer:replay`: ✅ PASS (`resetCursors=3`, `indexed=3`, 104 fixtures / 1 prediction / 1 scoring event / 3 cursors).
- `register:fixtures` (dry run): ✅ PASS (`count=103` fixtures; Brazil/Morocco etc listed in sample).
- `register:fixtures --match=2 --execute`: ❌ FAIL (local signer is wrong owner; expected deployer key).
- Sui CLI register match 2: ✅ PASS (`EwoVCHWDi74dvMzUx8SYV7JBYvw2HkdRJ6comjQ954v1`).
- Sui CLI submit prediction: ✅ PASS (`5gcAboVBXyqf5te9rUuJ3ac9AfFkmHaXNZ9SqZsf18Wi`).
- Sui CLI record score: ✅ PASS (`5JP9TNpV1LfyGhtzw3tnz4S269P29iowu9zzuRiJAVUw`).
- Sui CLI settle match 2: ✅ PASS (`7xhVSDGbR5wocVs8iNMVgB4ZgMSAshZ4uyqX93LtdRDw`).
- `indexer:replay` after execute flow: ✅ PASS (`indexed=8`, 104 fixtures, 3 predictions, 2 scoring events, 4 cursors).
- Sui CLI register remaining fixtures: ✅ PASS (`submitted=102`, `failed=0`).
- `indexer:replay` after full fixture registration: ✅ PASS (`indexed=110`, 104 fixtures, 3 predictions, 2 scoring events, 4 cursors).
- Runtime tracking after memory sync: ✅ PASS (`registered=104`, `notOnchain=0`, `open=103`, `closedFinished=1`).
- Gallery Walrus testnet blobs: ✅ PASS (all aggregator links return HTTP 200).
  - `gil-memory-snitch.svg`: `wYPcd-z5TFCcKBS0iLqEXpHHvok8qlN_vxj5OjoaUzU`
  - `prediction-booth-closed.svg`: `2_GSVBEv8svCU7OqhugOvG6ObzVfbe1wNUk-fvgfSX8`
  - `bad-take-receipt.svg`: `PnG-6aw9qFYHy30Z2c52ncgb8SFaicsNeAhuoeIIA8U`
  - `oracle-roast-room.svg`: `OL4eWqRjomprlIT8NpimO8jORFjSnYySP_WRZ48tt2A`
- `score:match --match=2 --home=1 --away=0`: ✅ PASS (dry-run returns empty entries because no scorable pending scoreline state).
- `before-after verify-user`: ✅ PASS (cold/warm memory flow successful; "User said/ used memories" update path works).
- `ping`: ✅ PASS (Gil returns roast response).
- `build:web`: ✅ PASS after forcing PATH to Node v22.22.2 + pnpm 9.15.9.
- `typecheck`: ✅ PASS across contract/db/shared/walrus/server/web.
- `db:clean-app-data`: ✅ PASS; user/test mirrors are empty (`users=0`, `predictions=0`, `match_votes=0`, `roasts=0`, `sui_output_records=0`, `score_runs=0`, `scoring_events=0`).
- Cleanup now advances indexer cursors to skip historical chain events, so old test predictions do not reappear on server restart.
- `/api/tracking/runtime`: ✅ PASS; explorer links use `https://suiscan.xyz/testnet/object/...`, no `suiexplorer.com`; team memory shows 48 teams / 1,248 players.
- `/api/game/snapshot`: ✅ PASS; 104 fixtures, match 1 open on-chain, other base fixtures preserved.

## Known Blockers
- On-chain execute operations requiring admin oracle/deployer wallet fail unless matching signer key is loaded.
- Mainnet publish and Walrus Sites deploy are blocked until the deploy wallet has SUI gas and WAL on mainnet.
- Final submission must use mainnet object IDs and `wal.app` URL, not these testnet IDs.
- Testnet gas after full fixture registration: `0.38 SUI`.

## Next
- Continue Phase 3 after funding the mainnet deploy wallet, publishing the package, deploying the site, and configuring SuiNS.
