---
phase: 2
title: "Multi-Agent Workflow"
status: completed
priority: P1
effort: "1d"
dependencies: [1]
---

# Phase 2: Multi-Agent Workflow

## Overview

Build the agentic workflow as one orchestrated backend pipeline with explicit
agent roles, typed handoffs, and persisted traces. This satisfies the multi-agent
requirement without adding fragile distributed infra.

## Requirements

- Functional: orchestrator can run a daily briefing for a target date and optional
  focus (`today`, `tomorrow`, `group`, `team`, `post_match`).
- Functional: scout agent gathers schedule/results from existing cache plus
  allowlisted internet/source adapters.
- Functional: synthesis, writer, and moderator operate on structured inputs only.
- Functional: publisher receives a moderated article and stores it through Phase 3.
- Non-functional: every LLM output must be parseable JSON before it reaches the
  next stage.
- Non-functional: no betting/bets copy; this remains a fun prediction game.

## Architecture

Agent roles:

| Agent | Responsibility | Input | Output |
|---|---|---|---|
| Orchestrator | decide run plan, call agents, retry safe steps | run request | agent trace + final briefing |
| Scout | gather fixtures, team/player context, official links, side story facts | date/focus | `BriefingSource[]` + raw facts |
| Synthesizer | dedupe and rank angles | sources/facts | structured briefing outline |
| Writer | write Gil-style article in English default | outline | markdown + title + summary |
| Moderator | safety, factuality, copyright, roast limits | article + facts | approved/rejected article |
| Publisher | persist DB/Walrus/Memory/Sui | approved article | proof pointers |

Use Mastra/AI SDK where already available. Avoid a new agent framework unless
existing Mastra workflow support is already installed and low-friction.

## Related Code Files

- Create: `apps/server/src/services/briefing-agents.ts`
- Create: `apps/server/src/services/briefing-source-scout.ts`
- Create: `apps/server/src/services/daily-briefing-workflow.ts`
- Modify: `apps/server/src/services/chat-render-parts.ts` if chat should render latest briefing tool cards.
- Modify: `apps/server/src/mastra/tools/get-fixtures.ts` only if existing fixture tool needs reusable query helpers.

## Implementation Steps

1. Implement source adapters:
   - `fixtureCacheSource`: current `getGameSnapshot` + `getWorldCupSnapshotWithProfileBlobs`.
   - `fifaScheduleSource`: existing official schedule URL from `world-cup-data.ts`.
   - `configuredWebSources`: env allowlist `BRIEFING_SOURCE_URLS`, fetch title/meta/short excerpt only.
   - `manualSideStories`: optional JSON config for demo-safe stories.
2. Implement `runScoutAgent`:
   - no open web crawl by default,
   - source timeout budget,
   - source facts include `sourceId`, `url`, `title`, `publishedAt`, `facts[]`.
3. Implement `runSynthesisAgent`:
   - produce JSON outline: `headlineAngles`, `matchesToWatch`, `teamNotes`, `playerWatch`, `memoryHooks`, `sourceIds`.
4. Implement `runWriterAgent`:
   - English default,
   - Gil voice,
   - short sections,
   - can include playful roasts but not unsupported accusations.
5. Implement `runModeratorAgent`:
   - reject claims without source IDs,
   - strip copyrighted long quotes,
   - strip betting language,
   - enforce "fun sports commentary" tone.
6. Implement `runDailyBriefingWorkflow`:
   - idempotent key `${date}:${type}`,
   - persist `agent_runs`,
   - store failed stage and error,
   - return draft to publisher only when moderator approves.

## Success Criteria

- [x] A local manual run can produce a deterministic briefing from existing fixture/team data even with no internet sources configured.
- [x] Source facts are visible in the returned agent trace.
- [x] Writer output references only source IDs created by scout/synthesis.
- [x] Moderator can fail closed and avoid publishing unsupported claims.
- [x] Unit tests cover writer source IDs, unsupported source rejection, and wagering-language cleanup.

## Risk Assessment

The highest risk is hallucinated "news". The scout/synthesis contract must be
treated as the only fact source; writer prompt must say unsupported claims are not
allowed.
