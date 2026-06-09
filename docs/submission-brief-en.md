# Gil's VAR Shamebook — Submission Brief (English)

## 1) Project Snapshot
**Gil's VAR Shamebook** is an AI web app built for FIFA World Cup 2026 fandom with persistent, wallet-linked memory.

Users connect a Sui wallet, chat with **Gil**, place predictions, and receive personalized roast-style responses that reference their own memory history.  

Core promise: **you can verify the project works from links and object IDs** (not only from screenshots).

## 2) Core Features
- **Sui wallet identity**
  - Sign-in with wallet + session verification.
  - User identity is the Sui address.
- **Predictions & scoring**
  - Match result prediction, scoreline, MVP, worst player, champion, teams-advance.
  - Predictions are locked after kickoff.
  - Server oracle scores and updates leaderboard.
- **Walrus Memory**
  - Memory recall and memory write for user-level profiles.
  - Schedule + tournament memory synced to global namespace.
- **Gil notebook + before/after**
  - Viewable evidence panel showing what Gil remembers.
  - Before/after demonstration path for the memory criterion.
- **Leaderboard**
  - Realtime stream + polling fallback.
- **Roast wall**
  - Team and player roast actions backed by memory context.

## 3) Architecture Summary
- **Frontend:** React + Vite (Walrus Sites mainnet)
- **Backend:** Node/Hono + AI tools + wallet tx helpers
- **Memory:** Walrus Memory (main namespace strategy + global namespace for schedule)
- **On-chain:** Sui Move contract (`Prediction`, `OutputRecord`, `MatchRegistry`, `Scoreboard`)
- **Persistence/cache:** Supabase (Postgres) — non-canonical layer
- **Optional proof:** raw Walrus blob publish/anchor path where configured

## 4) Hackathon Fit
- Memory depth: before/after behavior and persistent recall.
- Technical execution: Move contract + indexer + AI + memory proof links.
- Creative tone: anti-generic sports-tabloid style with Gil mascot and roast card UX.

## 5) Mainnet Submission Proof
Final submission must use mainnet IDs and URLs only.

- Mainnet Sui deploy wallet: `0xf5ca4f02cf58d6448b6429c691b53c89c56b30c3ded38b45e73ce78829e99f6d`.
- Mainnet publish digest: `68d4RuFpzqNqzXgLum5KQFkd2qCRL137EkyS4YXpipv2`.
- Mainnet contract package ID: `0x2c9496db107257631c4bad0b8f97593a661f82df83b0bd84500bec57d7738beb`.
- Mainnet MatchRegistry object: `0xa992d65237ec8a953f04f0450c39203cc2777b2a67ae61add8c39f74578d3446`.
- Mainnet Scoreboard object: `0xfed0e2738f38965144bdcc840d4bf79ff0c9d75a9afd04753cd4f13c763cec10`.
- Mainnet AdminCap object: `0xd94e85b3a9e06ecd12b9c032412ffaa6d8d7044d9e97214621aad19528171c41`.
- Mainnet OracleCap object: `0x147d6290d21bd01d51a6cdafc2610cfcdb3d4272d7419d57d71df714fa90c25c`.
- Mainnet Walrus Site object: `0xd7b94c015080b56d9ba19e18112eb69bf5d40dff83158631cd455cd9860c0158`.
- Mainnet Walrus Sites base36 diagnostic: `5dk6jtcpgo39hujesoc658qum6wetenol3b5avm3qpuywq0qqg`.
- Mainnet `wal.app` URL / SuiNS name: `https://roast2026wc.wal.app/`.
- Walrus Memory / MemWal account: `0x416245a6d474f48e139e0ca6e3f6c89ae6edb9f15f2a6f0c2b5be1157fca2c51`.
- Walrus Memory relayer: `https://relayer.memory.walrus.xyz`.
- Walrus Memory global namespace: `daily-walrus:global:world-cup-2026`.
- Walrus Memory namespace URL: `https://relayer.memory.walrus.xyz/account/0x416245a6d474f48e139e0ca6e3f6c89ae6edb9f15f2a6f0c2b5be1157fca2c51/namespace/daily-walrus%3Aglobal%3Aworld-cup-2026`.
- Per-user memory namespace pattern used by the app: `daily-walrus:<sui-address>`.
- Mainnet memory sync evidence:
  - Schedule memory: `world_cup_schedule`, synced, content hash `a42baa72cf1e627c5330667f730600d239795a521489f52ffd24c4f5b075a5f5`, 104 fixtures, 104 open matches, updated `2026-06-09T17:06:13.109Z`.
  - Team/player memory: `world_cup_teams`, synced, content hash `9d561534f1179d30d76845bd862598a91597fa44673ed5cf93097f53987c16b7`, 48 teams, 1248 players, 49 memory docs, updated `2026-06-09T17:07:50.215Z`.
  - Player roast memory: `player_roast_traits`, synced, content hash `0061009a1c5ec8786f9b7e0c50691faa0f01c4a435decf67eff1a2bd56f8ac34`, 8 players, 8 memory docs, updated `2026-06-09T17:06:13.961Z`.
