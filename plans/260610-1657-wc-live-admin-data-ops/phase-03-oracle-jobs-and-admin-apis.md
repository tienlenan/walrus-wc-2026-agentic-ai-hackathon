---
phase: 3
title: "Oracle Jobs And Admin APIs"
status: pending
priority: P1
effort: "1.5d"
dependencies: [1, 2]
---

# Phase 3: Oracle Jobs And Admin APIs

## Overview

Build protected backend jobs and HTTP endpoints for operator-controlled sync.
Every write path supports dry-run first, then apply with oracle token.

## Requirements

- Functional: sync fixtures, live state, events, lineups, availability; run manual
  final-score handoff into existing `/api/oracle/score`; expose status.
- Non-functional: protected by `ORACLE_ADMIN_TOKEN`, idempotent, rate-limit aware,
  observable, safe on provider outage.

## Architecture

Protected endpoints:

| Endpoint | Purpose |
|---|---|
| `GET /api/admin/live-data/status` | Provider capability, latest runs, active matches |
| `POST /api/oracle/live-data/sync` | Dry-run/apply provider sync by job type |
| `POST /api/oracle/live-data/override` | Manual availability/lineup/live-state override with reason |
| `GET /api/matches/live` | Public list of live/upcoming matches with current state |
| `GET /api/matches/:matchId/live` | Public match center payload |

Job types:
- `fixtures_full`: schedule/team/provider ID map.
- `pre_match`: injuries/suspensions and expected lineup if provider supports it.
- `lineups`: confirmed lineup near kickoff.
- `live_tick`: score/status/events/statistics during match.
- `finalize_result`: prepare final score for existing score oracle; no auto-score without apply.

## Related Code Files

- Modify: `apps/server/src/serve.ts`
- Create: `apps/server/src/services/live-data/live-data-sync.ts`
- Create: `apps/server/src/services/live-data/live-data-admin.ts`
- Create: `apps/server/src/services/live-data/live-match-service.ts`
- Create: `apps/server/src/dev/sync-live-data.ts`
- Modify: `scripts/keep-alive.ts` if adding scheduled health checks
- Modify: `apps/server/src/services/score-keeper.ts` only for handoff helpers, not scoring rules

## Implementation Steps

1. Implement `syncLiveData({ jobType, matchId?, teamCode?, mode })`.
2. Add dry-run response with counts, changed fields, warnings, and provider request metadata.
3. Add apply path:
   fetch provider -> normalize -> hash -> upsert -> record run -> optionally memory sync.
4. Add safety gates:
   no final score apply while provider says match is in progress unless override reason exists.
5. Add `live_tick` polling config:
   `LIVE_DATA_ENABLED`, `LIVE_DATA_PROVIDER`, `LIVE_DATA_POLL_MS`, `LIVE_DATA_ACTIVE_WINDOW_HOURS`.
6. Add CLI dev command for local operator:
   `pnpm --filter @daily-walrus/server live-data:sync --job=lineups --match=1 --apply`.
7. Wire public match endpoints from DB only.
8. Keep existing `/api/oracle/score` as the only path that writes prediction scoring/on-chain result.

## Success Criteria

- [ ] Operator can run `fixtures_full` dry-run and see no DB mutation.
- [ ] Operator can apply one match live sync and see `provider_sync_runs` recorded.
- [ ] Public match endpoint returns current DB state without provider key.
- [ ] Provider failure returns last-known state plus visible stale marker.
- [ ] Final score requires explicit oracle apply before scoring predictions.

## Risk Assessment

Live polling can exceed provider quota. Mitigation: active-match window, latest-run
dedupe, backoff on 429, and manual sync fallback.
