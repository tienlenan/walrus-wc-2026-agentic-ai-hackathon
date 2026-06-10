---
phase: 2
title: "Storage And Ingestion Ledger"
status: pending
priority: P1
effort: "1.5d"
dependencies: [1]
---

# Phase 2: Storage And Ingestion Ledger

## Overview

Add DB storage for provider mappings, sync audit, live status, match events,
lineups, and player availability. Keep additive schema changes only.

## Requirements

- Functional: store current live state, lineup pitch data, injuries/suspensions,
  sync runs, deduped provider events, and manual override trace.
- Non-functional: idempotent upserts, indexes for match pages, bounded raw JSON,
  no destructive changes to current prediction tables.

## Architecture

Additive schema candidates in `packages/db/sql/schema.sql`:

```sql
create table provider_entity_map (
  entity_type text not null,
  local_id text not null,
  provider text not null,
  provider_id text not null,
  meta jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (entity_type, local_id, provider)
);

create table provider_sync_runs (
  id uuid primary key default uuid_generate_v4(),
  provider text not null,
  job_type text not null,
  scope text not null,
  mode text not null default 'dry_run',
  status text not null default 'running',
  fetched_count int not null default 0,
  applied_count int not null default 0,
  content_hash text,
  error text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);
```

Additional tables:
- `match_live_states`: one row per match, current status/score/elapsed/source.
- `match_events`: provider event timeline, unique per provider event id.
- `match_lineups`: one row per match/team/provider, formation/confirmed/coach.
- `match_lineup_players`: starters/subs with role, shirt, position, x/y pitch coords.
- `player_availability`: injury/suspension/doubtful/available notes with source.
- `admin_live_data_overrides`: manual override ledger, never silent edits.

## Related Code Files

- Modify: `packages/db/sql/schema.sql`
- Modify: `apps/server/src/services/game-snapshot.ts`
- Modify: `apps/server/src/services/world-cup-data.ts`
- Create: `apps/server/src/services/live-data/live-data-store.ts`
- Create: `apps/server/src/services/live-data/live-data-store.test.ts`
- Create: `apps/server/src/services/live-data/lineup-positioning.ts`
- Modify: `apps/web/src/lib/game-api.ts`
- Modify: `apps/web/src/lib/world-cup-api.ts`

## Implementation Steps

1. Add schema tables/indexes with `create table if not exists` and `alter table add column if not exists`.
2. Add `provider_fixture_id`, `provider_updated_at`, `live_updated_at` to `fixtures` only if useful for fast joins.
3. Implement repository functions:
   `recordSyncRun`, `upsertProviderMaps`, `upsertLiveSnapshot`,
   `upsertLineups`, `upsertAvailability`, `listMatchLive`.
4. Normalize provider events into durable event keys:
   `${provider}:${fixtureId}:${eventId || minute:type:player}`.
5. Store raw JSON trimmed to safe size or full raw only for latest run artifacts.
6. Add indexes:
   `match_events(match_id, minute, id)`,
   `match_lineup_players(match_id, team_code, role)`,
   `player_availability(team_code, status, updated_at desc)`.
7. Extend server DTOs with optional `live`, `events`, `lineups`, `availability`.
8. Preserve existing `/api/game/snapshot` shape for old frontend fields.

## Success Criteria

- [ ] Existing seed and prediction flows still work against old rows.
- [ ] Applying same provider payload twice creates one stable state, no duplicate timeline.
- [ ] Sync run table can explain what changed, skipped, or failed.
- [ ] Match page queries need no provider API call at render time.
- [ ] Schema remains rebuildable from provider + Walrus/Sui proof layers.

## Risk Assessment

Raw provider payloads can grow quickly. Mitigation: store canonical fields in tables,
keep raw only as bounded JSON for debugging.
