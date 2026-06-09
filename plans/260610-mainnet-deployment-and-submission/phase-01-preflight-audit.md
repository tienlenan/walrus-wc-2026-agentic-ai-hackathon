---
phase: 1
title: Preflight Audit
status: completed
priority: P1
effort: 1d
dependencies: []
---

# Phase 1: Preflight Audit

## Overview
Validate that release code and infrastructure are production-safe before touching
testnet mainline again.

## Requirements
- Confirm secrets policy, wallet/key handling, and CORS/auth invariants.
- Confirm `Walrus Memory`, `team schedule`, and `prediction scoring` paths are still tied
  to the active user identity flow.
- Confirm critical docs are in English for judges (design + architecture + submission brief).

## Architecture
- This phase has no runtime code change; it is gate logic + runbook.
- Sources for verification:
  - `apps/server/src/services/auth.ts`
  - `apps/web/src/lib/auth.ts`
  - `apps/server/src/routes`
  - `apps/server/src/services/*memory*`
  - `apps/server/src/services/score-keeper.ts`
  - `docs/*`, especially `docs/03-architecture.md`, `docs/07-runtime-tracking-design.md`

## Related Code Files
- Modify: `docs/07-runtime-tracking-design.md`
- Modify: `plans/260610-mainnet-deployment-and-submission/`
- Optional: create a one-time script `scripts/check-english-comments.mjs` if we keep accepting mixed-language notes.

## Implementation Steps
1. Environment hardening
  - Ensure `AI_GATEWAY_API_KEY`, `DATABASE_URL`, `MEMWAL_DELEGATE_KEY`,
    `MEMWAL_ACCOUNT_ID`, `SESSION_WALLET_KEY`, sponsor keys are not committed.
  - Validate `gitleaks` equivalent: no known secrets in tracked files.
2. Security invariants
  - CORS list no longer uses `*`.
  - `Oracle` endpoints are still guarded by `ORACLE_ADMIN_TOKEN`.
  - `auth/session` path still writes `resourceId = verified Sui address`.
3. Functional invariants
  - `/api/world-cup/snapshot` returns scheduled fixtures + chain state.
  - `/api/tracking/runtime` exposes object IDs + memory pointers.
  - `/api/outputs/register` and prediction submit paths remain wallet-signed.
4. Docs/docs checks
  - Ensure submission docs are English and concise.
  - Confirm submission info references DeepSurge page and Airtable form.
5. Acceptance dry runs (local)
  - `pnpm --filter @daily-walrus/server ping`
  - `pnpm --filter @daily-walrus/server before-after`
  - `pnpm --filter @daily-walrus/server indexer:replay` (empty/replay allowed)

## Success Criteria
- [ ] No leaked secret values in committed files.
- [ ] CORS/auth and wallet-gating paths are verifiable from code review.
- [ ] Runtime tracking endpoint shows contract IDs and memory sync status.
- [ ] Plan + submission docs are ready for judges to read in English.

## Risk Assessment
- Missing environment values on dev machine can cause false negatives in smoke tests.
- Existing Vietnamese comments/strings may still exist in source; keep this as non-gate for this phase unless reviewer requests full internationalization.

