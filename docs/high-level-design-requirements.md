# The Daily Walrus - Storage and Memory Explainer

This is the short submission design note for judges.

## Core Idea

The Daily Walrus separates evidence into three layers:

| Layer | What it stores | Why it exists |
|---|---|---|
| Walrus Blob | Immutable payloads and media: team profiles, gallery art, output JSON | Stores the actual data |
| Walrus Memory | Recallable knowledge: global fixtures, teams, players, roast traits, user notebook | Gives Gil persistent memory |
| Sui Objects | Public receipts: predictions, scoreboard, match registry, output records | Proves actions, gates, and pointers |

Important distinction: a Walrus blob is not stored inside Sui. Sui stores the receipt: object ID, blob ID, content hash, score, prediction gate, or pointer.

## Memory Model

Static/global memory is shared by everyone:

- World Cup 2026 fixture schedule.
- Groups, venues, kickoff locks, result updates.
- Team profiles: coach, flag, squad list.
- Player roast traits for famous football habits.
- Updated when results, postponements, or knockout fixtures change.

User/wallet memory is scoped by Sui address:

- Chat history and favorite teams.
- Prediction behavior and previous bad takes.
- Roasts Gil already delivered.
- Notebook recall for the connected Sui address.

## Signed Action Lifecycle

1. Connect wallet and verify identity.
2. Sign the prediction or output action.
3. Store payload or memory on Walrus.
4. Anchor hash, pointer, score, or gate in a Sui object.
5. Expose proof links through Runtime Tracking.

Prediction actions sign a Sui transaction. Chat, roast, and notebook actions require a verified wallet session; important generated outputs can be stored as Walrus blob payloads and anchored by a Sui `OutputRecord`.

## Submission Files

- Visual explainer source: `apps/web/public/submission/storage-memory-explainer.html`
- Visual explainer PDF: `apps/web/public/submission/storage-memory-explainer.pdf`
- Page images:
  - `apps/web/public/submission/storage-memory-explainer-page-1.png`
  - `apps/web/public/submission/storage-memory-explainer-page-2.png`

