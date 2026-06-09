# The Daily Walrus — Submission Brief (English)

## 1) Project Snapshot
**The Daily Walrus** is an AI web app built for FIFA World Cup 2026 fandom with persistent, wallet-linked memory.

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
- Mainnet contract package ID: `TBD after mainnet publish`.
- Mainnet MatchRegistry object: `TBD after mainnet publish`.
- Mainnet Scoreboard object: `TBD after mainnet publish`.
- Mainnet Walrus Site object: `TBD after mainnet Walrus Sites deploy`.
- Mainnet `wal.app` URL / SuiNS name: `TBD after SuiNS is configured for the site object`.
- Walrus Memory namespaces:
  - Global schedule memory: `daily-walrus:global:world-cup-2026`.
  - Per-user memory: `daily-walrus:user:<sui-address>`.

Current blocker: the deploy wallet has no mainnet SUI gas objects and no usable WAL balance, so mainnet package publish and Walrus Sites deploy cannot complete from this wallet yet. Mainnet publish dry-run passes with estimated gas `35,820,000 MIST`; dry-run object IDs are simulation-only and must not be submitted.

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
- Demo video ≤ 3:00
- Poster (vertical + optional horizontal)
- Screenshots pack:
  - home / predictions / leaderboard / notebook / tracking / team profiles
- Logo package (icon + wordmark)
- GitHub repo and live Walrus URL
- Poster: `apps/web/public/submission/poster-vertical.svg`

## 9) Contact
- Built by: **R-AI Daily Walrus Team**
- Contact: GitHub profile and project maintainer email in the repo README or submit form.
