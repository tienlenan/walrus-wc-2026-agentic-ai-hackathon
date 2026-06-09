# Walrus Sites Deploy Report — 2026-06-09

## Result
- Testnet Walrus Sites deploy: passed.
- Mainnet Walrus Sites deploy: blocked by missing WAL coin balance in the deploy wallet.
- Final hackathon submission must use mainnet IDs and URLs. Testnet IDs below are internal verification only.

## Tooling
- `sui`: `/Users/mpdh/.local/bin/sui`, version `1.73.1`.
- `site-builder`: `/Users/mpdh/.local/share/suiup/binaries/mainnet/site-builder-v2.10.0`.
- `walrus`: `/Users/mpdh/.local/share/suiup/binaries/mainnet/walrus-v1.49.1`.
- Walrus config: `~/.config/walrus/client_config.yaml`.
- Walrus Sites config: `~/.config/walrus/sites-config.yaml`.

## Build Output
- Source: `apps/web`
- Build directory: `apps/web/dist`
- SPA routing config: `apps/web/public/ws-resources.json`
- Sourcemaps are disabled unless `VITE_SOURCEMAP=1`, reducing Walrus upload size.

## Testnet Deploy
- Command:
  ```bash
  SITE_BUILDER_BIN=/Users/mpdh/.local/share/suiup/binaries/mainnet/site-builder-v2.10.0 \
  WALRUS_BINARY=/Users/mpdh/.local/share/suiup/binaries/mainnet/walrus-v1.49.1 \
  WALRUS_SITE_CONTEXT=testnet \
  WALRUS_SITE_EPOCHS=1 \
  ./scripts/deploy-walrus-site.sh
  ```
- Site object ID: `0x2e21836114d4f0a8fd3fd931bd6f13256a0fbe25e4d9cef1cb535c64b6542609`
- Note: `wal.app` only serves mainnet sites. Testnet site requires a self-hosted or third-party testnet portal.

## Mainnet Deploy Attempt
- Move package publish dry-run:
  - Command: `sui client publish move/wc_predict --dry-run --gas-budget 100000000 --json`
  - Result: passed.
  - Estimated gas: `35,820,000 MIST`.
  - Do not use dry-run package/object IDs for submission; they are simulation output.
- Command:
  ```bash
  SITE_BUILDER_BIN=/Users/mpdh/.local/share/suiup/binaries/mainnet/site-builder-v2.10.0 \
  WALRUS_BINARY=/Users/mpdh/.local/share/suiup/binaries/mainnet/walrus-v1.49.1 \
  WALRUS_SITE_CONTEXT=mainnet \
  WALRUS_SITE_EPOCHS=12 \
  ./scripts/deploy-walrus-site.sh
  ```
- Active deploy wallet: `0xf5ca4f02cf58d6448b6429c691b53c89c56b30c3ded38b45e73ce78829e99f6d`
- Mainnet SUI gas objects: none.
- Error: `could not find WAL coins with sufficient balance`.
- Contract publish is also blocked because the same mainnet wallet has no SUI gas object.

## Required To Finish wal.app
1. Fund deploy wallet on Sui mainnet with enough SUI gas and WAL.
2. Publish the Move package on mainnet and record package/object IDs.
3. Re-run the mainnet deploy command above.
4. Preserve the `object_id` written to `apps/web/dist/ws-resources.json` and copy it back into `apps/web/public/ws-resources.json` only for the production site object.
5. Configure SuiNS for the site object. The official Walrus Sites docs state `wal.app` browsing requires a SuiNS name for mainnet sites.
6. Convert site object ID to a base36 subdomain for diagnostics:
   ```bash
   site-builder --context mainnet convert <SITE_OBJECT_ID>
   ```
