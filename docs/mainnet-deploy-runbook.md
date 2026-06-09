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
- Current verified state on 2026-06-09: funded, mainnet package published, Walrus Sites object deployed.

## 2) Testnet Snapshot (required)
- Keep testnet package and contract IDs as baseline.
- Run testnet verification checklist (phase 2 plan) and keep logs.
- Treat testnet IDs as internal verification only. Final hackathon submission must use mainnet object IDs and mainnet URL.

## 3) Mainnet Contract
- Publish digest: `68d4RuFpzqNqzXgLum5KQFkd2qCRL137EkyS4YXpipv2`
- Package: `0x2c9496db107257631c4bad0b8f97593a661f82df83b0bd84500bec57d7738beb`
- MatchRegistry: `0xa992d65237ec8a953f04f0450c39203cc2777b2a67ae61add8c39f74578d3446`
- Scoreboard: `0xfed0e2738f38965144bdcc840d4bf79ff0c9d75a9afd04753cd4f13c763cec10`
- AdminCap: `0xd94e85b3a9e06ecd12b9c032412ffaa6d8d7044d9e97214621aad19528171c41`
- OracleCap: `0x147d6290d21bd01d51a6cdafc2610cfcdb3d4272d7419d57d71df714fa90c25c`
- Fixture seed: 104/104 registered; MatchRegistry `match_count=104`.

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
1. Deploy server to Vercel/host.
2. Set `MASTRA_URL` to web public endpoint.
3. Set CORS allowlist include:
   - deployed Walrus URL
   - localhost for debug
4. Start indexer loop + keep-alive.

## 6) SuiNS / Public URL
- Mainnet Walrus Site object: `0xd7b94c015080b56d9ba19e18112eb69bf5d40dff83158631cd455cd9860c0158`.
- Base36 diagnostic: `5dk6jtcpgo39hujesoc658qum6wetenol3b5avm3qpuywq0qqg`.
- Attach a readable SuiNS name to the Walrus Sites object. The official Walrus Sites flow requires SuiNS for public `wal.app` browsing on mainnet.
- Current check: `https://5dk6jtcpgo39hujesoc658qum6wetenol3b5avm3qpuywq0qqg.wal.app` returns 404, so do not use it as the final public URL.

## 7) Final validation
- Confirm `/api/tracking/runtime` shows mainnet contract + memory sync status.
- Post a smoke transaction from frontend with wallet and confirm tx + object IDs exist.
- Update `docs/submission-brief-en.md` and `docs/submission-checklist.md` with final mainnet package, object, and URL values.
