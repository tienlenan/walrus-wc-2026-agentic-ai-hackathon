---
phase: 1
title: Current Contracts And Query DTOs
status: completed
priority: P1
effort: 0.5d
dependencies: []
---

# Phase 1: Current Contracts And Query DTOs

## Overview

Define the private user-action data contract before adding tools. Keep DTOs small, redacted,
and aligned with existing DB/index tables.

## Requirements

- Functional: cover predictions, roasts, match votes, output proofs, record summary, and unified
  dapp action timeline.
- Functional: every DTO must include enough context for Gil to answer naturally and for UI cards
  to render without another request.
- Non-functional: no new schema unless a field is impossible to derive from existing tables.
- Security: all DTOs are scoped by server-side verified wallet address.

## Architecture

Create one server-side query contract module:

```ts
export type UserActionType =
  | "prediction"
  | "roast"
  | "match_vote"
  | "output_record"
  | "gift_reveal"
  | "notebook_query";

export interface UserActionTimelineItem {
  id: string;
  actionType: UserActionType;
  title: string;
  summary: string;
  matchId?: string | null;
  proof?: {
    txDigest?: string | null;
    suiObjectId?: string | null;
    blobId?: string | null;
    contentHash?: string | null;
    walrusStatus?: string | null;
  };
  createdAt: string;
}
```

Contract names:

- `MyGameRecordOutput`
- `MyPredictionsOutput`
- `MyRoastsOutput`
- `MyMatchVotesOutput`
- `MyOutputRecordsOutput`
- `MyDappActionsOutput`

## Related Code Files

- Create: `apps/server/src/services/user-action-history.ts`
- Create: `apps/server/src/services/user-action-history.test.ts`
- Modify: `apps/server/src/services/chat-render-parts.ts`
- Modify later: `apps/web/src/lib/gil-api.ts`
- Read-only sources:
  - `packages/db/sql/schema.sql`
  - `apps/server/src/services/game-snapshot.ts`
  - `apps/server/src/services/roast-engine.ts`
  - `apps/server/src/services/game-votes.ts`
  - `apps/server/src/services/sui-output-records.ts`

## Implementation Steps

1. Inventory current fields from `users`, `predictions`, `fixtures`, `roasts`, `match_votes`,
   and `sui_output_records`.
2. Define DTOs and mapper helpers in `user-action-history.ts`.
3. Keep row-to-DTO conversion pure where possible so tests do not require live DB.
4. Decide exact redaction:
   - show tx/object/blob/hash pointers;
   - show roast text because user generated it;
   - show prediction payload because user submitted it;
   - do not fetch Walrus chat blob body in this phase.
5. Cap default limits at 10 and absolute max at 25.

## Success Criteria

- [ ] DTOs cover every requested user question class.
- [ ] No DTO accepts arbitrary `address` from LLM/user text; address is function argument from verified session only.
- [ ] Pure mappers have unit tests for prediction, roast, vote, output record, and timeline item.
- [ ] No DB migration needed for the MVP.

## Risk Assessment

- Risk: timeline duplicates one action when both domain row and output proof row exist.
  Mitigation: merge by resource type/resource id when possible; otherwise label proof separately.
- Risk: chat transcript expectation expands scope.
  Mitigation: document metadata-only behavior; add `chat_turns` only in future plan if approved.
