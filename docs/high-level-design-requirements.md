# The Daily Walrus - High-Level System Design

This file is the short English design and requirements note for submission. The PDF export is:

- `docs/high-level-design-requirements.pdf`

It is intentionally different from the storage explainer:

- `apps/web/public/submission/storage-memory-explainer.pdf` explains how Walrus Blob, Walrus Memory, and Sui Objects split storage responsibilities.
- `docs/high-level-design-requirements.pdf` explains the system architecture, component boundaries, and signed action/data flows.

## System Canvas

The app has four main runtime zones:

| Zone | Responsibility | Proof surface |
|---|---|---|
| Wallet + Web SPA | Connect wallet, sign actions, render prediction/chat/tracking UI | Connected Sui address and signed transactions |
| Gil Agent API | Mastra tools for fixtures, predictions, memory recall, roasts, and output anchoring | Runtime tracking API and generated output records |
| Walrus | Blob payloads, gallery media, team/player data, global memory, wallet memory | Blob IDs, Walrus Site URL, Walrus Memory namespace |
| Sui | Prediction gates, settlement, score records, output proof objects | Package/object IDs, transaction digests, content hashes |

Supabase is only an index/cache for fast UI reads and leaderboard queries. It is not the canonical memory store.

## Data Flow

Prediction flow:

1. Wallet connects and signs prediction for an open match.
2. Sui stores the prediction object and lock/settlement state.
3. Walrus Memory stores the user's take for future Gil recall and roasts.
4. Result oracle/seed settles the match and updates score objects.
5. The leaderboard reads indexed proof state.

Chat and roast flow:

1. Agent recalls global schedule/team/player data and wallet notebook data from Walrus Memory.
2. Gil generates a fixture answer, team profile answer, or roast.
3. Important output payloads can be stored on Walrus Blob.
4. Sui `OutputRecord` anchors blob ID and content hash.
5. Runtime Tracking exposes the proof links.

Global memory flow:

1. Fixture schedule, groups, teams, venues, flags, coaches, squads, and player roast traits are seeded into a global namespace.
2. Postponed fixtures, knockout pairings, and final results update the same namespace.
3. Gil answers schedule/team questions from memory instead of hardcoded page text.

## Requirements Fit

- Persistent AI memory: Walrus Memory stores global and wallet-scoped recall.
- Verifiable outputs: Sui objects store public receipts and pointers to Walrus payloads.
- Prediction integrity: match gates close before kickoff and settle after result seed/oracle update.
- Submission tracking: a dedicated tracking page lists deployed package, object, memory, blob, and site links.
