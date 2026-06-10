---
phase: 5
title: "Automation & Admin Controls"
status: completed
priority: P2
effort: "6h"
dependencies: [1, 2, 3]
---

# Phase 5: Automation & Admin Controls

## Overview

Make the briefing workflow repeatable: cron for daily publish, admin endpoint for
manual demo runs, and post-score hooks so finished matches can update memory and
briefings.

## Requirements

- Functional: protected admin endpoint runs a briefing workflow on demand.
- Functional: daily cron can run without browser wallet interaction.
- Functional: after match scoring, optional post-match briefing can be triggered.
- Functional: idempotency prevents duplicate daily rows for the same date/type.
- Non-functional: no public unauthenticated write endpoint.
- Non-functional: failures are visible in `agent_runs` and tracking.

## Architecture

Endpoints:

- `POST /api/oracle/briefings/run`
  - auth: existing `ORACLE_ADMIN_TOKEN`
  - body: `{ date?, type?, focus?, force? }`
  - returns: briefing + agent run ID + proof status
- `GET /api/oracle/briefings/runs`
  - optional admin/debug only

Automation options:

- Vercel Cron hitting `/api/oracle/briefings/run` with token.
- GitHub Action fallback for static/serverless environments.
- Local script: `pnpm --filter @daily-walrus/server run briefings:daily -- --date=YYYY-MM-DD`.

Post-score hook:

- In `scoreMatch`, after `syncGlobalWorldCupMemory`, enqueue or directly call
  post-match briefing when `BRIEFING_POST_SCORE_ENABLED=true`.

## Related Code Files

- Modify: `apps/server/src/serve.ts`
- Modify: `apps/server/src/services/score-keeper.ts`
- Create: `apps/server/src/dev/run-daily-briefing.ts`
- Modify: `apps/server/package.json`
- Create/modify: `vercel.json` if the backend project owns cron config.
- Modify: `docs/deployment-guide.md` or `docs/mainnet-deploy-runbook.md`

## Implementation Steps

1. Add protected admin endpoint with strict token check.
2. Add local CLI script for manual runs and verification.
3. Add idempotency:
   - default `force=false` returns current published briefing,
   - `force=true` creates a new agent run and updates the row.
4. Add cron config:
   - daily run at a quiet UTC time,
   - include env var documentation for token/header.
5. Add post-score hook:
   - only run for settled/finished match,
   - do not block scoring transaction path; catch and log errors.
6. Add operational docs:
   - how to run manually,
   - how to verify blob/memory/Sui receipt,
   - how to disable automation.

## Success Criteria

- [x] Manual CLI run works locally.
- [x] Re-running without `force` reuses the current row by date/type.
- [x] Cron/admin path is documented and environment-variable driven.
- [x] Score flow triggers post-match publishing best-effort when enabled and catches failures.
- [x] Agent runs are persisted for successful and failed workflow inspection.

## Risk Assessment

Do not let LLM/news calls slow match scoring. Post-score publishing should be
async best-effort or a separate admin/cron run.
