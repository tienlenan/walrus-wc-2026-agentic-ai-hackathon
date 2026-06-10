---
phase: 4
title: Server Cold Start
status: completed
priority: P1
effort: 5h
dependencies:
  - 1
---

# Phase 4: Server Cold Start

## Overview
Defer heavy module work in the single Vercel function so fast JSON reads don't pay for the AI/chat stack. Targets the measured 77s cold outlier and multi-second first responses.

## Key Insights
- `api/index.ts` imports all of `apps/server/src/serve.ts` → entire service graph evaluates on cold start.
- Eager at import/startup today: Mastra registry (`apps/server/src/mastra/index.ts:6-8` — `new Mastra({agents:{gil}})`), AI gateway client (`apps/server/src/mastra/agents/gil.ts:8` — `createGateway()` at module load), event indexer interval loop (`serve.ts:376` — `startEventIndexer()`, 15s loop).
- Already lazy (no change needed): pg pool, Supabase admin client, MemWal clients (lazy singletons, verified by scout).
- Vercel Fluid Compute is default — instance reuse helps, but cold paths and per-instance interval loops remain.
- Research priority: lazy dynamic imports inside route handlers (est. 500–800ms off cold start) before considering function splitting. KISS: do NOT split functions in this plan.

## Requirements
- Functional: all endpoints behave identically; chat streaming unaffected; leaderboard freshness preserved.
- Non-functional: read endpoints' cold response < 3s; no interval timers running in serverless instances.

## Architecture
- `serve.ts` keeps static imports for cheap modules; converts heavy ones to `await import()` inside the route case:
  - `POST /api/gil/chat` + `/api/gil/notebook` → dynamic-import chat/Mastra stack on first use, cache the promise (module-level `let chatModulePromise`).
  - Briefing workflow (`runDailyBriefingWorkflow`) and live-data sync → dynamic import in oracle routes.
- Event indexer: gate `startEventIndexer()` behind `process.env.ENABLE_EVENT_INDEXER === "1"` (on for local/long-lived `pnpm dev`/`start`, off on Vercel). Replace on Vercel with the indexing path already reachable via oracle endpoints + Vercel cron (verify what currently triggers indexing in prod before flipping the default — see Risk).

## Related Code Files
- Modify: `apps/server/src/serve.ts` (dynamic imports per route group; indexer gate)
- Modify: `apps/server/src/mastra/agents/gil.ts` (wrap gateway creation in lazy getter)
- Modify: `apps/server/src/mastra/index.ts` (export factory or lazy singleton instead of import-time `new Mastra`)
- Modify: `vercel.json` (add cron for indexer-equivalent endpoint if needed)
- Create: none

## Implementation Steps
1. Profile import cost (Phase 1 data) — rank modules by ms; only lazify ones > ~50ms (avoid cargo-cult dynamic imports).
2. Convert gil agent/gateway construction to lazy singleton (`let gilPromise; function getGil()`); keep types static (`import type`).
3. Dynamic-import chat + briefing + live-data service modules at their route handlers; memoize module promises.
4. Investigate how event indexing actually runs in production (does the Vercel instance's interval ever fire reliably? check `docs/mainnet-deploy-runbook.md` + Vercel cron config). Then gate the loop: env-flag on for local server, off on Vercel; add Vercel cron hitting an oracle sync endpoint at an equivalent cadence if nothing else covers it.
5. Typecheck + run server test suite (`pnpm --filter @daily-walrus/server test`); manual smoke: chat, snapshot, roasts, briefings locally.
6. Deploy to Vercel preview; measure cold + warm TTFB for the 4 read endpoints (Phase 1 script).

## Success Criteria
- [ ] No import-time construction of Mastra/gateway (verified by grep + import profile).
- [ ] No `setInterval`/indexer loop on Vercel runtime path.
- [ ] Leaderboard/snapshot freshness story documented and preserved (cron or equivalent in place).
- [ ] Cold read TTFB < 3s on preview deploy; warm unchanged or better.

## Risk Assessment
- **Indexer gating is the dangerous bit**: if prod leaderboard freshness silently depends on the in-function interval, disabling it without a cron replacement breaks scoring/leaderboard updates. Mitigation: verify trigger path first (step 4), add cron BEFORE gating, test on preview.
- Dynamic import moves failures from deploy-time to request-time; mitigate with try/catch + 500 with clear error body (existing handler pattern).
- `includeFiles` raw-source packages mean Vercel bundles via nft — confirm dynamic imports are still traced and included (test on preview; nft follows dynamic imports with literal specifiers).
