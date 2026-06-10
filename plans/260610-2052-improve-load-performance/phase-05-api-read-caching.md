---
phase: 5
title: API Read Caching
status: completed
priority: P2
effort: 4h
dependencies:
  - 4
---

# Phase 5: API Read Caching

## Overview
Add CDN/browser caching to public read endpoints so most requests never reach the function. Today every GET returns `max-age=0, must-revalidate` and `world-cup/snapshot` re-ships 427 kB each hit.

## Key Insights
- Vercel CDN honors `Cache-Control: s-maxage=N, stale-while-revalidate=M` on function responses — cached at edge per region, function invoked only on miss/revalidate.
- Cacheable (public, identical for all users): `/api/world-cup/snapshot` (427 kB, changes on admin sync), `/api/world-cup/player-roast-traits` (static), `/api/briefings*` (changes ~daily), `/api/roasts` (changes on user posts), `/api/matches/live*` (changes per live tick), `/api/tracking/runtime`.
- NOT cacheable: `/api/game/snapshot` (auth-dependent `myRecord` — `Vary` on Authorization is unreliable at CDN; keep uncached or cache only anonymous variant), `/api/game/stream` (SSE), all POSTs.
- SSE interval (`GAME_STREAM_INTERVAL_MS` serve.ts:108, 5s default) recomputes full snapshot per tick per client — cheap win: short in-memory memo of snapshot inside the interval, shared across SSE clients on the same instance.

## Requirements
- Functional: users see fresh data within agreed TTLs (below); votes/roasts a user just posted must appear on their next read (bypass or short TTL on affected endpoint).
- Non-functional: ≥50% CDN hit ratio on cacheable reads; no stale leaderboard after oracle scoring beyond TTL.

## TTL table (initial, tune in Phase 6)
| Endpoint | s-maxage | swr |
|---|---|---|
| world-cup/snapshot | 300 | 600 |
| player-roast-traits | 3600 | 86400 |
| briefings, briefings/latest, briefings/:id | 300 | 3600 |
| roasts | 30 | 120 |
| matches/live, matches/:id/live | 15 | 60 |
| tracking/runtime | 300 | 600 |

## Related Code Files
- Modify: `apps/server/src/serve.ts` (helper `setReadCache(res, sMaxage, swr)`; apply per route; ensure `Vary: Origin` already set doesn't fragment cache more than needed)
- Modify: none elsewhere (web clients need no change; browser cache benefits automatically)

## Implementation Steps
1. Add `setReadCache` helper; apply TTL table to public GET routes. Skip `/api/game/snapshot` (auth-variant payload) — document why.
2. Roasts freshness: after `POST /api/roast`, the poster refetches `GET /api/roasts` — with s-maxage=30 their own roast may lag up to 30s at edge. Decide: accept (30s, playful app) or add `?fresh=1` cache-buster on post-success refetch in `roast-wall.tsx`. Default: accept 30s; note in docs.
3. In-memory snapshot memo for SSE loop: cache `getGameSnapshot()` result for the stream interval duration, shared across concurrent SSE connections (module-level `{at, data}` with TTL = interval).
4. Verify CORS + caching interplay: responses `Vary: Origin` — confirm Vercel edge keys cache per-origin (acceptable: only 2-3 origins) and OPTIONS preflights aren't cached wrongly.
5. Deploy preview; verify `x-vercel-cache: HIT` on second hit of each cacheable endpoint; verify TTL expiry behavior.

## Success Criteria
- [ ] All TTL-table endpoints return configured `Cache-Control` and show `x-vercel-cache: HIT` on repeat hits.
- [ ] `/api/game/snapshot` remains uncached with rationale comment.
- [ ] Oracle scoring → leaderboard visible within ≤ TTL (test: score on testnet/preview, time the propagation).
- [ ] SSE memo: N concurrent stream clients → 1 snapshot computation per tick (log-verified locally).

## Risk Assessment
- Stale-after-write UX (own roast/vote not visible): bounded by short TTLs; revisit if users notice.
- CDN caching of error responses: only set cache headers on 200s.
- `Vary: Origin` fragmentation lowers hit ratio slightly — measure, don't pre-optimize.
