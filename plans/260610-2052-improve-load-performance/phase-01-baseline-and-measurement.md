---
phase: 1
title: Baseline and Measurement
status: completed
priority: P1
effort: 3h
dependencies: []
---

# Phase 1: Baseline and Measurement

## Overview
Lock in reproducible before-numbers for web and API so phases 2–5 can prove wins. Partial baseline already captured 2026-06-10; this phase scripts it so anyone can re-run.

## Already measured (2026-06-10, keep as reference)
- Live entry JS: `https://roast2026wc.wal.app/assets/index-*.js` → 657,090 B, `content-encoding: identity`, 10.3s total (cf-cache HIT).
- `index.html`: 35.7 kB, identity encoding, TTFB 107ms.
- Local build: entry 658.69 kB (211 kB gzip), `mermaid-*.js` 483 kB (148 kB gzip), section chunks all < 19 kB.
- API warm TTFB: world-cup/snapshot 0.66s (427 kB), game/snapshot 1.34s, briefings/latest 0.91s, roasts 0.71s. One 77s cold outlier on world-cup/snapshot. All reads: `cache-control: public, max-age=0, must-revalidate`.

## Requirements
- Functional: one script reproduces all measurements; results land in a dated report.
- Non-functional: no production impact; read-only probes.

## Related Code Files
- Create: `scripts/measure-load-performance.sh` (curl timing matrix: index.html, entry JS, mermaid chunk, 4 API reads × 3 runs; prints encoding + size + TTFB)
- Modify: none

## Implementation Steps
1. Write `scripts/measure-load-performance.sh`: probes live site assets (parse asset names from live index.html) and API endpoints; emits markdown table.
2. Run `npx vite-bundle-visualizer` (or `rollup-plugin-visualizer`) on `apps/web` build; record top-10 modules in entry chunk — confirm `@mysten/dapp-kit`/`@mysten/sui` share.
3. Run Lighthouse (Chrome headless or PageSpeed Insights) against `https://roast2026wc.wal.app/` — record FCP, LCP, TTI, TBT, perf score.
4. Measure server import cost locally: `node --import tsx --cpu-prof src/serve.ts` or wrap entry with `console.time` around imports; record ms attributable to `@mastra/core`, `@mysten/sui`, `@mysten/walrus`, `@ai-sdk/gateway`.
5. Confirm Walrus portal compression behavior: re-check `content-encoding` with explicit `Accept-Encoding: br, gzip` (already observed `identity`) and check whether `ws-resources.json` `headers` field is honored on the live portal (docs.wal.app → "specify headers"). Document the answer — Phase 2's compression approach depends on it.
6. Save results to `plans/reports/baseline-260610-load-performance-report.md`.

## Success Criteria
- [ ] Measurement script committed and re-runnable.
- [ ] Bundle composition of entry chunk documented (module → kB table).
- [ ] Lighthouse baseline recorded for live site.
- [ ] Server import-cost profile recorded (per-module ms).
- [ ] Portal header/compression capability confirmed yes/no with evidence.

## Risk Assessment
- 77s outlier may not reproduce — capture at least one forced cold start (probe after >15 min idle) but don't block the phase on it.
- PageSpeed Insights may fail on wal.app portal; fall back to local Chrome Lighthouse.
