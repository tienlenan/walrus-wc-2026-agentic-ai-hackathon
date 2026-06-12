# Mainnet Deploy Runbook

## 0) Public-safe toolchain
Use Node 22 LTS when possible; the repo supports Node `>=20.9.0`, but Node 22 is the verified deploy runtime. Do not commit machine-local absolute paths to this public repository.

```bash
node --version
corepack enable
corepack prepare pnpm@9.15.9 --activate
pnpm --version
pnpm install --frozen-lockfile
```

Use any Node manager (`nvm`, `fnm`, `asdf`, Volta, system package manager) as long as `node --version` resolves to Node 22 or another supported Node 20+ runtime.

If Rollup native loading fails with a macOS code-signature error, re-sign the local optional binary once:

```bash
ROLLUP_NODE="node_modules/.pnpm/@rollup+rollup-darwin-arm64@4.61.1/node_modules/@rollup/rollup-darwin-arm64/rollup.darwin-arm64.node"
xattr -dr com.apple.quarantine "$ROLLUP_NODE" 2>/dev/null || true
codesign --force --sign - "$ROLLUP_NODE"
```

## 1) Sui / Walrus CLI Setup
Install ecosystem CLIs with `suiup`, the upstream version manager for Sui stack binaries.

```bash
curl -sSfL https://raw.githubusercontent.com/Mystenlabs/suiup/main/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"

suiup install sui@mainnet
suiup install walrus
suiup install site-builder@mainnet
suiup install move-analyzer   # optional, useful for Move development

sui --version
walrus --help
site-builder --help
```

Configure the Sui client and select Mainnet:

```bash
sui client
sui client new-env --alias mainnet --rpc https://fullnode.mainnet.sui.io:443 || true
sui client switch --env mainnet
sui client active-address
```

Configure Walrus and Walrus Sites. These commands use the default config locations expected by `walrus` and `site-builder`.

```bash
mkdir -p "$HOME/.config/walrus"
curl --create-dirs https://docs.wal.app/setup/client_config.yaml \
  -o "$HOME/.config/walrus/client_config.yaml"
curl https://raw.githubusercontent.com/MystenLabs/walrus-sites/refs/heads/mainnet/sites-config.yaml \
  -o "$HOME/.config/walrus/sites-config.yaml"
```

If binaries or config files live outside default locations, use env vars at deploy time:

```bash
SITE_BUILDER_BIN=/path/to/site-builder \
WALRUS_BINARY=/path/to/walrus \
SITE_BUILDER_CONFIG=/path/to/sites-config.yaml \
WALRUS_SITE_CONTEXT=mainnet \
WALRUS_SITE_EPOCHS=12 \
pnpm deploy:walrus-site
```

Primary references:
- Sui install: <https://docs.sui.io/getting-started/onboarding/sui-install>
- Sui client config: <https://docs.sui.io/getting-started/onboarding/configure-sui-client>
- Walrus client: <https://docs.wal.app/docs/walrus-client/walrus-cli>
- Walrus Sites site-builder: <https://docs.wal.app/docs/sites/getting-started/installing-the-site-builder>
- Walrus Sites deploy/reference: <https://docs.wal.app/docs/sites/getting-started/using-the-site-builder>

## 2) Project SDK Dependencies
JavaScript/TypeScript SDKs are workspace dependencies, not global installs. A fresh clone only needs `pnpm install --frozen-lockfile`.

Pinned project SDKs:
- `@mysten/sui@2.17.0`: Sui RPC, transaction building, signing helpers.
- `@mysten/dapp-kit@^1`: wallet connection UI/runtime in the React app.
- `@mysten/walrus@1.1.7`: direct Walrus blob writes from the server.
- `@mysten-incubation/memwal@0.0.7`: Walrus Memory integration.

If extracting a package into another project, install the matching SDKs explicitly:

```bash
pnpm add @mysten/sui@2.17.0 @mysten/walrus@1.1.7 @mysten-incubation/memwal@0.0.7
pnpm add @mysten/dapp-kit@^1 @tanstack/react-query@^5
```

## 3) Preflight Variables
Copy `.env.local` and create a separate `.env.mainnet` for production.

