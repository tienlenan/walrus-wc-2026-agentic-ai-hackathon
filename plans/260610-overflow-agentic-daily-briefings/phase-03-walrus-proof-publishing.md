---
phase: 3
title: "Walrus Proof Publishing"
status: completed
priority: P1
effort: "6h"
dependencies: [1, 2]
---

# Phase 3: Walrus Proof Publishing

## Overview

Publish approved briefings as verifiable Walrus/Sui artifacts. Database is the UI
index; Walrus Blob stores the full payload; Walrus Memory stores recallable daily
facts; Sui `OutputRecord` anchors the content hash and blob ID when a publisher
wallet is configured.

## Requirements

- Functional: save full briefing payload to Walrus via existing `publishJsonBlob`.
- Functional: write concise memory docs into global Walrus Memory so Gil can answer
  "what did you publish today?".
- Functional: create a Sui `OutputRecord` pointer using existing Move function,
  no Move redeploy.
- Functional: runtime tracking exposes latest briefing proof.
- Non-functional: all proof statuses are explicit (`published`, `already_certified`,
  `failed`, `not_configured`).

## Architecture

Payload shape stored on Walrus:

```json
{
  "kind": "daily-briefing",
  "briefingId": "...",
  "briefingDate": "2026-06-10",
  "type": "daily",
  "title": "...",
  "summary": "...",
  "markdown": "...",
  "sources": [],
  "agentTrace": {},
  "createdAt": "...",
  "contentHash": "..."
}
```

Sui receipt:

- Reuse `prediction_game::submit_output_record`.
- Use `OutputKind.ProfilePointer` to avoid contract redeploy.
- Owner is the configured publisher/keeper wallet.
- DB `resource_type` should accept `daily_briefing`; `resource_id` is briefing ID.

Memory:

- Namespace: existing `daily-walrus:global:world-cup-2026`.
- Memory docs are short, fact-first summaries:
  - latest briefing title/date,
  - match focus,
  - source IDs,
  - Walrus blob ID/hash.

## Related Code Files

- Create: `apps/server/src/services/briefing-publisher.ts`
- Modify: `apps/server/src/services/walrus-blob.ts` only if publisher metadata needs expansion.
- Modify: `apps/server/src/services/sui-output-records.ts`
- Modify: `apps/server/src/services/global-world-cup-memory.ts`
- Modify: `packages/contract/src/ids.ts` only for a TypeScript alias, not Move.
- Modify: `apps/web/src/lib/sui-output-record.ts` only if client needs to display the new resource type.

## Implementation Steps

1. Implement `publishBriefingPayload` using `publishJsonBlob("daily-briefing", payload)`.
2. Implement `rememberDailyBriefing` using `rememberBulk(WORLD_CUP_GLOBAL_NAMESPACE, docs)`.
3. Implement server-side Sui receipt helper:
   - read publisher key from env,
   - build `buildSubmitOutputRecord({ kind: OutputKind.ProfilePointer, blobId, contentHash })`,
   - sign/execute only when configured,
   - store digest/object ID when event/indexer confirms or transaction response exposes object changes.
4. Extend `sui-output-records.ts` validation:
   - add `resourceType: "daily_briefing"`,
   - allow `outputKind: "profile_pointer"` for server publisher receipts.
5. Extend runtime tracking DTO:
   - latest briefing status,
   - latest briefing blob/object/hash,
   - latest agent run status.
6. Add retry-safe publisher behavior:
   - if same content hash already published, avoid duplicate DB row,
   - if Walrus succeeds but Sui fails, keep Walrus pointer and mark Sui receipt failed.

## Success Criteria

- [x] Published row contains `content_hash`, Walrus status, memory status, and Sui receipt status.
- [x] Walrus aggregator URL opens the Daily What's Up payload on mainnet.
- [x] Memory write returns `synced` for the latest Daily What's Up item.
- [x] `#tracking` shows latest proof without claiming unavailable blob receipts.
- [x] No Move package redeploy is required.

Note: local mainnet publish uses the Walrus CLI fallback when `WALRUS_PUBLISHER_URL` is absent.

## Risk Assessment

Server-side Sui signing requires funded mainnet/testnet publisher credentials.
If unavailable, do not fake it: publish DB+Walrus+memory, mark Sui receipt
`not_configured`, and keep implementation ready for key injection.
