# Baseline: load performance (2026-06-10)

Probe origin: Saigon. Tooling: `scripts/measure-load-performance.sh` (re-runnable), curl, vite build output, node import timing.

## Web — roast2026wc.wal.app (behind Cloudflare, HKG edge)

| Target | Result |
|---|---|
| index.html | 35.7 kB, `content-encoding: identity`, TTFB 107ms |
| entry JS `assets/index-CU73sKZy.js` | **657,090 B raw, `identity`, 10.3s total (~63 kB/s), cf-cache HIT** |
| Portal compression | NONE — `Accept-Encoding: br, gzip` ignored, serves identity |

## Web — local `vite build` (vite 6.4.3)

| Chunk | Size | gzip (theoretical, NOT served) |
|---|---|---|
| `index-*.js` (entry) | 658.69 kB | 211.08 kB |
| `mermaid-*.js` (lazy, via streamdown) | 483.43 kB | 148.29 kB |
| `news-desk-chat-*.js` | 18.05 kB | 6.16 kB |
| all other section chunks | < 9 kB each | — |
| `index.html` (entry CSS inlined) | 35.67 kB | 7.43 kB |

Entry-chunk cause: `main.tsx` eagerly mounts `WalletProviders` → `wallet-providers.tsx:2` imports `@mysten/dapp-kit` (+ CSS) → dapp-kit/sui/react-query pinned to entry. No `manualChunks` in `vite.config.ts`.

## API — gil-var-shamebook-api.vercel.app

| Endpoint | warm TTFB | size | cache |
|---|---|---|---|
| /api/world-cup/snapshot | 0.66–0.71s | 426,968 B | `max-age=0, must-revalidate`, x-vercel-cache MISS |
| /api/game/snapshot | 1.34s | 44 kB | same |
| /api/briefings/latest | 0.91s | 28 kB | same |
| /api/roasts?limit=20 | 0.71s | 1.5 kB | same |
| /api/world-cup/snapshot (cold outlier) | **77.1s** (observed once) | — | — |

## Server import cost (local M-series, node 22; Vercel cold slower)

| Module | import ms |
|---|---|
| `@mastra/core` | **403ms** |
| `@mysten/sui/client` | 29ms |
| `@mysten/walrus` | 32ms |
| `@ai-sdk/gateway` | 13ms |
| `zod` | 0ms |

Eager at import on Vercel path: `serve.ts:4` static-imports `chat-with-gil` → gil agent (`mastra/agents/gil.ts:8` `createGateway()` at module load, `:15` `new Agent` at module load) → `@mastra/core`. `mastra/index.ts:6` `new Mastra` also import-time.

**Already fine (no work needed):** `startServer()` (seed + memory sync + `startEventIndexer()`) is gated `if (!process.env.VERCEL)` (serve.ts:380) — indexer does NOT run on Vercel. pg pool / Supabase / MemWal clients are lazy singletons.

## Implications for phases

- Phase 2: splitting wallet SDK out of entry + serving compressed = wire cost 657 kB → target < 150 kB. Mermaid already lazy; verify no modulepreload at boot.
- Phase 4: scope reduced — lazy-init gil/gateway/Mastra + dynamic-import chat route; indexer gating already exists upstream. 77s outlier likely cold + seed-less first compute of 427 kB snapshot; re-test after lazy-init.
- Phase 5: zero caching today on all reads; pure win.

## Unresolved questions

- Does the wal.app portal honor `ws-resources.json` per-route `headers` (incl. `content-encoding`)? Cannot test without a deploy — verify during Phase 2 deploy; fallback = chunk-split-only.
- Lighthouse lab run skipped at baseline (portal 10s asset fetch dominates any score); capture in Phase 6 after fixes for the before/after story if needed.
