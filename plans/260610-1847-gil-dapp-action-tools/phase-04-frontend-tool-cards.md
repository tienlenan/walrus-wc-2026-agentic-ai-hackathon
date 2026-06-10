---
phase: 4
title: Frontend Tool Cards
status: completed
priority: P2
effort: 0.5d
dependencies:
  - 3
---

# Phase 4: Frontend Tool Cards

## Overview

Render the new user-action tool parts as compact, scan-friendly cards in Gil Desk. Do not add
another standalone activity page unless later requested.

## Requirements

- Functional: show cards for predictions, roasts, votes, output proofs, game record, and timeline.
- Functional: preserve existing fixture/team cards.
- Non-functional: keep chat UI responsive and text within card bounds on mobile.
- Accessibility: cards expose clear labels and link text for proof URLs.

## Architecture

Split tool rendering out of the large chat file:

```text
news-desk-chat.tsx
  imports ToolPartRenderer from chat-tool-cards.tsx

chat-tool-cards.tsx
  FixturesToolCard
  TeamProfileToolCard
  MyPredictionsToolCard
  MyRoastsToolCard
  MyMatchVotesToolCard
  MyOutputRecordsToolCard
  MyDappActionsToolCard
  MyGameRecordToolCard
```

Keep styles in either existing `news-desk-chat.css` if small, or create
`chat-tool-cards.css` if the card set is large.

## Related Code Files

- Modify: `apps/web/src/lib/gil-api.ts`
- Modify: `apps/web/src/components/news-desk-chat.tsx`
- Create: `apps/web/src/components/chat-tool-cards.tsx`
- Create optional: `apps/web/src/components/chat-tool-cards.css`
- Modify: `apps/web/src/lib/i18n.tsx` only if labels need localization.

## Implementation Steps

1. Add frontend TypeScript interfaces matching backend outputs.
2. Extract existing fixture/team card renderers to `chat-tool-cards.tsx`.
3. Add cards:
   - predictions: latest picks, result/points, match label, tx short id;
   - roasts: target, short roast text, proof/blob status;
   - votes: match, vote kind, target, proof;
   - output records: output kind, resource, tx/object/blob/hash;
   - timeline: mixed actions sorted by date;
   - record: points, streak, accuracy, graded count.
4. Add empty states for zero results.
5. Add mobile CSS constraints:
   - fixed max row height only where content can wrap;
   - no overlap between proof chips and long hashes;
   - use `word-break: break-word` for hashes.
6. Keep fallback renderer for unknown future tools.

## Success Criteria

- [ ] Existing `tool-getFixtures` and `tool-getTeamProfile` still render.
- [ ] All new `tool-getMyPredictions`, `tool-getMyRoasts`, `tool-getMyDappActions`, vote, proof, and record parts render with meaningful empty and non-empty states.
- [ ] Long hashes/addresses do not overflow on mobile.
- [ ] `news-desk-chat.tsx` loses render-card bulk instead of growing further.
- [ ] Web typecheck passes.

## Risk Assessment

- Risk: too many card variants make chat noisy.
  Mitigation: show top 3-5 rows with counts; Gil text can summarize the rest.
- Risk: proof links unavailable for some rows.
  Mitigation: show `not recorded`/`not configured`, not broken links.
