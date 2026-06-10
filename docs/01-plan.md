# The Daily Walrus — Project Plan

> **Walrus Memory World Cup** submission (Jun 5–24, 2026, results Jul 2, 2026).
> Related docs: [requirements](02-requirements.md) · [architecture](03-architecture.md) · [user-flows](04-user-flows.md) · [design-direction](05-design-direction.md) · [research-notes](06-research-notes.md) · [live-data ops](wc-live-data-ops-runbook.md)

## TL;DR
**The Daily Walrus** = an "AI sports newspaper" about the 2026 World Cup, hosted by the mascot **Gil — a grizzled, sharp-tongued walrus commentator**. Users predict outcomes and drop hot-takes; Gil **remembers** every prediction/opinion (stored on **Walrus Memory / Mainnet**), tracks their record, and then **roasts** you using your own history. The killer feature: **real memory** creates a clear difference between "day-1 Gil" and "day-5+ Gil".

## Product: The Daily Walrus
A 2026 World Cup AI buddy in the style of a **classic sports tabloid** ("THE DAILY WALRUS — EST. 2026"):
- **Q&A**: fixtures, results, lighthearted match analysis.
- **Predictions**: users guess the scoreline/winner for each match and the whole tournament; the system scores correct/wrong over time.
- **Live match operations**: provider-backed cache for public match state, timeline, lineups, and availability; final scoring remains oracle-gated.
- **Memory + roasting**: Gil remembers your favorite team, your "hot-takes", and your prediction record → personalized roasts ("Picking that team again? My tusks would choose better").
- **Shareable moment**: "Gil's Report Card" — an auto-generated grade/roast card to screenshot and post with #Walrus.

## Why it can win (mapped to the 3 judging criteria)
| Criterion | How The Daily Walrus delivers |
|---|---|
| **1. Memory Depth & Authenticity** | Uses real **Walrus Memory (MemWal)** on Mainnet + a structured prediction ledger. Includes a "harness" that reproduces the **before/after** moment (day-1 Gil with nothing vs day-5 Gil correctly recalling your old hot-take). |
| **2. Creativity & Flair** | A unique **tabloid + Gil mascot** concept, no "AI-slop". Shareable roast card → goes viral. |
| **3. Technical Execution** | A lean MVP, running for real on **Walrus Mainnet** (site + memory), modern stack (Mastra + Claude + Supabase). "A working MVP" > "ambition that breaks". |

## Stack decisions (summary — details in [architecture](03-architecture.md))
- **Frontend:** React + Vite → deploy to **Walrus Sites (Mainnet)** via `site-builder`.
- **Agent runtime:** **Mastra** (`@mastra/core`) + **ai-sdk** + **Gemini via Vercel AI Gateway** (`google/gemini-3-flash`).
- **Memory (the star):** **Walrus Memory** — `@mysten-incubation/memwal` — `remember`/`recall`/`ask`, storing encrypted blobs (Seal) on Walrus Mainnet. Plugged into Mastra via AI SDK middleware or Mastra tools.
- **DB:** **Supabase free** (Postgres + pgvector + realtime) — prediction ledger, fixtures/results cache, leaderboard, the `walrus_index` table (pointers to blob/account), user registry.
- **Server:** Mastra-compatible Node API hosted on **Vercel**.
- **Wallet:** Sui Ed25519 keypair as a **dedicated session wallet** (a contest requirement), funded with WAL + SUI.

## Roadmap & milestones (today Jun 8 → deadline Jun 24)
> ⏱️ **Critical path:** the before/after demo needs **≥ 4 days** of real accumulated memory. MemWal must **start writing real memory by ~Jun 12 at the latest** so we have "day 1 vs day 5+" ready at judging time. → *Build the memory loop FIRST, polish later.*

| Milestone | Content | Target date |
|---|---|---|
| **M0** | Plan / requirements / architecture / design (this document) | Jun 8 ✅ |
| **M1 — Skeleton** | Monorepo, Vite app, Mastra server "hello agent", Supabase project, create session wallet + fund WAL/SUI | Jun 8–10 |
| **M2 — Memory spine** ⭐ | Integrate **MemWal** (remember/recall), Supabase prediction ledger, before/after harness, **start writing real memory** | Jun 10–12 |
| **M3 — Core UX** | Chat with Gil (streaming), prediction UI, fixtures/results, leaderboard | Jun 12–16 |
| **M4 — Theme polish** | "The Daily Walrus" design system, Gil mascot art (6 expressions), roast card generator | Jun 15–19 |
| **M5 — Deploy Mainnet** | Build → Walrus Sites Mainnet, Supabase prod, Vercel API, attach SuiNS name, `ws-resources.json` for the SPA | Jun 18–21 |
| **M6 — Submit** | Demo video ≤3', Walrus Memory feedback form, post #Walrus on X, submit to DeepSurge + Airtable | Jun 21–24 |

## Risk register (from research)
| Risk | Impact | Mitigation |
|---|---|---|
| Judges interpret "memory on Walrus *from your wallet*" — the hosted relayer writes with the relayer's wallet | Could lose points on criterion 1 | Also keep **a raw `@mysten/walrus` write path** from the session wallet to prove on-chain; ask the organizers via Discord |
| **MemWal is beta** (v0.0.7), API changes | Broken build | Pin the version; fall back to raw `@mysten/walrus` |
| **Supabase free pauses after ~7 days** of inactivity or API host limits | App "dies" right at judging time | Keep-alive cron, verified production URL, and paid demo window if needed |
| Mainnet cost (WAL + SUI), a fixed per-blob fee that dominates for small blobs | Costly / slow | Fund the wallet early; **Quilt** to batch small blobs; write memory **async**, batched |
| Mastra is migrating to v1 | API drift | Pin the version, follow migration notes |
| Mastra receives a bare `google/...` string → routes to Google directly (requires GOOGLE_API_KEY) | Model error | Use `@ai-sdk/gateway` `createGateway({apiKey: AI_GATEWAY_API_KEY})` explicitly |

## Open decisions (need confirmation)
1. **Name & theme:** Product = **"The Daily Walrus"**, theme = **sports tabloid** (Gil mascot). Fallback: **Walrus Arcade** (8-bit). → *OK?*
2. **User identity:** the MVP uses the **Sui address as the `resourceId`** (no heavy auth needed); Supabase Auth can be added later. → default: wallet-as-identity.
3. **Embeddings/recall:** prefer **using MemWal's recall** (the relayer handles embeddings) → no OpenAI key needed. Mastra semantic recall is only optional.
4. **Server host:** **Vercel** for the production Node API.

→ If you approve the defaults above, the next step is **M1: build the skeleton** (see [requirements](02-requirements.md) & [architecture](03-architecture.md)).
