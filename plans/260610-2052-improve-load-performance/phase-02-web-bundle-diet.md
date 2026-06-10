---
phase: 2
title: Web Bundle Diet
status: completed
priority: P1
effort: 6h
dependencies:
  - 1
---

# Phase 2: Web Bundle Diet

## Overview
Get the wallet SDK out of the critical entry path and stop shipping uncompressed assets. Biggest single lever: live entry JS currently costs 657 kB / ~10s on the wire.

## Key Insights
- `apps/web/src/main.tsx` mounts `WalletProviders` eagerly; `wallet-providers.tsx:2` imports `@mysten/dapp-kit` (+ its CSS) into the entry chunk. All dapp-kit consumers (connect-bar, predictions-desk, etc.) are already lazy — only the provider pins it to entry.
- React context only requires the provider to be mounted above consumers; the provider component itself can live in a lazy chunk loaded immediately after first paint, inside the 1.8s splash window.
- Vite auto-chunking put everything else in entry: no `manualChunks` in `apps/web/vite.config.ts`.
- Mermaid 483 kB chunk comes via streamdown; verify it is NOT in entry `modulepreload` list (check built `index.html` for `<link rel="modulepreload">` entries).
- Portal serves `content-encoding: identity`. Walrus Sites `ws-resources.json` supports per-route response headers (`apps/web/public/ws-resources.json` already exists with `routes`); if Phase 1 confirms headers are honored, ship pre-compressed assets.

## Requirements
- Functional: identical app behavior — wallet auto-connect, all sections, hash routing.
- Non-functional: entry-path JS wire cost < 150 kB; no new flash-of-unstyled/unmounted UI (splash covers provider load).

## Architecture
```
index.html → entry chunk (react, react-dom, App shell, i18n, splash)  ~target <120 kB gzip-equivalent
  └─ lazy: app-providers chunk (dapp-kit + sui + react-query + zustand wallet store)
        └─ lazy (existing): connect-bar, predictions-desk, news-desk-chat, ...
```

## Related Code Files
- Modify: `apps/web/src/main.tsx` (lazy provider boundary with Suspense; splash markup must render without wallet providers)
- Modify: `apps/web/src/wallet-providers.tsx` (becomes lazy-loaded module; keep autoConnect)
- Modify: `apps/web/src/App.tsx` (only if splash/provider layering needs reshuffling; keep `BOOT_SPLASH_MIN_MS = 1800`)
- Modify: `apps/web/vite.config.ts` (manualChunks: `sui-wallet` for @mysten/*, `react-vendor` for react/react-dom; build-time brotli+gzip precompression output if portal honors headers)
- Modify: `apps/web/public/ws-resources.json` (add `headers` per route: `content-encoding`, long-lived `cache-control` for hashed `/assets/*`)
- Modify: `scripts/deploy-walrus-site.sh` (publish compressed variants if approach = precompressed-with-headers)

## Implementation Steps
1. Verify built `index.html`: list `modulepreload` links; ensure mermaid/streamdown chunks absent from boot preloads.
2. Restructure `main.tsx`: render shell (splash + static masthead) immediately; mount `lazy(WalletProviders)`-wrapped tree under Suspense whose fallback is the existing splash/skeleton. Confirm `getSession`/auth code used by App.tsx does not import dapp-kit.
3. Add `manualChunks` so `@mysten/*` lands in one async vendor chunk; rebuild and confirm entry chunk drops to roughly react+app code.
4. Preload the wallet chunk during splash (extend `preloadHomeChunks()` in App.tsx:93).
5. Compression (conditional on Phase 1 finding):
   - If `ws-resources.json` headers are honored: emit `.js`/`.css` files brotli-compressed at build (compressed bytes as the asset content), set `content-encoding: br` + `cache-control: public, max-age=31536000, immutable` headers for `/assets/*`. All modern browsers accept br over HTTPS; document the trade-off (curl without `--compressed` sees binary).
   - If not honored: skip compression here; rely on chunk splitting only, and record the limitation.
6. Rebuild, run Phase 1 measurement script, record entry-path wire bytes before/after.

## Success Criteria
- [ ] `@mysten/dapp-kit`/`@mysten/sui` absent from entry chunk (visualizer evidence).
- [ ] Entry-path JS wire cost < 150 kB on live deploy (or local preview if deploy deferred).
- [ ] Wallet connect, sign-in, predictions signing still work (manual test on testnet/local).
- [ ] No mermaid/streamdown bytes fetched before first chat message renders markdown.

## Risk Assessment
- Lazy provider = brief window where wallet context is unavailable; consumers are already lazy + splash covers ≥1.8s, but verify no module calls dapp-kit hooks outside the provider tree (grep `useCurrentAccount|useSignPersonalMessage|useSuiClient` usage).
- `content-encoding` via static headers serves br to ALL clients unconditionally — acceptable for browsers, breaks naive curl/bots. Fallback: gzip instead of br, or skip.
- dapp-kit CSS import moves with the provider chunk — confirm no FOUC in connect bar (its own chunk already has CSS).
