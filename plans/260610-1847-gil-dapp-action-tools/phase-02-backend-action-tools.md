---
phase: 2
title: Backend Action Tools
status: completed
priority: P1
effort: 1d
dependencies:
  - 1
---

# Phase 2: Backend Action Tools

## Overview

Implement identity-scoped query functions and optional Mastra tool definitions for user dapp
history. The safe path is deterministic server prefetch from the verified session; LLM-supplied
wallet addresses are not allowed.

## Requirements

- Functional: provide read helpers for game record, predictions, roasts, match votes, output
  records, and unified dapp timeline.
- Functional: return stable empty outputs when user has no rows.
- Non-functional: query count stays bounded; each helper uses one or two SQL calls.
- Security: every helper rejects non-Sui addresses and reads only rows for that address.

## Architecture

Use `apps/server/src/services/user-action-history.ts` as the only DB query boundary.

```text
getMyPredictions(address, filters)
  users -> predictions -> fixtures

getMyRoasts(address, filters)
  roasts where resource_id = address

getMyMatchVotes(address, filters)
  users -> match_votes -> fixtures

getMyOutputRecords(address, filters)
  users -> sui_output_records

getMyDappActions(address, filters)
  compose predictions + roasts + votes + output records
  sort desc by createdAt
```

Mastra tools:

- Create files only if runtime can inject verified `resourceId` into tool execution safely.
- If not, do not expose private Mastra tools. Keep deterministic `buildChatToolParts` as the
  private-tool executor and document why.

## Related Code Files

- Create: `apps/server/src/services/user-action-history.ts`
- Optional create: `apps/server/src/mastra/tools/get-my-game-record.ts`
- Optional create: `apps/server/src/mastra/tools/get-my-predictions.ts`
- Optional create: `apps/server/src/mastra/tools/get-my-roasts.ts`
- Optional create: `apps/server/src/mastra/tools/get-my-match-votes.ts`
- Optional create: `apps/server/src/mastra/tools/get-my-output-records.ts`
- Optional create: `apps/server/src/mastra/tools/get-my-dapp-actions.ts`
- Modify only if safe: `apps/server/src/mastra/agents/gil.ts`

## Implementation Steps

1. Implement address validation:
   - accept only strings starting `0x`;
   - never read address from message text;
   - return empty outputs if user row does not exist.
2. Implement `getMyGameRecord` from `users` with accuracy calculation aligned to
   `game-snapshot.ts`.
3. Implement `getMyPredictions`:
   - join fixture label/kickoff/status;
   - expose payload, result, oracle status, points, correctness, tx digests;
   - filters: `matchId`, `kind`, `result`, `limit`.
4. Implement `getMyRoasts`:
   - filter by `targetType`, `teamCode`, `targetName`, `limit`;
   - include roast text, target, blob/hash/proof pointers.
5. Implement `getMyMatchVotes`:
   - include match label, kind, target label, proof pointers, updated time.
6. Implement `getMyOutputRecords`:
   - filter by `outputKind`, `resourceType`, `limit`;
   - include tx/object/blob/hash and created time.
7. Implement `getMyDappActions`:
   - merge normalized items from all helpers;
   - de-duplicate proof records when they clearly belong to a domain row;
   - keep proof-only records as `output_record`.
8. Add unit tests for row mappers and limit behavior.

## Success Criteria

- [ ] Each helper returns typed output and bounded result size.
- [ ] Queries use parameterized SQL only.
- [ ] No helper can query a wallet different from the verified session wallet.
- [ ] Tool/service tests pass under `pnpm --filter @daily-walrus/server test`.
- [ ] Existing `getGameSnapshot` behavior is unchanged.

## Risk Assessment

- Risk: some actions are only in `sui_output_records`, not domain tables.
  Mitigation: include proof-only timeline items with clear labels.
- Risk: output records prove chat/notebook actions but do not contain full body text.
  Mitigation: say "chat output proof exists" rather than inventing chat content.
- Risk: raw prediction payload JSON is awkward.
  Mitigation: add small formatter for common kinds, keep raw payload as fallback.
