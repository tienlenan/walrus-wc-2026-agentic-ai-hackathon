# Hackathon Submission Checklist (English)

## Required Forms
- Walrus Memory World Cup page: https://thewalrussessions.wal.app/memory-world-cup/index.html
- Airtable submission form: https://airtable.com/appoDAKpC74UOqoDa/shrIl2BMnzMwpuLhO

## Project Metadata to Fill
- Project name
- One-sentence description (English)
- Logo
- Website (Walrus Sites URL)
- Social/contact
- GitHub repository
- Team members / wallet addresses

## Mainnet Proof Fields (pre-fill before submit)
- Sui network: `mainnet`.
- Deploy wallet: `0xf5ca4f02cf58d6448b6429c691b53c89c56b30c3ded38b45e73ce78829e99f6d`.
- Mainnet publish digest: `68d4RuFpzqNqzXgLum5KQFkd2qCRL137EkyS4YXpipv2`.
- Mainnet contract package ID: `0x2c9496db107257631c4bad0b8f97593a661f82df83b0bd84500bec57d7738beb`.
- Mainnet MatchRegistry: `0xa992d65237ec8a953f04f0450c39203cc2777b2a67ae61add8c39f74578d3446`.
- Mainnet Scoreboard: `0xfed0e2738f38965144bdcc840d4bf79ff0c9d75a9afd04753cd4f13c763cec10`.
- Mainnet AdminCap: `0xd94e85b3a9e06ecd12b9c032412ffaa6d8d7044d9e97214621aad19528171c41`.
- Mainnet OracleCap: `0x147d6290d21bd01d51a6cdafc2610cfcdb3d4272d7419d57d71df714fa90c25c`.
- Mainnet Walrus Site object: `0xd7b94c015080b56d9ba19e18112eb69bf5d40dff83158631cd455cd9860c0158`.
- Mainnet Walrus Sites base36 diagnostic: `5dk6jtcpgo39hujesoc658qum6wetenol3b5avm3qpuywq0qqg`.
- Mainnet `wal.app` URL / SuiNS: `TBD after SuiNS is configured for the site object`.
- Memory namespace(es): `daily-walrus:global:world-cup-2026` plus per-user `daily-walrus:user:<sui-address>`
- Track ID / session evidence
- Short verification note: "How a judge can verify memory + scoring in 3 clicks"
- Do not use testnet object IDs in the final form.

## Mainnet Fixture Seed
- Mainnet MatchRegistry content verified with `match_count=104`.
- Match 1 register tx: `DXfbZj4U89VgBAxnm2qRAJo5hevwdxHKwW6b3cYh7WXS`
- Match 2 register tx: `3FzSbYBjEgSswFsRqUk7LmK6sob4ioSxpNsiUvg2XUBB`
- Match 104 register tx: `3vkHeidnmnYxJe3a9vc1hXTEzWAngv44L4robPxiVSub`

## Internal Testnet Verification
- Testnet contract package ID: `0x4e62c20fc179f4492d777046dccd06eebd0cedaa83511ea8fde7b8262c6a58a5`
- Testnet MatchRegistry: `0x80397659cc299b6e6d2e8b3849a25fb695a498f18e5fcd82b50b8d5d577e349f`
- Testnet Scoreboard: `0x18b4c86498ca88289e0c05bc1a0c58eaca21a8b74fb6bff4a2c882af6adc39fb`
- Testnet Walrus Site object: `0x2e21836114d4f0a8fd3fd931bd6f13256a0fbe25e4d9cef1cb535c64b6542609`
- Testnet txs:
  - Register match 2: `EwoVCHWDi74dvMzUx8SYV7JBYvw2HkdRJ6comjQ954v1`
  - Submit prediction: `5gcAboVBXyqf5te9rUuJ3ac9AfFkmHaXNZ9SqZsf18Wi`
  - Record score: `5JP9TNpV1LfyGhtzw3tnz4S269P29iowu9zzuRiJAVUw`
  - Settle match 2: `7xhVSDGbR5wocVs8iNMVgB4ZgMSAshZ4uyqX93LtdRDw`

## Media Checklist
- Poster (English sketchnote style)
  - `apps/web/public/submission/poster-sketchnote.png`
  - `apps/web/public/submission/poster-sketchnote.pdf`
  - Source: `apps/web/public/submission/poster-sketchnote.html`
- Storage / memory explainer
  - `apps/web/public/submission/storage-memory-explainer.pdf`
  - `apps/web/public/submission/storage-memory-explainer-page-1.png`
  - `apps/web/public/submission/storage-memory-explainer-page-2.png`
- Logo package:
  - `logo/icon.svg`
  - `logo/wordmark.svg`
  - `logo/favicon.ico` (optional)
- Screenshots:
  - `screenshot-home.png`
  - `screenshot-predictions.png`
  - `screenshot-leaderboard.png`
  - `screenshot-notebook.png`
  - `screenshot-tracking.png`
  - `screenshot-team-profiles.png`
  - `screenshot-gallery.png`
  - `screenshot-roasts.png`
- Demo video:
  - Duration < 3 minutes
  - Show: connect wallet → submit prediction → settle flow → leaderboard update → memory proof page

## Remaining Mainnet Blocker
- Sui contract is published on mainnet.
- Walrus Sites object is deployed on mainnet.
- Public `wal.app` browsing still needs a SuiNS name pointed at site object `0xd7b94c015080b56d9ba19e18112eb69bf5d40dff83158631cd455cd9860c0158`.
- After SuiNS is configured, record a real sub-3-minute demo video and paste the final public URL into Airtable.

## Post-Submit Actions
- Post link with `#Walrus` on X.
- Join Walrus Discord and share demo.
- Keep-alive checklist active for judging period (backend + Supabase heartbeat).
