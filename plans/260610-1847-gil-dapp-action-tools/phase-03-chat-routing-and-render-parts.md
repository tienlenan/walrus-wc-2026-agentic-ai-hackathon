---
phase: 3
title: Chat Routing And Render Parts
status: completed
priority: P1
effort: 0.75d
dependencies:
  - 2
---

# Phase 3: Chat Routing And Render Parts

## Overview

Route user-action questions into deterministic tool parts and inject concise tool context into
Gil's answer. This is the critical phase for the examples the user flagged.

## Requirements

- Functional: detect Vietnamese and English intents for prediction history, roast history,
  votes, receipts/proofs, record summary, and broad dapp activity.
- Functional: append typed `ChatToolPart` outputs so UI can render cards.
- Non-functional: avoid bloating `chat-render-parts.ts`; split intent/query/render helpers.
- Security: pass `resourceId` from `chatWithGil`, not from message text.

## Architecture

Change call shape:

```ts
// before
buildChatToolParts(message)

// after
buildChatToolParts({ resourceId, message })
```

Suggested split:

- `apps/server/src/services/chat-tool-intents.ts`
  - text normalization
  - intent detection
  - filter inference
- `apps/server/src/services/chat-tool-parts.ts`
  - generic `toolPart()` helper
  - context summary builders
- `apps/server/src/services/chat-render-parts.ts`
  - preserve public fixture/team query exports
  - delegate private intents to user action service

Intent examples:

| Intent | Example phrases |
|---|---|
| `my_predictions` | `toi da du doan gi`, `my predictions`, `what did I pick` |
| `my_roasts` | `toi da roast gi`, `who did I roast`, `my roast history` |
| `my_votes` | `toi da vote ai`, `my MVP vote`, `worst player vote` |
| `my_proofs` | `receipts cua toi`, `my proofs`, `Sui records`, `Walrus blobs` |
| `my_actions` | `toi da lam gi trong dapp`, `my activity`, `dapp actions` |
| `my_record` | `record cua toi`, `my score`, `my streak`, `accuracy` |

## Related Code Files

- Modify: `apps/server/src/services/chat-with-gil.ts`
- Modify: `apps/server/src/services/chat-render-parts.ts`
- Create: `apps/server/src/services/chat-tool-intents.ts`
- Create: `apps/server/src/services/chat-tool-parts.ts`
- Modify optional: `apps/server/src/mastra/agents/gil.ts`

## Implementation Steps

1. Add `resourceId` to `buildChatToolParts` input and update `chatWithGil`.
2. Move current fixture/profile intent helpers out of the large file if practical.
3. Add private-intent detection before or alongside public fixture/profile intents.
4. For each private intent:
   - call the corresponding `user-action-history` helper;
   - add the matching `tool-getMyPredictions`, `tool-getMyRoasts`, `tool-getMyDappActions`,
     or proof/vote/record part;
   - add one concise context line for Gil.
5. Build context that says exact counts and top rows:
   - "Tool getMyPredictions returned 4 predictions; latest pick was match-001 winner BRA."
   - "Tool getMyRoasts returned 0 roasts; tell user none yet."
6. Update Gil tool-use instructions:
   - use private action tools for wallet history;
   - do not fabricate history when tools return empty;
   - use proof pointers when answering receipt questions.
7. Keep fixture/team behavior unchanged.

## Success Criteria

- [ ] Asking "toi da du doan gi?" triggers `tool-getMyPredictions`.
- [ ] Asking "toi da roast gi?" triggers `tool-getMyRoasts`.
- [ ] Asking "toi da lam gi trong dapp?" triggers `tool-getMyDappActions`.
- [ ] Asking proof/receipt questions triggers `tool-getMyOutputRecords`.
- [ ] Empty state context prevents hallucinated user history.
- [ ] `chat-render-parts.ts` is smaller or at least not materially larger without modularization.

## Risk Assessment

- Risk: regex intent misses Vietnamese without accents.
  Mitigation: keep existing NFD normalization and add unaccented phrases.
- Risk: model ignores tool context.
  Mitigation: tool context is injected into system message and UI cards show source truth anyway.
- Risk: deterministic prefetch and Mastra tools diverge.
  Mitigation: use the same query functions; private tools can stay deterministic-only if needed.
