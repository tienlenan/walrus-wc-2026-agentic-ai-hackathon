---
phase: 6
title: "Verification & Submission Docs"
status: completed
priority: P1
effort: "6h"
dependencies: [1, 2, 3, 4, 5]
---

# Phase 6: Verification & Submission Docs

## Overview

Verify the workflow end-to-end and update the existing submission pack so Overflow
judges can understand the Walrus-backed agentic workflow quickly.

## Requirements

- Functional: tests cover workflow contracts, source fallback, moderation, store,
  and API responses.
- Functional: screenshots include Daily What's Up, proof strip, and tracking.
- Functional: docs describe multi-agent architecture, Walrus storage, memory
  updates, and Sui receipt behavior.
- Non-functional: comments and docs stay English.
- Non-functional: no claim of mainnet proof unless the row actually has mainnet
  Walrus/Sui IDs.

## Architecture

Verification layers:

1. Typecheck/build.
2. Unit tests for source/moderation/store.
3. Local manual run with fallback data.
4. Testnet publish if publisher/testnet env available.
5. Mainnet publish only after testnet proof is clean.
6. Browser screenshots on local/test env.

Submission docs:

- Update `docs/submission-brief-en.md`.
- Update `docs/submission-checklist.md`.
- Update `docs/03-architecture.md`.
- Add a short Overflow appendix if needed:
  `docs/overflow-2026-agentic-walrus-brief.md`.

## Related Code Files

- Modify: `docs/submission-brief-en.md`
- Modify: `docs/submission-checklist.md`
- Modify: `docs/03-architecture.md`
- Modify: `docs/mainnet-deploy-runbook.md`
- Create: `docs/overflow-2026-agentic-walrus-brief.md`
- Update screenshots under `submission-pack/screenshots/`

## Implementation Steps

1. Add tests:
   - scout allowlist/no-source fallback,
   - synthesis/writer JSON parse failure,
   - moderator reject path,
   - publisher status matrix.
2. Run:
   - `pnpm --filter @daily-walrus/server typecheck`
   - `pnpm --filter @daily-walrus/web build`
   - relevant unit tests.
3. Run manual local briefing and inspect DB row.
4. Publish to testnet Walrus/Sui if env configured.
5. Promote to mainnet only after testnet IDs open correctly.
6. Capture screenshots:
   - home teaser,
   - `#briefings`,
   - expanded agent trace,
   - tracking proof panel.
7. Update submission language:
   - primary track: Special - Walrus,
   - secondary narrative: Agentic Web workflow,
   - no app rename.

## Success Criteria

- [x] End-to-end Daily What's Up item exists with source list, article, Walrus status, memory status, and Sui receipt status.
- [x] Browser screenshots are regenerated after UI changes.
- [x] Submission docs explain the six-agent workflow.
- [x] Mainnet submission facts match live runtime IDs for memory and Sui receipt.
- [x] Stale references to unavailable proof are called out instead of claimed.

## Risk Assessment

The main submission risk is overclaiming. The docs must distinguish configured,
published, failed, and not-configured proof states with exact IDs.
