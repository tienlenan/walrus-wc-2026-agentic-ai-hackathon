---
phase: 7
title: "Verification And Go Live Runbook"
status: pending
priority: P1
effort: "1.5d"
dependencies: [1, 2, 3, 4, 5, 6]
---

# Phase 7: Verification And Go Live Runbook

## Overview

Verify provider integration, admin workflow, public match center, and memory updates
before opening-day operations. Current date is 2026-06-10; first match day is
2026-06-11, so live smoke should be planned for opening day.

## Requirements

- Functional: test all dry-run/apply paths, match center states, chat/briefing
  integration, final score handoff.
- Non-functional: reproducible with recorded provider payloads, provider outage fallback,
  deploy checklist, rollback path.

## Verification Matrix

| Area | Checks |
|---|---|
| Provider adapter | Recorded fixture/live/lineup/injury payload tests |
| DB ledger | Idempotent re-apply, no duplicate events, override audit |
| Admin API | Unauthorized, dry-run, apply, provider error, stale data |
| Public UI | No data, upcoming, live, halftime, fulltime, confirmed lineup |
| Chat/tools | Current facts, missing facts, source timestamp |
| Briefings | Pre-match and post-match source facts |
| Deployment | env vars, Vercel logs, Walrus frontend build |

## Related Code Files

- Create: `apps/server/src/services/live-data/__fixtures__/*.json`
- Create: `apps/server/src/services/live-data/*.test.ts`
- Modify: `apps/server/src/services/briefing-agents.test.ts`
- Create: `apps/web/src/components/match-center.test.tsx` if frontend test stack supports it
- Modify: `docs/mainnet-deploy-runbook.md`
- Create: `docs/wc-live-data-ops-runbook.md`

## Implementation Steps

1. Capture provider sample payloads:
   fixtures list, one live match, one confirmed lineup, one injuries response.
2. Add adapter contract tests from recorded payloads.
3. Add store tests for idempotent sync and duplicate event prevention.
4. Add endpoint smoke script:
   `GET /api/admin/live-data/status`,
   `POST /api/oracle/live-data/sync`,
   `GET /api/matches/:matchId/live`.
5. Run local verification:
   `pnpm --filter @daily-walrus/server test`,
   `pnpm typecheck`,
   `pnpm build`.
6. Add docs runbook with env vars:
   `LIVE_DATA_ENABLED`, `LIVE_DATA_PROVIDER`, `API_FOOTBALL_KEY`,
   `LIVE_DATA_POLL_MS`, `ORACLE_ADMIN_TOKEN`.
7. Opening day smoke on 2026-06-11:
   pre-match fixture sync, lineup sync when provider publishes, live tick during match,
   final score dry-run, operator-applied scoring.
8. Deploy backend, then frontend, then verify public `#matches`, `#tracking`, and API status.

## Success Criteria

- [ ] All tests/typecheck/build pass.
- [ ] Runbook documents dry-run/apply/final-score flow with rollback.
- [ ] Opening-day smoke confirms live status and lineup path before public promotion.
- [ ] Provider failure path returns stale-but-usable cached match center.
- [ ] No scoring occurs automatically without oracle apply.

## Risk Assessment

Live verification cannot be fully proven before a real match is active. Mitigation:
recorded payload tests before 2026-06-11, then opening-day smoke with operator present.

## Unresolved Questions

- Should opening-day ops be manual-only for first 2-3 matches before enabling cron?
- Which provider account/API key will be used for production quota?
