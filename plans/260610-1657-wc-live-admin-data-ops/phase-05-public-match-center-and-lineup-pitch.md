---
phase: 5
title: "Public Match Center And Lineup Pitch"
status: pending
priority: P2
effort: "1.5d"
dependencies: [2, 3]
---

# Phase 5: Public Match Center And Lineup Pitch

## Overview

Build public match view: live score/status, event timeline, availability notes,
and a two-team lineup pitch when data exists.

## Requirements

- Functional: match list, match detail payload, lineup pitch, bench/availability,
  live timeline, stale-data marker, existing prediction gate context.
- Non-functional: no layout shifts, no provider jargon, clear unconfirmed vs confirmed,
  works when lineups are missing.

## Architecture

Frontend DTO:

```ts
interface LiveMatchDetail {
  fixture: Fixture;
  live: MatchLiveState | null;
  events: MatchEvent[];
  lineups: TeamLineup[];
  availability: PlayerAvailability[];
  stale: boolean;
  updatedAt: string;
}
```

UI:
- `MatchCenter`: route shell and match picker.
- `LiveScoreStrip`: status, score, elapsed, last update.
- `LineupPitch`: formation view for two teams.
- `LineupBench`: subs and unavailable players.
- `MatchTimeline`: goals/cards/subs/VAR-style notable events.

Pitch positioning:
- Use provider grid/position if present.
- Else derive x/y from formation and role.
- Show jersey number + short name; full name in tooltip/details.
- Confirmed lineup badge only when provider says confirmed or admin override confirms.

## Related Code Files

- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/lib/game-api.ts`
- Modify: `apps/web/src/lib/world-cup-api.ts`
- Create: `apps/web/src/lib/live-match-api.ts`
- Create: `apps/web/src/components/match-center.tsx`
- Create: `apps/web/src/components/match-center.css`
- Create: `apps/web/src/components/lineup-pitch.tsx`
- Create: `apps/web/src/components/lineup-pitch.css`
- Modify: `apps/web/src/components/predictions-desk.tsx` only to link selected match to match center
- Modify: `apps/web/src/styles/tokens.css` if new semantic colors needed

## Implementation Steps

1. Add public match API client.
2. Add `#matches` route and route loader.
3. Build match picker grouped by live/upcoming/finished.
4. Build score strip using existing fixture fields plus live state.
5. Build lineup pitch with stable dimensions and mobile fallback:
   side-by-side desktop, stacked pitch mobile.
6. Build event timeline with deduped event IDs.
7. Add empty states:
   lineup not released, no injury data, provider delayed, match not started.
8. Link from predictions fixture cards to `#matches?matchId={matchId}` or hash state equivalent.
9. Verify no raw provider JSON leaks in UI.

## Success Criteria

- [ ] Public match center renders from DB payload only.
- [ ] Lineup pitch displays both teams when lineup data exists.
- [ ] Missing lineup data shows professional fallback, not empty broken field.
- [ ] Live status updates through polling/SSE within configured interval.
- [ ] Text fits on mobile and desktop; pitch dimensions do not jump on updates.

## Risk Assessment

Provider lineup data may arrive late or lack coordinates. Mitigation: confirmed badge,
fallback formation mapping, squad-list fallback.