- Walrus team profile blobs: 48 published mainnet blob/object pairs. Full proof snapshot: `submission-pack/proof/mainnet-runtime-ids.json`.

Current public URL status: `https://roast2026wc.wal.app/` is live and points to the mainnet Walrus Site object above.

Mainnet fixture seed status: 104/104 World Cup fixtures registered in the mainnet MatchRegistry. Example txs:
- Match 1 register: `DXfbZj4U89VgBAxnm2qRAJo5hevwdxHKwW6b3cYh7WXS`
- Match 2 register: `3FzSbYBjEgSswFsRqUk7LmK6sob4ioSxpNsiUvg2XUBB`
- Match 104 register: `3vkHeidnmnYxJe3a9vc1hXTEzWAngv44L4robPxiVSub`

## 6) Judge Verification Trail
- `/api/tracking/runtime` page contains:
  - chain IDs,
  - memory sync status,
  - runtime checkpoint counters,
  - open links to inspect objects.
- Output objects for actions (chat/roast/prediction) can be verified by tx and object hashes.
- Team schedule and squad content are traceable through seeded data + namespace memory sync.

## 7) Internal Testnet Verification
These IDs prove the flow was tested before mainnet. Do not paste them into the final submission form as production proof.

- Testnet Walrus Site object: `0x2e21836114d4f0a8fd3fd931bd6f13256a0fbe25e4d9cef1cb535c64b6542609`.
- Testnet contract package ID: `0x4e62c20fc179f4492d777046dccd06eebd0cedaa83511ea8fde7b8262c6a58a5`.
- Testnet verification txs:
  - Register match 2: `EwoVCHWDi74dvMzUx8SYV7JBYvw2HkdRJ6comjQ954v1`
  - Submit prediction: `5gcAboVBXyqf5te9rUuJ3ac9AfFkmHaXNZ9SqZsf18Wi`
  - Record score: `5JP9TNpV1LfyGhtzw3tnz4S269P29iowu9zzuRiJAVUw`
  - Settle match 2: `7xhVSDGbR5wocVs8iNMVgB4ZgMSAshZ4uyqX93LtdRDw`

## 8) Submission Outputs (Ready to Attach)
- Demo video ≤ 3:00 (record a real walkthrough after SuiNS/public URL is connected)
- Poster (vertical + optional horizontal)
- Screenshots pack:
  - home / predictions / leaderboard / roasts / team profiles / gallery / notebook / tracking
- Logo package (icon + wordmark)
- GitHub repo and live Walrus URL
- Poster: `apps/web/public/submission/poster-sketchnote.png`
- Storage and memory explainer: `apps/web/public/submission/storage-memory-explainer.pdf`
- Short design PDF: `docs/high-level-design-requirements.pdf`

## 9) Contact
- Built by: **R-AI Daily Walrus Team**
- Contact: GitHub profile and project maintainer email in the repo README or submit form.