Required keys:
- `SUI_NETWORK=mainnet`
- `WC_PACKAGE_ID`, `WC_REGISTRY_ID`, `WC_SCOREBOARD_ID`
- `WC_ADMIN_CAP_ID`, `WC_ORACLE_CAP_ID`
- `MEMWAL_ACCOUNT_ID`, `MEMWAL_DELEGATE_KEY`, `MEMWAL_RELAYER_URL`
- `AI_GATEWAY_API_KEY`, `DATABASE_URL`
- `CRON_SECRET` for Vercel Cron bearer auth; `ORACLE_ADMIN_TOKEN` may also be used for manual oracle calls.
- `MASTRA_URL` (server endpoint)
- Optional daily briefing keys: `BRIEFING_SOURCE_URLS`, `BRIEFING_SIDE_STORIES_JSON`, `BRIEFING_PUBLISHER_WALLET_KEY`, `BRIEFING_POST_SCORE_ENABLED`
- Walrus blob publishing order:
  1. `WALRUS_PUBLISHER_URL` private HTTP publisher, if configured.
  2. `@mysten/walrus` TypeScript SDK with `WALRUS_SDK_WALLET_KEY` or `SESSION_WALLET_KEY`; this wallet must hold enough WAL and SUI.
  3. Local Walrus CLI fallback through `WALRUS_BINARY`, unless `WALRUS_CLI_DISABLED=true`.

Funding gate:
- Active deploy wallet: `0xf5ca4f02cf58d6448b6429c691b53c89c56b30c3ded38b45e73ce78829e99f6d`.
- The wallet must hold enough mainnet SUI for Move publish and enough WAL for Walrus Sites storage.
- Current verified state on 2026-06-09: funded, mainnet package published, Walrus Sites object deployed.

## 4) Testnet Snapshot (required)
- Keep testnet package and contract IDs as baseline.
- Run testnet verification checklist (phase 2 plan) and keep logs.
- Treat testnet IDs as internal verification only. Final hackathon submission must use mainnet object IDs and mainnet URL.

## 5) Mainnet Contract
- Publish digest: `68d4RuFpzqNqzXgLum5KQFkd2qCRL137EkyS4YXpipv2`
- Package: `0x2c9496db107257631c4bad0b8f97593a661f82df83b0bd84500bec57d7738beb`
- MatchRegistry: `0xa992d65237ec8a953f04f0450c39203cc2777b2a67ae61add8c39f74578d3446`
- Scoreboard: `0xfed0e2738f38965144bdcc840d4bf79ff0c9d75a9afd04753cd4f13c763cec10`
- AdminCap: `0xd94e85b3a9e06ecd12b9c032412ffaa6d8d7044d9e97214621aad19528171c41`
- OracleCap: `0x147d6290d21bd01d51a6cdafc2610cfcdb3d4272d7419d57d71df714fa90c25c`
- Fixture seed: 104/104 registered; MatchRegistry `match_count=104`.

## 6) Frontend Deploy
1. Build and deploy with public-safe defaults:
   ```bash
   export PATH="$HOME/.local/bin:$PATH"
   WALRUS_SITE_CONTEXT=mainnet \
   WALRUS_SITE_EPOCHS=12 \
   WALRUS_PRECOMPRESS=1 \
   pnpm deploy:walrus-site
   ```
   `scripts/deploy-walrus-site.sh` resolves `site-builder` from `PATH` by default. Set `SITE_BUILDER_BIN`, `WALRUS_BINARY`, or `SITE_BUILDER_CONFIG` only for non-standard installs.

   `WALRUS_PRECOMPRESS=1` runs `scripts/precompress-walrus-assets.mjs` after the build:
   assets under `/assets/*` are stored as brotli bytes and `ws-resources.json` declares
   `content-encoding: br` + immutable cache headers (portals serve blob bytes verbatim,
   no negotiated compression). Verify post-deploy with
   `curl -sI https://roast2026wc.wal.app/assets/<entry>.js | grep content-encoding` → `br`.
   If the portal ever stops honoring the header, redeploy without the flag.
2. Confirm deploy output still reports:
   - Site object: `0xd7b94c015080b56d9ba19e18112eb69bf5d40dff83158631cd455cd9860c0158`
   - Public URL: `https://roast2026wc.wal.app/`
3. Verify the public HTML references the latest bundle and boot splash:
   ```bash
   curl -sS --max-time 20 'https://roast2026wc.wal.app/?v='$(date +%s) \
     | grep -E 'boot-logo|app-icon.svg|app-ready|/assets/index-'
   ```
