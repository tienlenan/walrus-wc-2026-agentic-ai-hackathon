---
phase: 5
title: Verification
status: completed
priority: P2
effort: 0.5h
dependencies:
  - 3
---

# Phase 5: Verification

## Overview

Verify the reveal logic, UI behavior, and build health. Add browser screenshots if the UI changes
are cooked.

## Requirements

- Functional: test eligible/ineligible predictions and correct/wrong copy.
- Non-functional: no TypeScript/build regressions, no layout regression on leaderboard.

## Architecture

Validation layers:

- Unit/pure helper tests for eligibility and stable copy.
- App build/typecheck.
- Browser smoke at `/#leaderboard` with wallet/no-wallet state as available.
- Optional mocked snapshot for a scored prediction if mainnet has no scored data.

## Related Code Files

- Test: `/Users/mpdh/Desktop/R-AI-Services/R-AI-Products/walrus-memory-world-cup/apps/web/src/lib/gift-reveal.test.ts`
- Verify: `/Users/mpdh/Desktop/R-AI-Services/R-AI-Products/walrus-memory-world-cup/package.json`
- Verify: `/Users/mpdh/Desktop/R-AI-Services/R-AI-Products/walrus-memory-world-cup/apps/web/package.json`

## Implementation Steps

1. Run focused tests for `gift-reveal.ts` if test runner exists.
2. Run `pnpm --filter @daily-walrus/web build` or current repo build command.
3. Start/refresh local web app.
4. Check `/#leaderboard` at desktop and mobile widths.
5. If Phase 4 is enabled, verify a signed output record on the configured network.
6. Capture before/after screenshots for submission pack only if UI is final.

## Success Criteria

- [ ] Build passes.
- [ ] Correct prediction reveal and wrong prediction reveal are both covered by helper tests or fixture states.
- [ ] Leaderboard remains readable on wide and mobile screens.
- [ ] Optional on-chain save is verified or explicitly marked deferred.

## Risk Assessment

- Risk: no live scored predictions available for browser verification.
  Mitigation: unit test and temporary mocked snapshot; remove mock before commit.
- Risk: package scripts differ by workspace.
  Mitigation: inspect `package.json` and use existing repo commands.
