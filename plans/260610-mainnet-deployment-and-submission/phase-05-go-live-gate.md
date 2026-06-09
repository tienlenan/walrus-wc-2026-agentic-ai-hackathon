---
phase: 5
title: "Go-Live Gate"
status: pending
priority: P1
effort: "1d"
dependencies: [1, 2, 3, 4]
---

# Phase 5: Go-Live Gate

## Overview
Final production freeze and deployment approval process with explicit pass/fail conditions.

## Requirements
- No unresolved critical/high issues.
- One final production smoke flow completed end-to-end.
- All submission forms submitted and links shared internally.

## Implementation Steps
1. Freeze code after `phase-04` completion.
2. Run final smoke:
   - memory: before/after output shows clear diff,
   - prediction submit on chain,
   - score settlement path,
   - leaderboard stream refresh,
   - team profile and profile memory sync.
3. Confirm support docs for judges:
   - "how to verify memory on Walrus",
   - "how to verify onchain output",
   - "what to click first" on tracking page.
4. Run production keep-alive checklist for judging window (7+ days).
5. Mark plan status and keep one immutable release note in `plans/reports`.

## Success Criteria
- [ ] Public production URL remains stable for 24h after first deploy.
- [ ] No critical errors in smoke flow across wallet, prediction, score, and memory.
- [ ] All submission artifacts successfully delivered.

## Risk Assessment
- Post-launch regressions from host scale/timeouts (especially indexer + DB idle).
- Sponsor/tx pool instability on mainnet wallet flows.
- Unclear verification trail for judges if object IDs are not copied into forms.

