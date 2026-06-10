---
title: "WC Live Admin Data Operations"
description: "Add official-season data operations for WC2026: provider-backed sync, injuries, lineups, live match state, admin controls, public lineup pitch, and Walrus memory updates."
status: pending
priority: P1
effort: 8d
branch: "main"
tags: [feature, backend, database, frontend, api, walrus-memory, operations]
blockedBy: []
blocks: []
created: "2026-06-10T09:57:55.897Z"
createdBy: "ck:plan"
source: skill
---

# WC Live Admin Data Operations

## Overview

Prepare Gil's VAR Shamebook for the official World Cup 2026 operating window.
Current repo already has seeded fixtures/team profiles, prediction scoring,
oracle score endpoint, SSE game snapshot, global Walrus Memory sync, and Daily What's Up.
This plan adds provider-backed fixture/result sync, injuries/suspensions,
lineups, public match center, internal admin controls, and current-fact memory integration.

Scope: post-mainnet feature work. No Move redeploy by default. Sui remains truth
for predictions/scoring; Supabase is operational cache; Walrus Memory stores
durable summaries, not every event tick.

## Research Summary

Detailed report: [Provider Research](./reports/provider-research.md).

Recommendation: API-Football primary pending key/budget; BALLDONTLIE FIFA API
or Sportmonks paid fallback; openfootball schedule-only fallback; FIFA official
pages for verification/reference, not backend API contract.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Provider Research And Data Contracts](./phase-01-provider-research-and-data-contracts.md) | Pending |
| 2 | [Storage And Ingestion Ledger](./phase-02-storage-and-ingestion-ledger.md) | Pending |
| 3 | [Oracle Jobs And Admin APIs](./phase-03-oracle-jobs-and-admin-apis.md) | Pending |
| 4 | [Admin Operations Console](./phase-04-admin-operations-console.md) | Pending |
| 5 | [Public Match Center And Lineup Pitch](./phase-05-public-match-center-and-lineup-pitch.md) | Pending |
| 6 | [Memory Briefing And Chat Integration](./phase-06-memory-briefing-and-chat-integration.md) | Pending |
| 7 | [Verification And Go Live Runbook](./phase-07-verification-and-go-live-runbook.md) | Pending |

## Dependencies

- Extends `plans/260608-public-multiuser-sui-memory/phase-04-wc2026-data-oracle.md`.
- Reuses deployment/runtime setup from `plans/260610-mainnet-deployment-and-submission`.
- Reuses Daily What's Up workflow from `plans/260610-overflow-agentic-daily-briefings`.
- Does not block current submission/go-live freeze.

## Architecture Summary

- Provider adapter normalizes API payloads into canonical DTOs.
- Additive DB ledger stores provider maps, sync runs, live states, events, lineups, availability.
- Admin APIs require `ORACLE_ADMIN_TOKEN`; all writes support dry-run first.
- Public match center reads from DB only; no provider key in browser.
- Final score still flows through existing `/api/oracle/score`.
- Memory/briefing sync writes concise summaries to Walrus Memory after meaningful changes.
- Not scope: betting UI, medical speculation, event-level Sui writes, frontend provider payloads.

## Success Criteria

- Admin can dry-run/apply schedule, result, live, lineup, and availability syncs.
- Every sync has provider, source URL, hash, status, timestamps, and error trail.
- Public users can view live status, timeline, and two-team lineup pitch when data exists.
- Chat/Daily What's Up cite current facts without inventing missing data.
- Provider outage degrades to existing schedule/prediction experience.

## Unresolved Questions

- Approve API-Football primary, or prefer Sportmonks/BALLDONTLIE?
- Keep token admin UI, or add wallet-gated admin allowlist?
- Show predicted lineups, or only confirmed lineups?
