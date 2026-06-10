---
phase: 4
title: "Daily What's Up UI"
status: completed
priority: P1
effort: "1d"
dependencies: [1, 2, 3]
---

# Phase 4: Daily What's Up UI

## Overview

Add a dedicated Daily What's Up page and a compact homepage teaser. The UI should
feel like part of the current tabloid desk: readable, proof-oriented, and not a
marketing page.

## Requirements

- Functional: display latest briefing, list history, source links, agent trace
  summary, and proof buttons.
- Functional: homepage shows a concise "Latest Briefing" module above or near Gil.
- Functional: tracking/reference area shows latest briefing proof status.
- Functional: chat suggestions include prompts like "What did Gil publish today?"
- Non-functional: default language remains English; VI translations stay accurate
  and not literal nonsense.
- Non-functional: avoid heavy initial load; lazy-load briefing history page.

## Architecture

Frontend additions:

- `DailyBriefingsPage`: latest article + history list.
- `BriefingProofStrip`: Walrus blob, object, content hash, Sui receipt.
- `BriefingSourceList`: source title/domain/date.
- `AgentTraceTimeline`: orchestrator -> scout -> synth -> writer -> moderator -> publisher.
- `LatestBriefingTeaser`: small module for home.

API client additions:

- `apps/web/src/lib/briefings-api.ts`
- DTOs mirrored from `briefing-types.ts` through shared package only if reuse is clean.

## Related Code Files

- Create: `apps/web/src/components/daily-briefings.tsx`
- Create: `apps/web/src/components/daily-briefings.css`
- Create: `apps/web/src/lib/briefings-api.ts`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/App.css`
- Modify: `apps/web/src/lib/i18n.tsx`
- Modify: `apps/web/src/components/runtime-tracking.tsx`
- Modify: `apps/web/src/components/news-desk-chat.tsx`

## Implementation Steps

1. Add API client with `getLatestBriefing`, `listBriefings`.
2. Add new nav item:
   - label EN: `Briefings`
   - label VI: `Diem tin`
   - route hash `#briefings`.
3. Build latest briefing view:
   - title/date/status,
   - markdown article rendered through existing markdown renderer path if available,
   - proof strip,
   - source list,
   - agent trace collapsed by default.
4. Add homepage teaser:
   - latest title + one-line summary,
   - "Open briefing" button,
   - small proof hash when available.
5. Add empty/loading states:
   - no giant skeleton rows,
   - clear copy: "No briefing published yet. Gil is still interrogating the fixtures."
6. Add chat suggestions:
   - "Summarize today's briefing"
   - "Which match is Gil watching today?"
   - "What changed in memory after the latest result?"
7. Update runtime tracking to include latest briefing proof fields from Phase 3.

## Success Criteria

- [x] `#briefings` loads as a reference page and does not block the core prediction UI.
- [x] Latest item is readable in the refreshed desktop screenshot.
- [x] Proof links are visible but not noisy.
- [x] Agent trace is collapsed by default and useful when expanded.
- [x] EN/VI labels are updated: "Daily What's Up" / "Bới tin".

## Risk Assessment

Initial-load regressions are likely if this page is bundled with home. Keep the
page lazy-loaded and preload only the latest teaser payload.
