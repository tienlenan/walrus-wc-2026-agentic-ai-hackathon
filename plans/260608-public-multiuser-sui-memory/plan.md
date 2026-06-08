---
title: >-
  M3: Public multi-user — Sui auth, on-chain predictions/scoring, per-user
  Walrus Memory
description: >-
  Public multi-user WC2026 app: Sui wallet/zkLogin auth, Move contract for
  predictions+scoring, per-user Walrus Memory, event-indexed leaderboard, Gil
  troll mechanics.
status: pending
priority: P2
branch: main
tags:
  - sui
  - move
  - zklogin
  - walrus-memory
  - hackathon
blockedBy: []
blocks: []
created: '2026-06-08T11:37:36.763Z'
createdBy: 'ck:plan'
source: skill
---

# M3: Public multi-user — Sui auth, on-chain predictions/scoring, per-user Walrus Memory

## Overview
Biến The Daily Walrus (demo 1 user) thành **public multi-user app** xoay quanh Walrus Memory:
- Mỗi user **đăng nhập bằng ví Sui hoặc Google (zkLogin)** → địa chỉ Sui = danh tính (`resourceId`).
- **Predictions + scoring on-chain** bằng Sui Move contract (kết quả trận, MVP, cầu thủ tệ, vô địch, đội đi tiếp).
- **Mỗi user sở hữu MemWalAccount riêng** (ví họ làm owner) + app giữ delegate key để Gil ghi/đọc hộ → memory THẬT SỰ thuộc về user.
- **Leaderboard** dựng từ event on-chain → Supabase (cache + realtime).
- **Realtime Roast Engine ⭐:** Gil roast cầu thủ/đội **theo thời gian thực** (live match events + web fetch tin tức nạp DB) → tự sinh **content + ảnh troll AI**; cà khịa dựa trên thành tích on-chain + ký ức Walrus.

## Quyết định chốt (research + user)
| Vấn đề | Quyết định |
|---|---|
| Mạng | Contract: **Sui Testnet** (dev/demo, gas free faucet) → **Mainnet khi nộp** (Phase 8). Memory + site: **Mainnet** |
| Gas | **Sponsored-first** qua **gas-station của app** (ví sponsor funded) tới hạn mức free → **fallback user tự trả gas** (dapp-kit) |
| Auth | `@mysten/dapp-kit` (ví) + `@mysten/enoki` (Google→zkLogin). 1 identity = `useCurrentAccount().address` |
| MVP / cầu thủ tệ | **Hybrid**: seed từ rating API-Football + user vote/override |
| Memory ownership | **User-owned** MemWalAccount + app delegate key (mỗi user 1 account) |
| Data | **API-Football** free (fixtures/results/ratings) + openfootball fallback |
| Roast (ngôi sao) | **Realtime**: live events + web fetch → content + **ảnh troll AI** (Gemini Nano Banana/Imagen) |
| Ảnh troll — IP | **KHÔNG mặt/logo/áo đấu thật** → mascot Gil/caricature/text-meme + motif generic; guardrail nội dung vui |

## Storage split (nguồn chân lý)
| Data | Primary | Cache/Index |
|---|---|---|
| Identity | Sui address | Supabase `users` |
| Predictions | **Sui Move contract** (owned `Prediction`) | Supabase mirror (event) |
| Scoring / points / streak | **Sui Move contract** — shared `Scoreboard` ghi bởi **OracleCap** (server-driven) | Supabase mirror |
| Leaderboard | derived từ events | Supabase view + realtime |
| Agent memory | **Walrus Memory (MemWal)** ⭐ | Supabase `walrus_index` (pointers) |
| Fixtures / results | API-Football → on-chain chỉ outcome (oracle) | Supabase `fixtures` |

> Nguyên tắc: **Sui contract = truth cho predictions/scoring · Walrus Memory = ngôi sao cho ký ức · Supabase = index/cache dựng lại được.**

## Architecture (flow)
```
Browser (React+Vite → Walrus Sites)
  dapp-kit + Enoki  →  địa chỉ Sui = identity
     │ build tx (kind-only)              │ chat (remember/recall)
     ▼                                   ▼
Node server (tsx)  ── sponsor gas (gas-station) / fallback user-pays
  ├─ Move calls: submit_prediction / score_prediction   → Sui Move contract (truth, events)
  ├─ Gil (Gemini) + chat-with-gil                       → Walrus Memory (per-user MemWalAccount) ⭐
  └─ oracle: settle_match (kết quả từ API-Football)
        events │
        ▼
  Indexer (queryEvents) → Supabase (predictions mirror, leaderboard, fixtures, walrus_index) → realtime UI
```

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Auth & Identity](./phase-01-auth-identity.md) | Pending |
| 2 | [Move Contract](./phase-02-move-contract.md) | Pending |
| 3 | [Per-User Walrus Memory](./phase-03-per-user-walrus-memory.md) | Pending |
| 4 | [WC2026 Data & Oracle](./phase-04-wc2026-data-oracle.md) | Pending |
| 5 | [Predictions & Scoring](./phase-05-predictions-scoring.md) | Pending |
| 6 | [Leaderboard & Indexer](./phase-06-leaderboard-indexer.md) | Pending |
| 7 | [Realtime Roast Engine ⭐](./phase-07-realtime-roast-engine.md) | Pending |
| 8 | [Deploy & Submission](./phase-08-deploy-submission.md) | Pending |

