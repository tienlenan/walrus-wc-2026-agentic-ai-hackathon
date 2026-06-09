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

Funding gate:
- Active deploy wallet: `0xf5ca4f02cf58d6448b6429c691b53c89c56b30c3ded38b45e73ce78829e99f6d`.
- The wallet must hold enough mainnet SUI for Move publish and enough WAL for Walrus Sites storage.
- Current verified state on 2026-06-09: mainnet gas objects are empty, so mainnet publish/deploy is blocked.
- Mainnet publish dry-run passed on 2026-06-09 with estimated gas `35,820,000 MIST`; dry-run package/object IDs are simulation-only and must not be submitted.

## 2) Testnet Snapshot (required)
- Keep testnet package and contract IDs as baseline.
- Run testnet verification checklist (phase 2 plan) and keep logs.
- Treat testnet IDs as internal verification only. Final hackathon submission must use mainnet object IDs and mainnet URL.

## 3) Mainnet Contract
1. Switch CLI/network to mainnet.
2. Build and publish package.
   ```bash
   sui client publish move/wc_predict --gas-budget 100000000 --json
   ```
3. If package already exists: perform upgrade using upgrade capability.
4. Verify:
   - `Prediction` submit,
   - `register_match`,
   - `settle_match` + `record_scores`.

## 4) Frontend Deploy
1. Set env vars in root:
   - `WALRUS_SITE_CONTEXT=mainnet`
   - `SUI_NETWORK=mainnet`
2. Build and deploy with pinned tooling:
   ```bash
   SITE_BUILDER_BIN=/Users/mpdh/.local/share/suiup/binaries/mainnet/site-builder-v2.10.0 \
   WALRUS_BINARY=/Users/mpdh/.local/share/suiup/binaries/mainnet/walrus-v1.49.1 \
   WALRUS_SITE_CONTEXT=mainnet \
   WALRUS_SITE_EPOCHS=12 \
   ./scripts/deploy-walrus-site.sh
   ```
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
- Attach a readable SuiNS name to the Walrus Sites object. The official Walrus Sites docs require SuiNS for public `wal.app` browsing on mainnet.
- Keep the raw site object ID and converted base36 subdomain for diagnostics.

## 7) Final validation
- Confirm `/api/tracking/runtime` shows mainnet contract + memory sync status.
- Post a smoke transaction from frontend with wallet and confirm tx + object IDs exist.
- Update `docs/submission-brief-en.md` and `docs/submission-checklist.md` with final mainnet package, object, and URL values.
