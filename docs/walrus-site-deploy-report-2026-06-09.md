# Walrus Sites Deploy Report — 2026-06-09

## Result
- Testnet Walrus Sites deploy: passed.
- Mainnet Walrus Sites deploy: passed after funding.
- Public `wal.app` browsing is live at `https://roast2026wc.wal.app/`.
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

## Mainnet Deploy
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
- Publish digest: `68d4RuFpzqNqzXgLum5KQFkd2qCRL137EkyS4YXpipv2`
- Package: `0x2c9496db107257631c4bad0b8f97593a661f82df83b0bd84500bec57d7738beb`
- MatchRegistry: `0xa992d65237ec8a953f04f0450c39203cc2777b2a67ae61add8c39f74578d3446`
- Scoreboard: `0xfed0e2738f38965144bdcc840d4bf79ff0c9d75a9afd04753cd4f13c763cec10`
- Mainnet Walrus Site object: `0xd7b94c015080b56d9ba19e18112eb69bf5d40dff83158631cd455cd9860c0158`
- Base36 diagnostic: `5dk6jtcpgo39hujesoc658qum6wetenol3b5avm3qpuywq0qqg`
- Fixture seed: 104/104 registered on mainnet.

## Public URL Notes
1. Public URL is live: `https://roast2026wc.wal.app/`.
2. Convert site object ID to a base36 subdomain only for diagnostics:
   ```bash
   site-builder --context mainnet convert <SITE_OBJECT_ID>
   ```
3. Record a real sub-3-minute demo video from the public URL.