## Dependencies
- P1 (Auth) → nền cho P3, P5 (cần identity + sponsored tx).
- P2 (Contract) → nền cho P4, P5, P6 (cần package id + entry fns + events).
- P3 (Memory) dùng identity (P1) — chuyển memwal-client sang per-user.
- P4 (Data/Oracle) → nền cho scoring (P5) — cần kết quả on-chain.
- P5 (Predictions/Scoring) → P6 (leaderboard từ events).
- **P7 (Realtime Roast Engine ⭐)** dùng live data (P4) + memory (P3) [+ record P5/P6 khi roast theo thành tích].
- P8 (Deploy & Submission) cuối — gom tất cả, deploy Walrus Mainnet, before/after, nộp bài.

## Rủi ro chính
- **Enoki sponsored mainnet** quota lớn = $120/mo → tự host **gas-station** (ví sponsor funded) kiểm soát quota; fallback user-pays. Pin chi phí.
- **API-Football rating** chỉ có sau khi trận đá (~11/6) → MVP/worst hybrid (vote) làm fallback.
- **Move contract mới** → test kỹ (`sui move test`); oracle key = điểm tin cậy tập trung (chấp nhận cho hackathon, dùng OracleCap tách AdminCap).
- **MemWal user-owned**: onboard 2 tx (createAccount + addDelegateKey) → sponsored để gasless.
- **Timeline**: ≥4 ngày memory tích luỹ vẫn là đường găng → giữ Gil memory chạy sớm (P3 ưu tiên).

## Tham chiếu
- Research reports: `plans/reports/` (Sui auth, Move contract, data/storage — nếu lưu).
- Docs hiện có: `docs/03-architecture.md`, `docs/06-research-notes.md`.
- MemWal mainnet: PACKAGE_ID `0xcee7a6…a24c6`, REGISTRY_ID `0x0da982…a7edd`.

