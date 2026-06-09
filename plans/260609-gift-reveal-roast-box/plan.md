---
title: Gift Reveal Roast Box
description: >-
  Add a wallet-gated gift reveal that opens after a scored prediction and shows
  a playful roast based on correct or wrong picks.
status: completed
priority: P2
effort: 6h
branch: main
tags:
  - feature
  - frontend
  - predictions
  - roast
blockedBy: []
blocks: []
created: '2026-06-09T16:08:20.557Z'
createdBy: 'ck:plan'
source: skill
---

# Gift Reveal Roast Box

## Overview

Add a small delight loop after oracle scoring: when a wallet has a scored prediction,
the leaderboard/my-record area shows a gift box. Opening it reveals a stable troll line
for the prediction result: cheeky praise for correct picks, sharper roast for wrong picks.

Scope is intentionally narrow. Use existing `myRecord.predictions` data and avoid contract
redeploy. On-chain/Walrus output proof can be added after the UI MVP works, using the
existing output-record path where possible.

## Scope Challenge

- Existing code: leaderboard already receives `myRecord.predictions`; prediction DTO has
  `oracleStatus`, `oracleCorrect`, `oraclePoints`; output proof helper already records
  `roast` output records.
- Minimum changes: helper for reveal eligibility/copy, a reusable gift UI component, i18n
  strings, and leaderboard integration.
- Complexity: target 4-6 app files for MVP. No new DB table, no Move package upgrade.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Existing Flow Audit](./phase-01-existing-flow-audit.md) | Completed |
| 2 | [Reveal Data Contract](./phase-02-reveal-data-contract.md) | Completed |
| 3 | [Frontend Gift UI](./phase-03-frontend-gift-ui.md) | Completed |
| 4 | [Output Persistence Option](./phase-04-output-persistence-option.md) | Completed |
| 5 | [Verification](./phase-05-verification.md) | Completed |

## Dependencies

- Depends on implemented prediction/scoring data from
  `plans/260608-public-multiuser-sui-memory/phase-05-predictions-scoring.md`.
- Uses leaderboard/my-record surface from
  `plans/260608-public-multiuser-sui-memory/phase-06-leaderboard-indexer.md`.
- Optional persistence reuses output proof mechanics from the M3 output record work.
- Does not block `plans/260610-mainnet-deployment-and-submission`; keep as release add-on.

## Not In Scope

- No new Move contract module or mainnet redeploy for gift reveals.
- No paid image generation for each reveal.
- No server-side LLM call on every open; deterministic templates are enough for MVP.
- No reveal for pending/unscored predictions.

## Acceptance

- Wallet-connected user sees unopened gifts only for scored predictions.
- Reveal text is stable per prediction, localized, and based on correct/wrong result.
- Empty states do not show noisy "notebook empty" style errors.
- Optional on-chain proof path is explicit and disabled/fallback-safe if contract support fails.
