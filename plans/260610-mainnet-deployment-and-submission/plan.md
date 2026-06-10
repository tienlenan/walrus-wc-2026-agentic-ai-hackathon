---
title: Mainnet Deployment & Submission Readiness
description: >-
  Finish hardening, test every path on Sui testnet, deploy web/server to Walrus
  Sites mainnet with public domain, and prepare complete hackathon submission
  materials.
status: in-progress
priority: P1
branch: main
tags:
  - walrus
  - sui
  - deploy
  - submission
blockedBy:
  - 260610-overflow-agentic-daily-briefings
blocks: []
created: '2026-06-09T00:00:00.000Z'
createdBy: ct
source: skill
---

# Mainnet Deployment & Submission Readiness

## Overview
Finalize The Daily Walrus as a public release candidate. The work is split into four
hard gates:

1. technical preflight that must pass before any production deploy,
2. repeatable testnet verification against existing endpoints,
3. mainnet cutover (Walrus Site + backend) with domain and monitorability,
4. submission package (forms, video, screenshots, logo, docs, proof links).

## Phases

| Phase | Name | Status |
|---|---|---|
| 1 | [Preflight Audit](./phase-01-preflight-audit.md) | Completed |
| 2 | [Testnet Verification](./phase-02-testnet-verification.md) | Completed |
| 3 | [Mainnet Domain Deployment](./phase-03-mainnet-deploy.md) | In Progress |
| 4 | [Submission Pack](./phase-04-submission-pack.md) | pending |
| 5 | [Go-Live Gate](./phase-05-go-live-gate.md) | pending |

## Success Criteria
- All green in `Preflight Audit` and `Testnet Verification`.
- Mainnet contract/package IDs updated and confirmed in `#tracking`.
- Walrus mainnet deployment returns expected route behavior and object links.
- All hackathon submission artifacts prepared in English (design brief + feature brief + media checklist).
- No critical public bug blocking wallet flow, prediction flow, or memory read/write path.

## Scope
- Must include contract, server, web, and publish metadata; no functional scope expansion.
- Keep current team profile and prediction stack; avoid major feature rewrites during freeze.
- Only stretch/optional items:
  - image generation on every roast event,
  - per-user MemWal onboarding if testnet/mainnet gas model remains unstable.

## Risks
- Testnet package missing `OutputRecord` and required on-chain fields if publish drift.
- Gas policy on mainnet causes sponsored/keeper flow to fail during public judging.
- Walrus Sites config/route mismatch (SPA 404 after deep links).
- Incomplete submission assets for judges to verify memory/state quickly.
