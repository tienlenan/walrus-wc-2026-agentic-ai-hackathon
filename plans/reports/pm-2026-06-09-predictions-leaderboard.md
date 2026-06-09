# PM Report — Predictions + Leaderboard

Date: 2026-06-09
Plan: `plans/260608-public-multiuser-sui-memory`
Status: in-progress

## What changed
| Area | Result |
|---|---|
| Web | Added Predictions Desk for 5 contract kinds; wallet signs `buildSubmitPrediction`; Leaderboard + My Record + MVP/worst vote UI |
| Server | Added `/api/game/snapshot`, `/api/game/stream`, `/api/game/vote`, `/api/oracle/score`; GraphQL event indexer; gRPC score keeper |
| DB | Added user totals, prediction chain/oracle fields, `indexer_cursor`, `scoring_events`, `score_runs`, `match_votes`, rebuilt `leaderboard` view |
| Contract package | Made env fallback browser-safe for web imports |

## Verification
| Check | Result |
|---|---|
| `tsc --noEmit -p packages/contract/tsconfig.json` | pass |
| `tsc --noEmit -p packages/db/tsconfig.json` | pass |
| `tsc --noEmit -p apps/server/tsconfig.json` | pass |
| `tsc --noEmit -p apps/web/tsconfig.json` | pass |
| `vite build` with bundled Node | pass; bundle warning >500 kB |
| DB schema apply | pass |
| cursor reset replay | pass; indexed 3 GraphQL events |
| DB mirror counts | pass; fixtures=1, predictions=1, scoring_events=1, cursors=3 |
| snapshot DB check | pass; 1 fixture, 1 leaderboard row, 10 points |
| in-app Browser local UI | pass; `#1 Brazil vs Argentina`, leaderboard `10`/`100%`, no visible app errors |
| deprecated Sui API grep | pass; no `SuiJsonRpcClient`, `getJsonRpcFullnodeUrl`, `queryEvents`, `showEffects`, `showEvents` in app code |

## Open
- Public data reset strategy: acceptable pre-demo; no historical reconciliation needed now.
- Sponsored gas remains future v2; current submit is user-paid wallet tx.
- Full destructive rebuild after clearing mirror tables not run; cursor reset replay verified.