4. Verify deep links in browser:
   - `/`
   - `/#predictions`
   - `/#leaderboard`
   - `/#team-profiles`
   - `/#tracking`
5. Verify splash does not get stuck:
   - open `https://roast2026wc.wal.app/?v=<timestamp>`
   - wait for app content
   - check `html` has `app-ready`
   - `#boot-splash` should be `visibility:hidden` and `opacity:0`

## 7) Backend Deploy
1. Deploy the API from repo root:
   ```bash
   corepack enable
   corepack prepare pnpm@9.15.9 --activate
   pnpm install --frozen-lockfile
   vercel deploy --prod --yes
   ```
2. Confirm Vercel aliases production to:
   - `https://gil-var-shamebook-api.vercel.app`
3. Verify:
   ```bash
curl -sS https://gil-var-shamebook-api.vercel.app/
curl -sS https://gil-var-shamebook-api.vercel.app/api/world-cup/snapshot
curl -sS https://gil-var-shamebook-api.vercel.app/api/briefings/latest
```
   Expected Daily What's Up shape:
   - root object contains `briefing`.
   - `briefing.proof.memwalNamespace` is `daily-walrus:global:world-cup-2026:briefings`.
   - `briefing.contentJson.novelty.duplicate` is `false` before using the post as proof.
4. CORS must allow:
   - `https://roast2026wc.wal.app`
   - `http://localhost:5173`
   - Vercel preview origins for smoke testing
5. Vercel Cron is configured in `vercel.json`:
   - `GET /api/oracle/briefings/daily-cron`
   - `30 5 * * *` UTC, equivalent to 12:30 in Vietnam.
   - The route is idempotent: existing same-date `daily` briefing is reused unless `force=1`.
   - Vercel sends `Authorization: Bearer $CRON_SECRET`; the API also accepts `ORACLE_ADMIN_TOKEN` for manual calls.

## 8) SuiNS / Public URL
- Mainnet Walrus Site object: `0xd7b94c015080b56d9ba19e18112eb69bf5d40dff83158631cd455cd9860c0158`.
- Base36 diagnostic: `5dk6jtcpgo39hujesoc658qum6wetenol3b5avm3qpuywq0qqg`.
- SuiNS/public URL is live: `https://roast2026wc.wal.app/`.
- Keep the base36 subdomain only as a diagnostic; use `roast2026wc.wal.app` for submission.

## 9) Final validation
- Confirm `/api/tracking/runtime` shows mainnet contract + memory sync status.
- Run or verify one daily briefing:
  ```bash
  ORACLE_ADMIN_TOKEN=<token> \
  curl -sS -X POST https://gil-var-shamebook-api.vercel.app/api/oracle/briefings/run \
    -H "content-type: application/json" \
    -H "x-oracle-token: $ORACLE_ADMIN_TOKEN" \
    -d '{"type":"daily","force":true}'
  ```
- Verify the cron-safe GET path:
  ```bash
  CRON_SECRET=<token> \
  curl -sS https://gil-var-shamebook-api.vercel.app/api/oracle/briefings/daily-cron \
    -H "authorization: Bearer $CRON_SECRET"
  ```
- Confirm `#briefings` opens, Walrus blob link opens if publisher is configured, and tracking shows latest Daily What's Up status.
- Confirm Daily What's Up trace shows `previousBriefings`, novelty score, and retry rows if duplicate drafts were rejected.
- Post a smoke transaction from frontend with wallet and confirm tx + object IDs exist.
- Update `docs/submission-brief-en.md` and `docs/submission-checklist.md` with final mainnet package, object, and URL values.

## 10) Submission PDF Export
Render the high-level design PDF from the HTML source with local Chrome:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless \
  --disable-gpu \
  --no-sandbox \
  --print-to-pdf="$(pwd)/docs/high-level-design-requirements.pdf" \
  --print-to-pdf-no-header \
  "file://$(pwd)/docs/high-level-design-requirements.html"

cp docs/high-level-design-requirements.pdf \
  submission-pack/assets/docs/high-level-design-requirements.pdf
```

Do not run `git diff --check` directly on regenerated PDFs; exclude binary PDFs:

```bash
git diff --check -- . \
  ':(exclude)docs/high-level-design-requirements.pdf' \
  ':(exclude)submission-pack/assets/docs/high-level-design-requirements.pdf'
```
