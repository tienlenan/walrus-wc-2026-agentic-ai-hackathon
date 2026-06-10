---
phase: 3
title: Fonts and Boot Assets
status: completed
priority: P2
effort: 4h
dependencies:
  - 1
---

# Phase 3: Fonts and Boot Assets

## Overview
Remove third-party render-blocking font CSS and trim boot-path asset cost so first paint inside the splash window is instant and self-contained (also removes a Google dependency from a decentralized-hosting story).

## Key Insights
- `apps/web/index.html` loads 4 Google font families via render-blocking `<link>`: Anton, Playfair Display (700/900), DM Sans (400/500/700), JetBrains Mono (500/700) — ~7 weight files + a blocking CSS roundtrip to fonts.googleapis.com.
- Research: self-host WOFF2 + `<link rel="preload">` for the 2 above-the-fold fonts (~180ms median LCP gain); `font-display: swap` for the rest.
- Boot splash uses 6 gallery SVGs (~15 kB total) + `app-icon.svg` (2.2 kB) — cheap, fine. PNGs (app-icon.png 85 kB, walrus.png 44 kB) are off critical path; verify nothing preloads them.

## Requirements
- Functional: identical typography (same families/weights actually used).
- Non-functional: zero render-blocking third-party requests; fonts served from same origin with immutable caching (headers via `ws-resources.json` if Phase 2 confirmed support).

## Related Code Files
- Create: `apps/web/public/fonts/*.woff2` (subsetted: latin + vietnamese ranges — UI is VI/EN)
- Create: `apps/web/src/styles/fonts.css` (`@font-face` rules, `font-display: swap`)
- Modify: `apps/web/index.html` (drop Google Fonts links + preconnects; add preload for masthead fonts: Anton, Playfair 900)
- Modify: `apps/web/public/ws-resources.json` (cache headers for `/fonts/*` if supported)

## Implementation Steps
1. Audit actual font usage in CSS — confirm every family/weight is used; drop unused weights before downloading.
2. Download WOFF2 subsets (latin + vietnamese) via google-webfonts-helper or fonttools subsetting.
3. Add `@font-face` rules in `fonts.css`, import from entry CSS (it's inlined into index.html by `inlineEntryCss` plugin — verify the plugin handles the new import, since @font-face must end up in the inlined style for zero roundtrip).
4. Add `<link rel="preload" as="font" type="font/woff2" crossorigin>` for the 2 masthead-critical fonts.
5. Remove googleapis/gstatic preconnects + stylesheet link.
6. Verify VI diacritics render correctly in both languages (subsetting risk).
7. Re-run Lighthouse; record FCP/LCP delta.

## Success Criteria
- [ ] No requests to fonts.googleapis.com/fonts.gstatic.com.
- [ ] VI + EN text renders correctly in all weights used.
- [ ] FCP/LCP improved or neutral vs Phase 1 baseline (record numbers).

## Risk Assessment
- Vietnamese subset missing glyphs → visible tofu; mitigation: include `vietnamese` unicode-range explicitly and eyeball every section in VI.
- Font files add ~80–150 kB to the Walrus site blob — one-time storage cost, acceptable.
