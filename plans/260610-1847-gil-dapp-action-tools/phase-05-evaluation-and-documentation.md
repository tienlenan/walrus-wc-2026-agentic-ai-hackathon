---
phase: 5
title: Evaluation And Documentation
status: completed
priority: P1
effort: 0.25d
dependencies:
  - 4
---

# Phase 5: Evaluation And Documentation

## Overview

Verify the exact user complaints with tests and a short project-doc update. The goal is not more
docs volume; it is making future agents know the tool coverage contract.

## Requirements

- Functional: eval prompts prove Gil can answer private dapp history questions.
- Non-functional: no live wallet requirement for unit tests; browser/manual smoke can use an existing wallet session.
- Documentation: update architecture/user-flow docs only where the new tool surface matters.

## Architecture

Evaluation layers:

```text
Unit tests
  user-action-history row mappers
  intent detection phrases

Server verification
  typecheck
  server test

Web verification
  typecheck
  build
  browser smoke if implementing UI

Manual chat prompts
  "toi da du doan gi?"
  "toi da roast gi?"
  "toi da lam gi trong dapp?"
  "show my proof receipts"
```

## Related Code Files

- Create: `apps/server/src/services/user-action-history.test.ts`
- Create optional: `apps/server/src/services/chat-tool-intents.test.ts`
- Modify: `docs/03-architecture.md`
- Modify: `docs/04-user-flows.md`
- Modify optional: `docs/02-requirements.md`

## Implementation Steps

1. Add unit tests for:
   - mapper output shape;
   - max limit clamping;
   - no-user empty output;
   - Vietnamese and English intent detection.
2. Add a small dev/eval script only if manual chat testing is slow:
   - optional path `apps/server/src/dev/eval-gil-action-tools.ts`;
   - sends fixed prompts to `chatWithGil` with a wallet address.
3. Run verification:
   - `pnpm --filter @daily-walrus/server typecheck`
   - `pnpm --filter @daily-walrus/server test`
   - `pnpm --filter @daily-walrus/web typecheck`
   - `pnpm --filter @daily-walrus/web build`
4. Update project docs:
   - architecture: list private user-action tools under Gil agent/runtime;
   - user flows: add chat recall flow for predictions/roasts/actions;
   - requirements: add concise functional requirements if missing.
5. Record known limitation: output records can prove chat/notebook actions, but full chat body recall
   is not in scope without a separate chat transcript index.

## Success Criteria

- [ ] Tests cover all new intent classes.
- [ ] All verification commands pass.
- [ ] Manual/eval prompts produce the expected tool part names.
- [ ] Project docs mention private dapp action tool coverage.
- [ ] No unresolved private-data risk remains.

## Risk Assessment

- Risk: tests become brittle if they assert full Gil prose.
  Mitigation: assert tool part names, counts, and DTO fields, not exact wording.
- Risk: docs drift from implementation.
  Mitigation: update docs after code is verified, not before.
