# Mainnet Deploy Runbook

## 1) Preflight Variables
Copy `.env.local` and create a separate `.env.mainnet` for production.

Required keys:
- `SUI_NETWORK=mainnet`
- `WC_PACKAGE_ID`, `WC_REGISTRY_ID`, `WC_SCOREBOARD_ID`
- `WC_ADMIN_CAP_ID`, `WC_ORACLE_CAP_ID`
- `MEMWAL_ACCOUNT_ID`, `MEMWAL_DELEGATE_KEY`, `MEMWAL_RELAYER_URL`
- `AI_GATEWAY_API_KEY`, `DATABASE_URL`
- `MASTRA_URL` (server endpoint)

## 2) Testnet Snapshot (required)
- Keep testnet package and contract IDs as baseline.
- Run testnet verification checklist (phase 2 plan) and keep logs.

## 3) Mainnet Contract
1. Switch CLI/network to mainnet.
2. Build and publish package.
3. If package already exists: perform upgrade using upgrade capability.
4. Verify:
   - `Prediction` submit,
   - `register_match`,
   - `settle_match` + `record_scores`.

## 4) Frontend Deploy
1. Set env vars in root:
   - `WALRUS_SITE_CONTEXT=mainnet`
   - `SUI_NETWORK=mainnet`
2. Build and deploy:
   - `./scripts/deploy-walrus-site.sh`
3. Verify deep links in browser:
   - `/`
   - `/#predictions`
   - `/#leaderboard`
   - `/#team-profiles`
   - `/#tracking`

## 5) Backend Deploy
1. Deploy server to Railway/host.
2. Set `MASTRA_URL` to web public endpoint.
3. Set CORS allowlist include:
   - deployed Walrus URL
   - localhost for debug
4. Start indexer loop + keep-alive.

## 6) SuiNS / Public URL
- Attach a readable SuiNS name if available for easier judge access.
- Keep fallback to raw Walrus object URL.

## 7) Final validation
- Confirm `/api/tracking/runtime` shows mainnet contract + memory sync status.
- Post a smoke transaction from frontend with wallet and confirm tx + object IDs exist.

