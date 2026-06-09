---
phase: 1
title: Existing Flow Audit
status: completed
priority: P2
effort: 1h
dependencies: []
---

# Phase 1: Existing Flow Audit

## Overview

Confirm the current scored-prediction data path and identify the smallest UI insertion point.
No feature code yet.

## Requirements

- Functional: identify the exact fields that tell whether a prediction is scored and correct.
- Non-functional: avoid any assumption that requires seeded demo data or settled matches.

## Architecture

Data path to verify:

`Sui events / DB mirror -> apps/server/src/services/game-snapshot.ts -> /api/game/snapshot -> apps/web/src/lib/game-api.ts -> Leaderboard`

Expected source fields:

- `MyPrediction.oracleStatus`
- `MyPrediction.oracleCorrect`
- `MyPrediction.oraclePoints`
- `MyPrediction.result`
- `MyPrediction.matchId`
- `MyPrediction.payload`

## Related Code Files

- Read: `/Users/mpdh/Desktop/R-AI-Services/R-AI-Products/walrus-memory-world-cup/apps/server/src/services/game-snapshot.ts`
- Read: `/Users/mpdh/Desktop/R-AI-Services/R-AI-Products/walrus-memory-world-cup/apps/web/src/lib/game-api.ts`
- Read: `/Users/mpdh/Desktop/R-AI-Services/R-AI-Products/walrus-memory-world-cup/apps/web/src/components/leaderboard.tsx`
- Read: `/Users/mpdh/Desktop/R-AI-Services/R-AI-Products/walrus-memory-world-cup/apps/web/src/lib/i18n.tsx`

## Implementation Steps

1. Verify which `oracleStatus` value means scored. Prefer explicit `oracleCorrect !== null`
   plus `oracleStatus === "recorded"` if current data confirms it.
2. Check whether pending predictions appear in `myRecord.predictions`; define filtering rule.
3. Check current leaderboard spacing and mobile layout before adding a new panel.
4. Confirm i18n keys for leaderboard/roast tone and naming.
5. Document final field rule in Phase 2 before implementation.

## Success Criteria

- [ ] Exact reveal eligibility rule is written down.
- [ ] No backend or contract change is required for MVP.
- [ ] UI insertion point is selected with low layout risk.
- [ ] Any stale-plan overlap is noted but not used as a blocker.

## Risk Assessment

- Risk: no scored predictions on mainnet, so feature appears empty during demo.
  Mitigation: add a clean empty state and consider a local mock story/test fixture only for verification.
- Risk: result strings drift between DB and chain.
  Mitigation: use `oracleCorrect` as the primary truth, not display labels.
