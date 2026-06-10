---
phase: 6
title: "Verify and Document"
status: pending
priority: P2
effort: "3h"
dependencies: [2, 3, 4, 5]
---

# Phase 6: Verify and Document

## Overview
Re-measure everything against the Phase 1 baseline on the LIVE deployments (`roast2026wc.wal.app` + `gil-var-shamebook-api.vercel.app`), publish before/after, and update project docs.

## Requirements
- Functional: all product surfaces smoke-tested post-deploy (chat, predictions sign, gift reveal, leaderboard, briefings, match center, VI+EN).
- Non-functional: plan targets met or misses explained.

## Implementation Steps
1. Deploy web to Walrus Sites (`scripts/deploy-walrus-site.sh`) and server to Vercel production.
2. Re-run `scripts/measure-load-performance.sh` + Lighthouse on live site; capture cold + warm runs.
3. Compare against `plans/reports/baseline-260610-load-performance-report.md`; write `plans/reports/after-load-performance-improvement-report.md` with the before/after table.
4. Check plan targets: entry-path wire < 150 kB, home interactive within splash, read TTFB p50 < 800ms warm, CDN hit ratio, no cold outliers > 3s on reads (sample after 15+ min idle).
5. Full manual smoke pass (both languages, wallet flow on mainnet with a throwaway-safe action).
6. Update docs: `docs/03-architecture.md` (caching + lazy-init notes), `docs/mainnet-deploy-runbook.md` (compressed-asset deploy step, cron, env flag `ENABLE_EVENT_INDEXER`).
7. Mark phases complete via `ck plan check`.

## Success Criteria
- [ ] Before/after report published with live-site numbers.
- [ ] All plan.md targets evaluated explicitly (met / missed + why).
- [ ] Docs updated; deploy runbook reflects new build/deploy steps.
- [ ] No functional regressions in smoke pass.

## Risk Assessment
- Walrus Sites deploy propagation/caching may delay seeing new assets — verify `x-resource-sui-object-version` changed before measuring.
- If compression path (Phase 2 step 5) was skipped due to portal limitation, targets must be re-stated against split-chunks-only reality — document honestly.
