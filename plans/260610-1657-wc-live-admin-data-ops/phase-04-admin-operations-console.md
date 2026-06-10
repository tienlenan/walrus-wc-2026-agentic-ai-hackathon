---
phase: 4
title: "Admin Operations Console"
status: pending
priority: P1
effort: "1d"
dependencies: [2, 3]
---

# Phase 4: Admin Operations Console

## Overview

Add a hidden internal admin route for World Cup operations: provider health,
sync controls, overrides, and final-score handoff. Keep it utilitarian.

## Requirements

- Functional: token entry, latest sync runs, active match cards, dry-run/apply
  controls, manual override with required reason, final score review.
- Non-functional: no admin token in bundle, no public nav highlight, mobile usable,
  all destructive/apply actions require confirmation.

## Architecture

Frontend route: `#admin` or `#ops` behind local token prompt.

Token handling:
- Admin enters token manually.
- Store only in `sessionStorage`, never localStorage by default.
- Send as `x-oracle-token` header.
- No token-dependent UI rendered until `/api/admin/live-data/status` succeeds.

Panels:
- Provider status: current provider, capability flags, quota/rate-limit warning.
- Sync runs: latest success/failure, duration, fetched/applied counts.
- Match operations: upcoming/live/finished buckets.
- Lineup/availability editor: override rows with required source/reason.
- Final result gate: compare provider final score to DB and call existing score endpoint.

## Related Code Files

- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/lib/i18n.tsx`
- Create: `apps/web/src/lib/admin-api.ts`
- Create: `apps/web/src/components/admin-ops-console.tsx`
- Create: `apps/web/src/components/admin-ops-console.css`
- Modify: `apps/server/src/serve.ts`

## Implementation Steps

1. Add `admin-api.ts` wrappers for status/sync/override.
2. Add `AdminOpsConsole` with compact operational layout:
   status band, run table, match control table, override modal.
3. Add dry-run/apply interaction:
   dry-run first, show diff, then enable apply.
4. Add final-score flow:
   provider final -> operator review -> call `/api/oracle/score` with `execute=true`.
5. Add error states:
   unauthorized, provider key missing, provider quota, stale data, no live matches.
6. Add `#admin` route without adding prominent public nav item.
7. Add responsive constraints so tables scroll without breaking layout.

## Success Criteria

- [ ] Admin cannot apply sync before a successful dry-run in current session.
- [ ] Every override requires source/reason and creates audit row.
- [ ] Failed provider call displays provider/status/error without exposing secret.
- [ ] Public users cannot discover/use token-only actions without token.
- [ ] Admin can settle one match from reviewed provider final score.

## Risk Assessment

Static frontend cannot make a browser-entered admin token perfectly secret.
This is acceptable for owner-operated ops, but wallet-admin allowlist should be
considered if multiple operators need access.
