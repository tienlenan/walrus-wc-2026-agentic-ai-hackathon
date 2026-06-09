---
phase: 2
title: Reveal Data Contract
status: completed
priority: P2
effort: 1.5h
dependencies:
  - 1
---

# Phase 2: Reveal Data Contract

## Overview

Define the client-side reveal model: eligibility, stable copy selection, and local open state.
Keep it deterministic and testable.

## Requirements

- Functional: map each scored prediction to one reveal card.
- Functional: choose different troll copy for correct vs wrong prediction.
- Functional: remember opened state per browser/wallet/prediction.
- Non-functional: deterministic, no network call required, safe humor.

## Architecture

Create a small pure helper module:

```ts
type GiftReveal = {
  predictionId: string;
  matchId: string;
  isCorrect: boolean;
  points: number | null;
  titleKey: string;
  lineKey: string;
  tone: "victory-roast" | "shame-roast";
};
```

Rules:

- Eligible when `oracleCorrect !== null`; optionally require `oracleStatus === "recorded"` if data confirms.
- Stable line index = hash of `prediction.id + oracleCorrect + matchId`.
- Open state key = `daily-walrus:gift-reveal:{walletAddress}:{predictionId}`.
- No persistence needed to render reveal. Local state only controls animation/opened status.

## Related Code Files

- Create: `/Users/mpdh/Desktop/R-AI-Services/R-AI-Products/walrus-memory-world-cup/apps/web/src/lib/gift-reveal.ts`
- Modify: `/Users/mpdh/Desktop/R-AI-Services/R-AI-Products/walrus-memory-world-cup/apps/web/src/lib/i18n.tsx`
- Optional test: `/Users/mpdh/Desktop/R-AI-Services/R-AI-Products/walrus-memory-world-cup/apps/web/src/lib/gift-reveal.test.ts`

## Implementation Steps

1. Add `buildGiftReveals(predictions, walletAddress)` helper.
2. Add `isGiftRevealEligible(prediction)` helper.
3. Add deterministic copy selection helper.
4. Add English/Vietnamese labels:
   - "Open gift"
   - "Gil packed this receipt"
   - Correct-pick lines
   - Wrong-pick lines
   - Empty state for no scored gifts
5. Keep troll copy playful. Avoid sensitive/identity-targeted insults.

## Success Criteria

- [ ] Same prediction always gets the same reveal text.
- [ ] Pending predictions never produce a gift.
- [ ] Correct and wrong predictions use visibly different tone.
- [ ] Helper can be tested without React, wallet, server, or Sui client.

## Risk Assessment

- Risk: localStorage makes reveals device-local.
  Mitigation: acceptable for MVP; Phase 4 covers optional persistent proof.
- Risk: jokes become repetitive.
  Mitigation: add enough copy variants now, keep data-driven list simple to extend.
