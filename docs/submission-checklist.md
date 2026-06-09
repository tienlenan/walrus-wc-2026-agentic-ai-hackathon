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
- Mainnet contract package ID: `TBD after mainnet publish`.
- Mainnet MatchRegistry: `TBD after mainnet publish`.
- Mainnet Scoreboard: `TBD after mainnet publish`.
- Mainnet Walrus Site object: `TBD after mainnet Walrus Sites deploy`.
- Mainnet `wal.app` URL / SuiNS: `TBD after SuiNS is configured for the site object`.
- Memory namespace(es): `daily-walrus:global:world-cup-2026` plus per-user `daily-walrus:user:<sui-address>`
- Track ID / session evidence
- Short verification note: "How a judge can verify memory + scoring in 3 clicks"
- Do not use testnet object IDs in the final form.

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
- Poster (English): 1080x1350 (default) and 1200x630 (optional)
  - `apps/web/public/submission/poster-vertical.svg`
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
  - `screenshot-before-after.png`
- Demo video:
  - Duration < 3 minutes
  - Show: connect wallet → submit prediction → settle flow → leaderboard update → memory proof page

## Mainnet Blocker
- Active deploy wallet currently has no mainnet SUI gas objects.
- Mainnet Walrus Sites deploy also fails until the wallet has enough WAL.
- After funding, run `./scripts/deploy-walrus-site.sh` with `WALRUS_SITE_CONTEXT=mainnet`.

## Post-Submit Actions
- Post link with `#Walrus` on X.
- Join Walrus Discord and share demo.
- Keep-alive checklist active for judging period (backend + Supabase heartbeat).
