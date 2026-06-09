---
phase: 2
title: Testnet Verification
status: in-progress
priority: P1
effort: 2d
dependencies:
  - 1
---

# Phase 2: Testnet Verification

## Overview
Run a controlled regression sweep on testnet before any mainnet migration.

## Requirements
- End-to-end test of memory + prediction + scoring + leaderboards + tracker.
- Verify all critical APIs return expected values from live testnet object IDs.
- Produce a reproducible verification log for audit and judges.

## Test Matrix

### A. Contract readiness
1. Confirm Move package is publishable on testnet.
2. Confirm `register_match` dry-run list includes expected fixtures.
3. Execute one real `register_match` and one `submit_prediction` tx on testnet.
4. Run scoring dry-run, then execute once.

### B. Server/runtime readiness
1. `pnpm --filter @daily-walrus/db test:connection`
2. `pnpm --filter @daily-walrus/server indexer:replay`
3. `pnpm --filter @daily-walrus/server register-fixtures` (dry-run output must list fixtures)
4. `pnpm --filter @daily-walrus/server register-fixtures -- --execute` for a test subset when admin key exists
5. `pnpm --filter @daily-walrus/server score:match -- --match=<id> --home=1 --away=0 --settle --execute` for one match after fixture result available

### C. App readiness
1. `pnpm dev:web` + `pnpm dev:server` healthy.
2. Manual smoke on:
   - `#predictions`: submit prediction and see chain status transition.
   - `#leaderboard`: SSE row updates after score execution.
   - `#team-profiles`: team profiles and squad details render.
   - `#tracking`: contract IDs, memory sync, and open-links are working.
3. Verify before/after memory by running:
   - `pnpm --filter @daily-walrus/server before-after verify-testnet`

### D. Memory/walrus verification
1. Validate schedule memory status in `/api/tracking/runtime`.
2. Validate `team/player` profiles show in memory sync status if blob output is enabled.
3. Confirm all `OutputRecord` paths return tx digest and object IDs for chat/roast/prediction actions.

## Related Files
- `apps/server/src/services/score-keeper.ts`
- `apps/server/src/dev/register-fixtures.ts`
- `apps/server/src/dev/score-match.ts`
- `apps/server/src/dev/rebuild-indexer.ts`
- `apps/server/src/dev/before-after.ts`
- `scripts/deploy-walrus-site.sh`

## Implementation Steps
1. Prepare `.env.local` with testnet IDs and signer keys.
2. Run matrix sections A → D in order and export logs.
3. Save outputs into `plans/reports/` as a dated testnet verification report.
4. If any failure occurs, fix + rerun only affected section.
5. Promote section outcomes to `phase-03` gates only after all A-D pass.

## Success Criteria
- [ ] At least one full prediction + settlement flow passes on testnet.
- [ ] Indexer replay succeeds, leaderboard updates in under 20 seconds.
- [ ] `/api/tracking/runtime` is green for contract and memory.
- [ ] A verification report exists in `plans/reports/`.

## Risk Assessment
- API rate limits (football data, Walrus sidecar) can cause flaky matches.
- Gas failures on sponsored path can block execute calls; keep user-pays fallback.
- Prediction settlement test may require live fixture with finished score in DB.

