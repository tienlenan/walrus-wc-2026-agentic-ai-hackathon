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

## 5) Verification Trail
- `/api/tracking/runtime` page contains:
  - chain IDs,
  - memory sync status,
  - runtime checkpoint counters,
  - open links to inspect objects.
- Output objects for actions (chat/roast/prediction) can be verified by tx and object hashes.
- Team schedule and squad content are traceable through seeded data + namespace memory sync.

## 6) Submission Outputs (Ready to Attach)
- Demo video ≤ 3:00
- Poster (vertical + optional horizontal)
- Screenshots pack:
  - home / predictions / leaderboard / notebook / tracking / team profiles
- Logo package (icon + wordmark)
- GitHub repo and live Walrus URL

## 7) Contact
- Built by: **R-AI Daily Walrus Team**
- Contact: GitHub profile and project maintainer email in the repo README or submit form.
