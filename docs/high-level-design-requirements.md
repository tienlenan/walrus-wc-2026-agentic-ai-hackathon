# Gil's VAR Shamebook - High-Level System Design

This file is the short English design and requirements note for submission. The PDF export is:

- `docs/high-level-design-requirements.pdf`

It is intentionally different from the storage explainer:

- `apps/web/public/submission/storage-memory-explainer.pdf` explains how Walrus Blob, Walrus Memory, and Sui Objects split storage responsibilities.
- `docs/high-level-design-requirements.pdf` explains the tabloid-style system architecture, component boundaries, and signed action/data flows.

## System Canvas

The app has four main runtime zones:

| Zone | Responsibility | Proof surface |
|---|---|---|
| Wallet + Web SPA | Connect wallet, sign actions, render prediction/chat/tracking UI | Connected Sui address and signed transactions |
| Gil Agent API | Mastra tools for fixtures, team profiles, predictions, memory recall, roasts, and output anchoring | Runtime tracking API and generated output records |
| Walrus | Blob payloads, gallery media, team/player data, global memory, wallet memory | Blob IDs, Walrus Site URL, Walrus Memory namespace |
| Sui | Prediction gates, settlement, score records, output proof objects | Package/object IDs, transaction digests, content hashes |
| Daily What's Up Pipeline | Orchestrator, scout, synthesizer, writer, moderator, publisher | Agent trace, novelty score, Walrus blob, briefing memory namespace |

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
2. Deterministic tool routing returns typed JSON parts for fixture and team-profile requests.
3. Gil generates Markdown text around the structured tool context.
4. The web UI renders Markdown with Streamdown and typed parts as native cards.
5. Important output payloads can be stored on Walrus Blob.
6. Sui `OutputRecord` anchors blob ID and content hash.
7. Runtime Tracking exposes the proof links.

Global memory flow:

1. Fixture schedule, groups, teams, venues, flags, coaches, squads, and player roast traits are seeded into a global namespace.
2. Postponed fixtures, knockout pairings, and final results update the same namespace.
3. Gil answers schedule/team questions from memory instead of hardcoded page text.

Daily What's Up editorial memory flow:

1. Orchestrator loads recent published summaries from `daily-walrus:global:world-cup-2026:briefings`.
2. Scout collects schedule/team/player/source facts.
3. Synthesizer and writer build a fresh article while avoiding previous angles.
4. Novelty check compares the draft against briefing memory.
5. Duplicate-risk drafts are rejected and re-scouted up to three attempts.
6. Publisher stores full article JSON on Walrus Blob, remembers a short summary in the briefing namespace, indexes the UI row, and optionally anchors a Sui `OutputRecord`.

## Requirements Fit

- Persistent AI memory: Walrus Memory stores global and wallet-scoped recall.
- Verifiable outputs: Sui objects store public receipts and pointers to Walrus payloads.
- Prediction integrity: match gates close before kickoff and settle after result seed/oracle update.
- Submission tracking: a dedicated tracking page lists deployed package, object, memory, blob, and site links.
- Perceived performance: a lightweight splash and top progress bar cover initial bundle load and lazy route transitions.
- Agentic content quality: Daily What's Up loads editorial memory and avoids repeating published angles before it writes.

## Mainnet Proof Snapshot

- Public app: `https://roast2026wc.wal.app/`
- API: `https://gil-var-shamebook-api.vercel.app/`
- Walrus Site object: `0xd7b94c015080b56d9ba19e18112eb69bf5d40dff83158631cd455cd9860c0158`
- Sui package: `0x2c9496db107257631c4bad0b8f97593a661f82df83b0bd84500bec57d7738beb`
- MatchRegistry: `0xa992d65237ec8a953f04f0450c39203cc2777b2a67ae61add8c39f74578d3446`
- Scoreboard: `0xfed0e2738f38965144bdcc840d4bf79ff0c9d75a9afd04753cd4f13c763cec10`
- Walrus Memory account: `0x416245a6d474f48e139e0ca6e3f6c89ae6edb9f15f2a6f0c2b5be1157fca2c51`
- Walrus Memory namespace: `daily-walrus:global:world-cup-2026`
- Walrus briefing memory namespace: `daily-walrus:global:world-cup-2026:briefings`
- Latest Daily What's Up blob: `w-M8jICdQOW-HE2GAwsuAUJRn3DgakvT82cYXXFZ11E`
- Latest Daily What's Up object: `0x8191c033c28fe4876f71bb136bfcfa7b4165f3de203f058b3abbb7afaf6d6035`
- Latest Daily What's Up content hash: `bad2146329f579b70c108936be3900591c6239935b1c33d1326810b2bd98b56b`
- Latest Daily What's Up Sui receipt: `D23CGDAVV8AjCs7Mvox1AUb2hvxsXGi43BBsM3MsQ753`
- Latest Daily What's Up novelty proof: `previousBriefings=1`, `score=0.025`, `duplicate=false`
- Team profile blobs: 48/48 published on Walrus Mainnet.
