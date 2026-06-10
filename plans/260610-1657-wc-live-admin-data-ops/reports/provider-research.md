---
title: "WC2026 Live Data Provider Research"
status: complete
created: "2026-06-10"
source: "ck:plan research"
---

# WC2026 Live Data Provider Research

## Summary

Need one keyed provider for official-season operations. Static/free sources cover
schedule, not reliable lineups/injuries/live events.

Recommendation:
- Primary: API-Football/API-Sports.
- Paid fallback: Sportmonks or BALLDONTLIE FIFA API.
- Static fallback: openfootball `worldcup.json`.
- FIFA official pages: verification/reference only.

## Provider Matrix

| Provider | Fit | What it gives | Risk |
|---|---:|---|---|
| API-Football/API-Sports | High | WC2026 fixtures, teams, events, lineups, player stats, injuries, predictions/odds endpoints | Key/quota; coverage can vary per match |
| Sportmonks | High | World Cup package: fixtures, live scores, events, lineups, standings, squads, player stats, bracket | Paid monthly; confirm plan before build |
| BALLDONTLIE FIFA | Medium | World Cup-specific API with teams, rosters, matches, standings, lineups, events, stats, shot maps | Key required; verify stability/quota |
| football-data.org | Medium | Generic football matches/fixtures/live score style API | Confirm WC2026 competition/player detail coverage before relying |
| openfootball/worldcup.json | Low for live, high for static fallback | CC0 JSON schedule/results, no key | Not live-updated; no lineup/injury/live ops |
| FIFA.com official pages | Reference | Official schedule/results pages | Dynamic website, not API contract |

## Source Notes

- API-Football WC2026 guide says `fixtures?league=1&season=2026` retrieves all
  104 matches with fixture ID, UTC date/time, venue, and status; it also lists
  coverage flags for events, lineups, fixture/player statistics, injuries,
  predictions, and odds.
- API-Football guide also says match details can be retrieved by fixture ID and
  include events, lineups, statistics, and players; multiple IDs can be batched.
- Sportmonks docs advertise real-time endpoints for scores, events, substitutions,
  cards, lineups, and statistics; its World Cup 2026 package page lists live
  scores, match events, lineups, standings, squads, stats, and bracket.
- BALLDONTLIE FIFA API says it covers 2018, 2022, and 2026 tournaments and includes
  teams, stadiums, players, rosters, matches, standings, lineups, events, stats,
  shot maps, attack momentum, and odds. API key required.
- openfootball states the 2026 schedule JSON is public domain/no key, but full
  match details/lineups page will not be live-updated.

## Design Decision

Do not build UI or business logic against provider-native payloads.
Build provider adapters and canonical DTOs.

Canonical data surfaces:
- `FixtureSync`: schedule + provider fixture IDs.
- `LiveSnapshot`: status, elapsed, scores, period, source timestamp.
- `EventTimeline`: goals, cards, substitutions, VAR/penalty events where available.
- `LineupSnapshot`: team formation, starters, bench, confirmed flag.
- `AvailabilitySnapshot`: injury/suspension/doubtful notes with source.

## Operational Assumptions

- Before kickoff: fixture, team, availability sync can run hourly or on-demand.
- Near kickoff: lineup sync should run manually/densely for active matches.
- During match: live tick should poll only active windows, not all 104 fixtures.
- After fulltime: final score must be reviewed and applied through existing oracle
  scoring path.

## Source URLs

- https://www.api-football.com/news/post/fifa-world-cup-2026-guide-to-using-data-with-api-sports
- https://www.api-football.com/documentation-v3
- https://docs.sportmonks.com/v3/welcome/what-can-you-do-with-sportmonks-data
- https://www.sportmonks.com/football-api/world-cup-api/
- https://fifa.balldontlie.io/
- https://www.football-data.org/documentation/api
- https://github.com/openfootball/worldcup.json
- https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/match-schedule-fixtures-results-teams-stadiums

## Unresolved Questions

- Which provider key/budget is approved for production?
- Should first day be manual sync only before cron?
- Should predicted lineups be public, or hide until confirmed?
