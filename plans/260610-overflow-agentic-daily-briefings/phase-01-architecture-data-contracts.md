---
phase: 1
title: "Architecture & Data Contracts"
status: completed
priority: P1
effort: "4h"
dependencies: []
---

# Phase 1: Architecture & Data Contracts

## Overview

Define durable contracts for daily briefings, agent run traces, source facts, and
proof pointers. This phase makes the feature cookable without guessing how agents,
database, Walrus, and Sui receipts fit together.

## Requirements

- Functional: store latest and historical daily briefings by `briefing_date` and
  `briefing_type` (`daily`, `post_match`, `knockout_update`, `manual_demo`).
- Functional: persist agent run input/output summaries for audit and debugging.
- Functional: support proof fields for Walrus blob/object, content hash, MemWal
  namespace, and Sui OutputRecord receipt.
- Non-functional: schema must be idempotent in `packages/db/sql/schema.sql`.
- Non-functional: existing prediction/chat/roast tables must not be rewritten.

## Architecture

Add tables:

```sql
daily_briefings(
  id uuid primary key,
  briefing_date date not null,
  briefing_type text not null,
  status text not null,
  title text not null,
  slug text not null,
  summary text not null,
  markdown text not null,
  content_json jsonb not null,
  sources jsonb not null,
  agent_trace jsonb not null,
  content_hash text not null,
  walrus_blob_id text,
  walrus_object_id text,
  walrus_status text not null,
  memwal_namespace text,
  memory_status text not null,
  output_object_id text,
  output_tx_digest text,
  published_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique(briefing_date, briefing_type)
)

agent_runs(
  id uuid primary key,
  workflow_type text not null,
  workflow_key text not null,
  status text not null,
  input_json jsonb not null,
  output_json jsonb not null,
  error text,
  started_at timestamptz not null,
  completed_at timestamptz
)
```

Store source facts inside `daily_briefings.sources` first. Add a normalized
`daily_briefing_sources` table only if UI/filtering needs it later.

## Related Code Files

- Modify: `packages/db/sql/schema.sql`
- Create: `apps/server/src/services/briefing-types.ts`
- Create: `apps/server/src/services/briefing-store.ts`
- Modify: `apps/server/src/serve.ts`
- Modify: `docs/03-architecture.md`

## Implementation Steps

1. Add TypeScript DTOs for `DailyBriefing`, `AgentRun`, `BriefingSource`,
   `BriefingProof`, and `BriefingAgentTrace`.
2. Add schema DDL with indexes:
   - `daily_briefings_date_idx on (briefing_date desc, briefing_type)`
   - `daily_briefings_status_idx on (status, published_at desc)`
   - `agent_runs_workflow_idx on (workflow_type, workflow_key, started_at desc)`
3. Implement store helpers:
   - `startAgentRun(input)`
   - `finishAgentRun(id, output)`
   - `failAgentRun(id, error)`
   - `upsertDailyBriefing(briefing)`
   - `getLatestDailyBriefing(type?)`
   - `listDailyBriefings(limit, type?)`
4. Add read-only API contracts but return `501` until workflow exists:
   - `GET /api/briefings/latest`
   - `GET /api/briefings`
   - `GET /api/briefings/:id`
5. Update architecture docs with the new briefing data path.

## Success Criteria

- [x] Database schema applies cleanly with `pnpm --filter @daily-walrus/db db:push`.
- [x] Store helpers are isolated from LLM/Walrus/Sui calls.
- [x] API DTO shape is implemented for UI and tracking.
- [x] Existing `game/snapshot`, chat, roast, and tracking endpoints remain available.

## Risk Assessment

Primary risk is schema churn after UI starts. Keep `content_json`, `sources`, and
`agent_trace` as JSONB for flexibility; only normalize later if access patterns
justify it.
