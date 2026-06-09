# The Daily Walrus — High-Level Design & Requirements

## Product
The Daily Walrus is a World Cup 2026 prediction and roast app powered by Sui, Walrus Memory, Walrus blobs, and an AI pundit named Gil.

Users connect a Sui wallet, ask Gil about fixtures, submit predictions, vote for MVP/worst player, and receive roast-style feedback. Gil remembers user behavior through Walrus Memory and exposes tracking links for judges.

## Core Requirements
- Wallet connection is required for write actions: chat, predictions, votes, roasts, and output proofs.
- Fixtures must be gated on-chain. Predictions are open only before kickoff and before settlement.
- User memories and global football knowledge must be stored through Walrus Memory.
- Generated outputs must be anchored by Sui OutputRecord objects and optional Walrus blob pointers.
- Runtime tracking must show contracts, Walrus blobs, memory sync status, and fixture gate counters.
- Submission artifacts must use English copy and mainnet proof once the deploy wallet is funded.

## Architecture
- Frontend: React + Vite, designed for Walrus Sites.
- Server: Node HTTP service with Gil chat, roast engine, Sui helpers, scoring, and sync jobs.
- On-chain: Sui Move package for MatchRegistry, Scoreboard, Prediction, and OutputRecord objects.
- Memory: MemWal namespaces for user notebooks and the global World Cup knowledge spine.
- Data cache: Supabase/Postgres for rebuildable app indexes, leaderboards, fixtures, and tracking rows.
- Blob layer: Walrus blobs for publishable proof payloads, team profiles, gallery assets, and memory snapshots.

## Memory Layers
- User memory: `daily-walrus:user:<sui-address>`.
- Global schedule memory: `daily-walrus:global:world-cup-2026`, `world_cup_schedule`.
- Team/player profile memory: `world_cup_teams`.
- Player roast traits memory: `player_roast_traits`.

The player roast trait layer stores public on-field joke material separately from factual team/squad data. Each trait includes evidence, roast angles, safe one-liners, and avoid rules so Gil can be funny without fabricating private claims.

## Current Testnet Proof
- Fixture registration: 104/104 fixtures registered on testnet.
- Player roast trait memory: 8 player profiles synced.
- Player roast trait Walrus blob: `TFT-5KpH07fTI83PdZ_i6869RNzG2aj_d_YxbiBjSHw`.
- Player roast trait Walrus object: `0x6c5c938a0a04b190498ce19253a0caf27b86e4a592381cc7f3cb249f7ed8312a`.

## Mainnet Status
Mainnet deployment is still blocked by the deploy wallet lacking mainnet SUI gas and WAL. Final submission must replace all testnet IDs with mainnet package, object, blob, Walrus Site, and `wal.app` references.

## Verification Path
1. Open the app and connect a Sui wallet.
2. Ask Gil about a fixture or player roast.
3. Submit a prediction while the match gate is open.
4. Open tracking to inspect contract IDs, memory status, and Walrus blob links.
5. After settlement, confirm prediction locks, scoring, leaderboard updates, and refreshed global memory.
