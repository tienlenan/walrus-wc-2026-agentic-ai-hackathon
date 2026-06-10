---
phase: 6
title: "Memory Briefing And Chat Integration"
status: pending
priority: P2
effort: "1d"
dependencies: [2, 3, 5]
---

# Phase 6: Memory Briefing And Chat Integration

## Overview

Teach Gil and Daily What's Up to use current live facts: lineups, injuries,
match status, and notable events. Store durable summaries in Walrus Memory.

## Requirements

- Functional: chat tools can answer live match/lineup/availability questions;
  Daily briefing scout includes live facts; memory sync stores summaries after
  meaningful changes.
- Non-functional: no hallucinated medical claims, no stale facts without timestamp,
  no memory spam for every tick.

## Architecture

Memory kinds:
- `world_cup_schedule`: existing fixture schedule/result memory.
- `world_cup_team_profiles`: existing team/squad memory.
- `world_cup_live_status`: new rolling summaries for active/recent matches.
- `world_cup_availability`: new team-level injury/suspension summaries.

Sync strategy:
- On `lineups` or `availability` apply: write concise team/match summary.
- On `finalize_result`: force existing schedule memory sync plus post-match summary.
- During live match: memory sync at meaningful milestones only:
  kickoff, halftime, fulltime, goal/red card, lineup confirmed.

## Related Code Files

- Modify: `apps/server/src/mastra/tools/get-fixtures.ts`
- Modify: `apps/server/src/mastra/tools/get-team-profile.ts`
- Modify: `apps/server/src/services/chat-render-parts.ts`
- Modify: `apps/server/src/services/chat-with-gil.ts`
- Modify: `apps/server/src/services/briefing-source-scout.ts`
- Modify: `apps/server/src/services/global-world-cup-memory.ts`
- Create: `apps/server/src/services/live-data/live-memory-sync.ts`
- Modify: `apps/web/src/components/news-desk-chat.tsx` if new render parts are added

## Implementation Steps

1. Extend fixture tool output with optional `live`, `events`, `lineups`, `availabilitySummary`.
2. Add `tool-getLiveMatch` render part if fixture cards become too dense.
3. Update Gil prompt guard:
   quote provider timestamp; say "not available yet" for missing lineup/injury data.
4. Extend `briefing-source-scout` facts:
   upcoming lineups, unavailable players, live score, last major event.
5. Add memory summary builder for match state and availability.
6. Add dedupe hash to avoid writing same live summary repeatedly.
7. Add moderation guard for injuries:
   report as provider-sourced availability, no diagnosis/speculation.
8. Update `#tracking` to show latest live/availability memory sync status if useful.

## Success Criteria

- [ ] Gil can answer "lineup for match X?" from DB-backed tool data.
- [ ] Gil says data unavailable when provider has no confirmed lineup.
- [ ] Daily What's Up includes live facts only with source IDs/timestamps.
- [ ] Walrus Memory receives concise summaries, not high-frequency event spam.
- [ ] Existing chat and briefing tests still pass.

## Risk Assessment

LLM may overstate injuries. Mitigation: deterministic tool context and prompt rule:
"reported unavailable/doubtful by provider", never medical certainty.
