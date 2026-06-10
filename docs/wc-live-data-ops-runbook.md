# WC Live Data Ops Runbook

## Goal

Operate World Cup live data without changing prediction/scoring trust boundaries.
Provider data updates Supabase cache. Final scoring still requires oracle review
through `/api/oracle/score`.

## Env

- `LIVE_DATA_PROVIDER=openfootball|api-football`
- `API_FOOTBALL_KEY=<secret>` for API-Football
- `LIVE_DATA_TIMEOUT_MS=6000`
- `LIVE_DATA_STALE_MS=300000`
- `ORACLE_ADMIN_TOKEN=<secret>`

## Dry Run

```bash
pnpm --filter @daily-walrus/server live-data:sync --job=fixtures_full
pnpm --filter @daily-walrus/server live-data:sync --job=live_tick --match=1
pnpm --filter @daily-walrus/server live-data:sync --job=lineups --match=1
pnpm --filter @daily-walrus/server live-data:sync --job=pre_match --match=1
```

## Apply

```bash
pnpm --filter @daily-walrus/server live-data:sync --job=fixtures_full --apply
pnpm --filter @daily-walrus/server live-data:sync --job=live_tick --match=1 --apply
pnpm --filter @daily-walrus/server live-data:sync --job=lineups --match=1 --apply
```

## HTTP

```bash
curl -sS https://gil-var-shamebook-api.vercel.app/api/matches/live

curl -sS https://gil-var-shamebook-api.vercel.app/api/admin/live-data/status \
  -H "x-oracle-token: $ORACLE_ADMIN_TOKEN"

curl -sS -X POST https://gil-var-shamebook-api.vercel.app/api/oracle/live-data/sync \
  -H "content-type: application/json" \
  -H "x-oracle-token: $ORACLE_ADMIN_TOKEN" \
  -d '{"jobType":"fixtures_full","mode":"dry_run"}'
```

## Final Score Gate

1. Run `live_tick` or `finalize_result` dry-run.
2. Compare provider score with visible match result.
3. Apply live data if correct.
4. Call existing score oracle:

```bash
curl -sS -X POST https://gil-var-shamebook-api.vercel.app/api/oracle/score \
  -H "content-type: application/json" \
  -H "x-oracle-token: $ORACLE_ADMIN_TOKEN" \
  -d '{"matchId":"1","homeScore":2,"awayScore":1,"execute":true,"settle":true}'
```

## Fallback

- If provider fails: public `#matches` uses cached DB rows or static schedule.
- If API quota hits: disable polling, use manual dry-run/apply only.
- If final score is uncertain: do not call `/api/oracle/score`.
