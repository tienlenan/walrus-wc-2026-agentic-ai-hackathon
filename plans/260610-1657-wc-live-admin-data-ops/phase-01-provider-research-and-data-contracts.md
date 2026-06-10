---
phase: 1
title: "Provider Research And Data Contracts"
status: pending
priority: P1
effort: "1d"
dependencies: []
---

# Phase 1: Provider Research And Data Contracts

## Overview

Pick provider strategy and define canonical internal DTOs before touching DB/UI.
The output is an adapter contract that shields the app from API-Football,
Sportmonks, BALLDONTLIE, or static fallback shape drift.

## Requirements

- Functional: fixtures/results, live state, events, lineups, player availability,
  provider entity mapping, source metadata, dry-run previews.
- Non-functional: provider key server-only, rate-limit aware, retryable, auditable,
  no frontend provider coupling.

## Key Insights

- API-Football WC2026 guide lists `fixtures?league=1&season=2026`, match details
  with events/lineups/statistics/players, and injuries endpoint.
- Sportmonks is stronger for commercial live data but paid World Cup package.
- BALLDONTLIE FIFA API is purpose-built for World Cup data and exposes lineups/events/stats.
- openfootball is CC0/static and explicitly not live-updated; use schedule fallback only.
- Official FIFA schedule pages are reference sources, not stable backend API contracts.

## Architecture

Canonical adapter contract:

```ts
export interface LiveDataProvider {
  name: "api-football" | "sportmonks" | "balldontlie" | "openfootball";
  listFixtures(input: FixtureSyncInput): Promise<ProviderFixture[]>;
  getFixtureLive(input: ProviderFixtureRef): Promise<ProviderLiveSnapshot>;
  getLineups(input: ProviderFixtureRef): Promise<ProviderLineupSnapshot>;
  getAvailability(input: AvailabilitySyncInput): Promise<ProviderAvailability[]>;
}
```

Every provider result carries:
- `provider`, `providerFixtureId`, `providerTeamId`, `providerPlayerId`,
- `sourceUrl`, `sourceFetchedAt`, `sourceUpdatedAt`,
- `raw`, `contentHash`, `confidence`, `confirmed`.

## Related Code Files

- Create: `apps/server/src/services/live-data/live-data-types.ts`
- Create: `apps/server/src/services/live-data/live-data-provider.ts`
- Create: `apps/server/src/services/live-data/providers/api-football-provider.ts`
- Create: `apps/server/src/services/live-data/providers/static-worldcup-provider.ts`
- Create: `apps/server/src/services/live-data/provider-normalizers.ts`
- Create: `apps/server/src/services/live-data/provider-research.md` only if runtime docs need local copy
- Modify: `apps/server/package.json` if adding test/mocking helpers

## Implementation Steps

1. Confirm budget and API key for primary provider.
2. Implement TypeScript DTOs with zod validation for provider payload boundaries.
3. Build API-Football adapter first behind `LIVE_DATA_PROVIDER=api-football`.
4. Build static fallback adapter using existing generated fixture data/openfootball shape.
5. Add provider capability matrix in code comments or docs:
   `fixtures`, `results`, `events`, `lineups`, `injuries`, `ratings`.
6. Add explicit unsupported behavior:
   provider returns `not_supported` instead of empty arrays when capability missing.
7. Add fixture/team/player ID mapping strategy:
   local IDs remain app-owned; provider IDs live in mapping table from Phase 2.
8. Add timeout/retry/rate-limit config:
   `LIVE_DATA_TIMEOUT_MS`, `LIVE_DATA_MAX_RETRIES`, `LIVE_DATA_MIN_INTERVAL_MS`.

## Success Criteria

- [ ] `LiveDataProvider` interface compiles without importing provider-specific types elsewhere.
- [ ] API-Football adapter can fetch/normalize fixture list in dry-run mode.
- [ ] Static fallback adapter works without external key.
- [ ] Provider capability gaps are explicit in returned status, not silent.
- [ ] No provider API key reaches frontend bundle.

## Risk Assessment

Main risk is provider coverage drift during first tournament days. Mitigation:
contract tests with recorded payloads and operator override path in later phases.
