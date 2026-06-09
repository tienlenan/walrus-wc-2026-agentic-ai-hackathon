---
phase: 3
title: Frontend Gift UI
status: completed
priority: P2
effort: 2h
dependencies:
  - 2
---

# Phase 3: Frontend Gift UI

## Overview

Add the reveal interaction to the leaderboard/my-record area. It should feel like opening a
small prize box, not a new main workflow.

## Requirements

- Functional: show gift cards for scored predictions under the user's record.
- Functional: click opens the box and reveals the troll line.
- Functional: support reset-free reopen after initial open.
- Non-functional: responsive, no line-wrap breakage, accessible button semantics.

## Architecture

Component split:

- `GiftRevealStrip`: receives wallet address and `MyPrediction[]`, renders empty state or cards.
- `GiftRevealBox`: one card with unopened/opened state and animation class.
- `gift-reveal.ts`: pure data helpers from Phase 2.

Placement:

- Add below `.my-record-strip` in `Leaderboard`.
- Keep it compact; use grid/scroll only if many scored predictions.
- Do not put it in the reference/tracking page because this is tied to prediction outcome.

## Related Code Files

- Create: `/Users/mpdh/Desktop/R-AI-Services/R-AI-Products/walrus-memory-world-cup/apps/web/src/components/gift-reveal-strip.tsx`
- Create: `/Users/mpdh/Desktop/R-AI-Services/R-AI-Products/walrus-memory-world-cup/apps/web/src/components/gift-reveal-strip.css`
- Modify: `/Users/mpdh/Desktop/R-AI-Services/R-AI-Products/walrus-memory-world-cup/apps/web/src/components/leaderboard.tsx`
- Modify: `/Users/mpdh/Desktop/R-AI-Services/R-AI-Products/walrus-memory-world-cup/apps/web/src/components/leaderboard.css`
- Modify: `/Users/mpdh/Desktop/R-AI-Services/R-AI-Products/walrus-memory-world-cup/apps/web/src/lib/i18n.tsx`

## Implementation Steps

1. Build `GiftRevealStrip` with empty state and max visible card count if needed.
2. Build `GiftRevealBox` as a real `<button>` for unopened state.
3. Add CSS animation:
   - unopened box: pastel block/icon, subtle hover
   - opening: quick lift/pop
   - opened: receipt/troll copy panel
4. Integrate after `my-record-strip`.
5. Verify large desktop width and mobile width; prevent text wrapping mid-word.
6. Keep language consistent: funny copy where appropriate, UI labels clear.

## Success Criteria

- [ ] User can open each eligible gift with one click.
- [ ] Opened state persists through refresh in the same browser.
- [ ] No gifts render for anonymous or unscored users.
- [ ] UI does not overlap or squeeze leaderboard table.
- [ ] i18n covers all new visible strings.

## Risk Assessment

- Risk: leaderboard becomes cluttered.
  Mitigation: render a compact strip with only latest scored reveals first; use "more" only if needed.
- Risk: animation feels cheap.
  Mitigation: keep motion short and CSS-only; no heavy library.
