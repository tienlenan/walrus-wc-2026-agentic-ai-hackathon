---
phase: 3
title: "Mainnet Domain Deployment"
status: pending
priority: P1
effort: "2d"
dependencies: [2]
---

# Phase 3: Mainnet Domain Deployment

## Overview
Migrate deploy target from testnet validation into production Walrus Sites mainnet,
then attach public access URL/domain and server host.

## Requirements
- Move package and all shared config are updated for mainnet.
- Frontend deployed to Walrus Sites mainnet with SPA routing (`ws-resources.json`).
- Backend reachable from deployed site origin.

## Architecture
- `scripts/deploy-walrus-site.sh` builds and calls `site-builder`.
- Existing env split: `WALRUS_SITE_CONTEXT=mainnet`, `SUI_NETWORK=mainnet`.
- Public entry page must stay on Walrus (`https://... .wal.app`) and expose verification links in runtime tracking.

## Related Code Files
- `scripts/deploy-walrus-site.sh`
- `apps/web/public/ws-resources.json`
- `.env.local` / deployment env file (not versioned)
- `.github`/Railway settings (if required)
- `docs/07-runtime-tracking-design.md` (to include final URLs)

## Implementation Steps
1. Freeze testnet binaries/DB state with checkpoint notes.
2. Rebuild and validate all env variables for mainnet:
   - `SUI_NETWORK=mainnet`
   - `WC_PACKAGE_ID`, `WC_REGISTRY_ID`, `WC_ORACLE_CAP_ID`, `WC_SCOREBOARD_ID`, `WC_ADMIN_CAP_ID`
   - Walrus memory/mainnet relayer URLs
3. Deploy Move test on mainnet:
   - Verify build
   - Publish/upgrade package
   - Verify IDs and keep for tracker
4. Deploy web:
   - `./scripts/deploy-walrus-site.sh`
   - Confirm `/`, `/predictions`, `/leaderboard`, `/team-profiles`, `/tracking` deep links render.
5. Deploy/update server host:
   - Railway/Fly/etc with `MASTRA_URL` pointing to deployed backend.
   - Set CORS origins to deployed site and localhost for dev fallback.
6. DNS/domain:
   - Attach SuiNS name to Walrus object if approved.
7. Verify production health:
   - Open tracking page and confirm contract/memory object links clickable.
   - Send one dry-run user write flow (chat/roast/prediction) from live site.

## Success Criteria
- [ ] Mainnet Walrus site reachable and deep-links load without 404.
- [ ] Backend API accessible from frontend with valid CORS.
- [ ] `#tracking` shows final contract IDs and live memory status.
- [ ] Contract IDs updated in `plans/reports` and shared with submitter.

## Risk Assessment
- Mainnet deploy cost and WAL/SUI availability.
- Host CORS mismatch blocks browser writes.
- Domain/SuiNS attachment delay; keep a fallback Walrus object URL.

