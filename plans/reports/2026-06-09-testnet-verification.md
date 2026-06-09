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
- Mainnet deploy is not attempted until testnet execute signer and mainnet funding/domain inputs are confirmed.

## Next
- Continue Phase 3 only after signer setup is resolved and a final testnet execute path passes.
