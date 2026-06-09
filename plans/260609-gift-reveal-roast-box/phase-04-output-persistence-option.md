---
phase: 4
title: Output Persistence Option
status: completed
priority: P3
effort: 1h
dependencies:
  - 3
---

# Phase 4: Output Persistence Option

## Overview

Decide whether opening a gift should write an output proof to Sui/Walrus. This is optional
and should only be enabled if it reuses the current output-record contract safely.

## Requirements

- Functional: support optional "save this reveal receipt" action after opening.
- Functional: require wallet session/signature before any write.
- Non-functional: no contract redeploy, no required write for reading/opening a gift.

## Architecture

Preferred approach:

- Opening the box stays local and free.
- Add optional "save receipt" button after reveal.
- Record as existing `OutputKind.Roast` if the team accepts gift reveal as a roast artifact.
- Use `resourceType` extension only if server/index accepts it; otherwise use existing `roast`
  resource type and set `resourceId = gift-reveal:{predictionId}`.
- Payload should include:
  - prediction id
  - match id
  - correct/wrong
  - reveal text key and rendered text
  - timestamp
  - app version/network

Do not add a new Move `OutputKind` for MVP. That would force contract/package drift.

## Related Code Files

- Read/possibly modify: `/Users/mpdh/Desktop/R-AI-Services/R-AI-Products/walrus-memory-world-cup/apps/web/src/lib/sui-output-record.ts`
- Read: `/Users/mpdh/Desktop/R-AI-Services/R-AI-Products/walrus-memory-world-cup/apps/server/src/routes` or current output register route
- Read: `/Users/mpdh/Desktop/R-AI-Services/R-AI-Products/walrus-memory-world-cup/packages/db/sql/schema.sql`
- Optional modify: `/Users/mpdh/Desktop/R-AI-Services/R-AI-Products/walrus-memory-world-cup/apps/web/src/components/gift-reveal-strip.tsx`

## Implementation Steps

1. Verify existing `/api/outputs/register` accepts the chosen resource type.
2. If no schema/server change is needed, add optional save action using `useSuiOutputRecorder`.
3. If schema/server change is needed, defer this phase unless user explicitly wants on-chain proof now.
4. Add pending/success/failure UI states without blocking reveal.
5. Avoid duplicate writes by caching `predictionId -> txDigest` in localStorage or existing output index.

## Success Criteria

- [ ] Reveal works even when output recording is unavailable.
- [ ] If enabled, save action creates a user-signed output record and registers proof.
- [ ] Duplicate save clicks do not spam transactions.
- [ ] UI clearly distinguishes "opened locally" vs "saved on-chain".

## Risk Assessment

- Risk: adding `gift_reveal` type breaks server validation.
  Mitigation: reuse existing `roast` output kind/resource unless there is a verified schema path.
- Risk: user expects every open to cost gas.
  Mitigation: make on-chain save explicit, not automatic.
