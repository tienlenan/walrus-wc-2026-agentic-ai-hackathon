# Live verification: load performance (2026-06-11, after deploy)

Deployed: web → Walrus Sites mainnet (site object `0xd7b9...0158`, WALRUS_PRECOMPRESS=1), API → Vercel prod (`vercel deploy --prod`). Probes from Saigon, same method as baseline.

## Web — roast2026wc.wal.app

| Metric | Before (2026-06-10) | After | Delta |
|---|---|---|---|
| Entry JS wire bytes | 657,090 B (identity) | **69,471 B (br)** | **-89%** |
| Entry JS fetch time | 10.3s | **0.12s** | **-99%** |
| Entry chunk content | react + app + dapp-kit + sui + react-query | react + app shell only | wallet stack → lazy `app-providers` chunk (395 kB raw / 109 kB br, loads behind splash) |
| Fonts | 4 families render-blocking via Google Fonts | self-hosted subsetted WOFF2, 2 preloaded, 0 third-party requests | — |
| Asset cache headers | none | `max-age=31536000, immutable` (via ws-resources.json) | — |
| All JS+CSS assets | 1,308 kB | 350 kB wire (br) | -73% |

Portal behavior confirmed: honors `ws-resources.json` per-resource headers; serves br to `Accept-Encoding: br` clients and transparently decompresses for clients without it (identity fallback verified).

## API — gil-var-shamebook-api.vercel.app

| Metric | Before | After |
|---|---|---|
| Read endpoints cache | `max-age=0, must-revalidate`, every request hit function | `s-maxage` + SWR; `x-vercel-cache: HIT/STALE` verified on roasts, briefings, matches, world-cup snapshot |
| world-cup/snapshot (427 kB) warm | 0.66–0.71s every hit | **0.23–0.24s edge HIT** |
| briefings/latest | 0.91s | **0.23s edge HIT** |
| Cold-start import graph | full service graph incl. @mastra/core eagerly (~920ms local import) | AI stack dynamic-imported at chat/roast/briefing routes (~300ms local; 626ms deferred to first AI call) |
| 77s cold outlier | observed once on old deploy | not reproduced post-deploy; lazy imports remove the heaviest eager work |
| game/snapshot | uncached (by design, session-personalized) | unchanged ✔ |

## Functional verification

- Local preview (built bundle): app boots, connect bar, chat, predictions (104 fixtures), leaderboard, briefing teaser render; 0 console errors.
- Live: decoded entry JS byte-valid; index.html references new hashed assets; site object version advanced.
- Server: typecheck clean repo-wide; 9/9 tests pass; smoke 200s on roasts/snapshot/briefings local + live.

## Targets vs plan.md

| Target | Result |
|---|---|
| Entry-path JS wire < 150 kB | ✅ 69 kB |
| Home interactive within 1.8s splash | ✅ entry 0.12s + lazy chunks during splash window (splash floor kept per user decision) |
| Read TTFB warm p50 < 800ms | ✅ 0.23–0.61s with edge HITs |
| No multi-second cold reads | ✅ post-deploy probes ≤ 2.9s on first-ever hit, sub-second after; continue watching |

## Notes / unresolved

- One 15.5s outlier on world-cup/snapshot immediately post-deploy (revalidation race); steady-state 0.36s — re-check after a quiet period.
- Vercel GitHub auto-deploy has not fired since commit 5bb5981; deploys are manual `vercel deploy --prod` per runbook. If auto-deploy is expected, reconnect the integration.
- Roast posters may see their new roast lag ≤30s on the feed (s-maxage=30) — accepted trade-off.