## Pre-flight (GATING — làm TRƯỚC mọi phase M3)
1. **Verify memory loop hiện có** (namespace single-account) end-to-end (close task #16/#18); GIỮ làm fallback luôn-chạy; bắt đầu accrual ≥4 ngày NGAY (đường găng).
2. **Spike A** — Enoki-zkLogin ký → gas-station tự host sponsor → tx land (test/mainnet); xác nhận owned object chỉ owner ký được. Pin: gas-station vs Enoki paid.
3. **Spike B** — MemWal SDK có trả unsigned `Transaction` cho `create_account`/`add_delegate_key`? Nếu KHÔNG → user-owned account = stretch, giữ namespace.
4. **Spike C** — có HTTP endpoint Imagen/Gemini-image + key + storage không? (Phase 7 stretch.)

**Spike results (2026-06-08):**
- ✅ **B resolved:** `createAccount`/`addDelegateKey` tự ký nội bộ (`signAndExecute`), KHÔNG trả PTB — nhưng Move entry rõ (`{pkg}::account::create_account(registry, clock)`, `add_delegate_key(...)`) → **hand-roll kind-only PTB** được → sponsored/zkLogin onboarding KHẢ THI. (Finding #2 hạ cấp; giữ namespace fallback.)
- ✅ **C resolved:** AI Gateway có image models server-callable cùng `AI_GATEWAY_API_KEY` (`google/imagen-4.0-generate-001`, `gemini-2.5-flash-image`, `openai/gpt-image-1`) → gen ảnh qua ai-sdk `experimental_generateImage`, KHÔNG cần key mới. (Finding #8 hạ cấp; vẫn stretch theo scope.)
- ⏳ **A pending** (Enoki/gas-station/zkLogin trên testnet); **memory verify (#1)** chờ provision MemWal account (funding/browser-login).

## Quyết định scope (user, 2026-06-08)
- **Balanced:** memory-first (verify + namespace fallback) → giữ on-chain predictions/scoring + zkLogin/ví + roast **text/HTML card**; **realtime AI gen ảnh = STRETCH** (sau Spike C).
- **Scoring:** **Shared `Scoreboard` + OracleCap** — server grade off-chain rồi GHI điểm on-chain (không cần user ký score).
- **Contract testnet-first (user, 2026-06-08):** build/test/deploy contract trên **Sui Testnet** trước (gas free → dev/demo gasless, **bỏ SPOF ví sponsor mainnet** → giải red-team #4/#10 lúc dev); **migrate Mainnet ở Phase 8** khi nộp. ⇒ Phase 1 gas-station/sponsored **hoãn** (testnet faucet lo gas khi dev; chỉ cần khi lên mainnet).

## Red Team Review
### Session — 2026-06-08 · 15 findings (15 accepted) · 8 Critical, 7 High
| # | Finding | Sev | Disposition | Phase |
|---|---|---|---|---|
| 1 | Sponsored tx không ký thay user trên owned object → keeper scoring bất khả thi | Crit | Accept → shared+OracleCap | P2,P5 |
| 2 | MemWal SDK không có kind-only PTB → user-owned onboarding gasless chưa chứng minh | Crit | Accept → Spike B, namespace fallback | Pre,P3 |
| 3 | Sponsor endpoint rút cạn ví; server 0 auth, CORS `*` | Crit | Accept → auth sign-in-with-Sui trước sponsor | P1 |
| 4 | resourceId spoof → ghi memory/profile user khác | Crit | Accept → session bind verified address | P1,P3 |
| 5 | 1 APP_DELEGATE_KEY ghi memory mọi user, no rotation | Crit | Accept → secret store + rotation runbook | P3 |
| 6 | Rotation secret 1 dòng; key đã qua chat, repo sắp public | Crit | Accept → **P0 gate** trước public | P8 |
| 7 | Memory #1 chưa verify + scope 2× / 16 ngày | Crit | Accept → Pre-flight memory-first | Pre |
| 8 | Pipeline gen ảnh chưa tồn tại (ai-multimodal = CLI skill) | Crit | Accept → STRETCH + text/HTML card MVP | P7 |
| 9 | Score-keeper loop vô hạn, no recovery | High | Accept → reconciliation sweep idempotent + balance watchdog | P5 |
| 10 | 1 ví sponsor/oracle/keeper = SPOF, cạn âm thầm | High | Accept → watchdog + reserve + alert | P1,P4,P8 |
| 11 | Indexer non-monotonic upsert + schema chưa có cột points | High | Accept → monotonic fold + migration cột + heartbeat | P6 |
| 12 | API-Football 100/ngày đụng realtime polling | High | Accept → rate budget + 1 featured match + SLA thật | P4,P7 |
| 13 | Gen ảnh realtime no ceiling/IP prompt-only | High | Accept → hard ceiling + template IP-safe + moderation | P7 |
| 14 | 5 daemon 1 process không giám sát | High | Accept → unhandledRejection guards + tách worker + precompile | P8 |
| 15 | Enoki + gas-station + zkLogin co-sign chưa chứng minh | High | Accept → Spike A, pin decision | Pre,P1 |

### Per-phase deltas (áp dụng khi cook)
- **P1:** auth **sign-in-with-Sui** (client ký nonce → server `verifyPersonalMessageSignature` → session; identity từ session, KHÔNG từ body); CORS allowlist (bỏ `*`); sponsor: per-address quota + global SUI ceiling + whitelist `pkg::module::fn` + kill-switch (check TRƯỚC co-sign); Spike A trước UI.
- **P2:** scoring → **shared `Scoreboard` ghi bởi OracleCap**; `Prediction` vẫn owned (user submit + event); bỏ "score_prediction by user/keeper"; unit test owner-binding/double-score.
- **P3:** GIỮ namespace single-account = **fallback luôn-chạy**; user-owned account = additive **sau Spike B** (không xoá namespace path); APP_DELEGATE_KEY → secret store + rotation.
- **P4:** giữ oracle settle/register_match; **rate budget** (poll featured/live + cache); alert match quá kickoff+3h chưa settle.
- **P5:** scoring = **server grade off-chain → ghi shared Scoreboard (OracleCap)**; **reconciliation sweep idempotent** thay one-shot; sponsor balance watchdog.
- **P6:** migration cột `users.total_points/streak/best_streak` + view points (KHÔNG "chỉnh view accuracy"); indexer **monotonic**; heartbeat `last_indexed_at` + UI "as of HH:MM".
- **P7:** **realtime AI gen ảnh = STRETCH** (sau Spike C). MVP = **text + HTML/CSS report card** (mascot asset + record + memory callback → screenshot, IP-safe, $0). Nếu gen ảnh: chỉ mascot/template composite, hard ceiling, bounded queue, rate-limit on-demand, moderation trước publish.
- **P8:** **rotation secret = P0 GATE** trước public (rotate Sui/Supabase/DB/gateway + `gitleaks`); tách HTTP khỏi workers (hoặc `process.on('unhandledRejection')` + try/catch mỗi loop); **pin version** (bỏ `latest`) + `--frozen-lockfile`.

### Whole-Plan Consistency Sweep
- Reconciled: storage table + architecture (scoring → shared Scoreboard/OracleCap); P2/P5/P6 bỏ "owned Profile + score_prediction by user/keeper".
- Còn mở (xác nhận khi spike, không chặn plan): MemWal PTB (B), Enoki co-sign (A), image-gen endpoint (C).
