---
title: Improve Web and API Load Performance
description: >-
  Cut first-load time on roast2026wc.wal.app (uncompressed 657 kB entry JS, ~10s
  asset fetch) and API cold-start/read latency on the Vercel function.
status: pending
priority: P1
effort: 3d
branch: main
tags:
  - performance
  - frontend
  - backend
  - walrus-sites
  - vercel
blockedBy: []
blocks: []
created: '2026-06-10T13:56:15.250Z'
createdBy: 'ck:plan'
source: skill
---

# Improve Web and API Load Performance

## Overview

Live measurements (2026-06-10, from Saigon, cold cache):

| Surface | Measured | Problem |
|---|---|---|
| `roast2026wc.wal.app` entry JS | **10.3s fetch, 657 kB, `content-encoding: identity`** | Portal serves uncompressed; wallet SDK in entry chunk |
| Local build | entry 659 kB (211 kB gzip), mermaid chunk 483 kB | No `manualChunks`; dapp-kit eager via `wallet-providers.tsx` |
| `gil-var-shamebook-api.vercel.app` reads | 0.6–1.3s warm; **77s cold outlier** | Eager Mastra/gateway init + event-indexer loop at import; zero `Cache-Control` |

Constraints (user decisions — do not reverse):
- **Boot splash keeps 1.8s minimum** (`BOOT_SPLASH_MIN_MS`, App.tsx:65). Goal: app fully interactive when splash lifts.
- Scope: web first load + API latency. Out of scope: React Query adoption, SSE delta encoding, payload redesign of world-cup snapshot.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Baseline and Measurement](./phase-01-baseline-and-measurement.md) | Completed |
| 2 | [Web Bundle Diet](./phase-02-web-bundle-diet.md) | Completed |
| 3 | [Fonts and Boot Assets](./phase-03-fonts-and-boot-assets.md) | Completed |
| 4 | [Server Cold Start](./phase-04-server-cold-start.md) | Completed |
| 5 | [API Read Caching](./phase-05-api-read-caching.md) | Completed |
| 6 | [Verify and Document](./phase-06-verify-and-document.md) | Pending |

## Targets

- Entry-path JS wire cost: 657 kB → **< 150 kB** (split wallet vendor + pre-compressed serving).
- Time to interactive on live site (cold cache, fast 4G lab): **≤ 1.8s splash window** for home shell.
- API read endpoints TTFB warm: < 800ms p50 with CDN cache hits ≥ 50%.
- Cold start: no multi-second (let alone 77s) first responses on read endpoints.

## Research

- [Web first-load report](../reports/researcher-260610-2046-web-first-load-perf-report.md)
- [Vercel cold-start report](../reports/researcher-260610-2046-vercel-cold-start-api-latency-report.md)

## Dependencies

- Phases 2–3 independent of 4–5. Phase 6 depends on all.
- No cross-plan blockers: `260610-1657-wc-live-admin-data-ops` (pending) touches `serve.ts` routes too — coordinate merge order if both run concurrently, but no hard dependency.
