---
phase: 4
title: "Submission Pack (Hackathon)"
status: pending
priority: P1
effort: "1.5d"
dependencies: [3]
---

# Phase 4: Submission Pack (Hackathon)

## Overview
Prepare all judge-facing assets and links: submission forms, demo media, repo link,
project description, and proof artifacts.

## Requirements
- Required metadata filled in for:
  - project name, one-line description, logo, website, contact.
- DeepSurge + Airtable forms fully completed.
- Submission evidence set includes:
  - live site URL,
  - testnet/mainnet contract IDs,
  - at least 1 before/after proof,
  - leaderboard screenshot, roast screenshot, profile/team screenshot.

## Related Files
- `docs/submission-brief-en.md`
- `docs/submission-checklist.md`
- `apps/web/public/logo-troll.svg` (new)
- `scripts/capture-submission-assets.md` (new)
- `apps/web/public` (logo/brand outputs)

## Implementation Steps
1. Create 1 official project logo:
   - one icon, one stacked text lockup, one favicon size.
2. Create 1 poster in project style:
   - dimensions: 1080x1350 (vertical) + optional 1200x630 (horizontal),
   - include app flow, Gil roast tone, and memory proof badge.
3. Record demo video:
   - duration target ≤ 3:00,
   - show: connect wallet → one prediction → one roast → before/after memory difference → leaderboard update.
4. Capture screenshots using consistent naming:
   - `screenshot-home.png`
   - `screenshot-predictions.png`
   - `screenshot-leaderboard.png`
   - `screenshot-notebook.png`
   - `screenshot-before-after.png`
5. Prepare submission brief doc in English:
   - feature list,
   - architecture map,
   - on-chain and Walrus proof links.
6. Fill external forms:
   - https://thewalrussessions.wal.app/memory-world-cup/index.html
   - Airtable form: https://airtable.com/appoDAKpC74UOqoDa/shrIl2BMnzMwpuLhO
7. Export `submission-brief-en.md` to PDF before final form submit.

## Success Criteria
- [ ] Poster, logo, screenshots, and video ready for upload.
- [ ] All hackathon fields for both forms are completed.
- [ ] Submission packet contains on-chain and Walrus verification evidence.

## Risk Assessment
- Short demo window can skip critical proof steps; rehearse once and keep a 3-minute script.
- IP safety of images: avoid real player photos/official logos unless explicitly allowed.
- Avoid inconsistent branding between logo, poster, and site header to reduce judge confusion.

