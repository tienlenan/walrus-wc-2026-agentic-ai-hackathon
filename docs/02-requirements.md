# Requirements — The Daily Walrus

> Links: [plan](01-plan.md) · [architecture](03-architecture.md) · [user-flows](04-user-flows.md) · [design-direction](05-design-direction.md)

## 1. Goals & scope
Build an AI agent (the **Gil the Walrus** mascot) themed around the **FIFA World Cup 2026** with **persistent memory on Walrus Mainnet**, clearly demonstrating behavioral change over time (before/after), plus a public web interface to "see" the memory working (prediction history, roast, leaderboard).

**In scope (MVP):** chat with Gil, match predictions, prediction scoring, MemWal memory, personalized roasting, fixtures/results, leaderboard, shareable roast card, Daily What's Up agentic publishing, live match operations cache, Mainnet deployment.
**Out of scope (for now):** social login, payments, native mobile app, full localization, self-trained models.

---

## 2. Mandatory hackathon requirements (compliance — MUST NOT be missing)
Mapped directly from the event rules. These are pass/fail criteria.

- [ ] **R-H1** The agent integrates **Walrus Memory** to track predictions/opinions/interactions tied to the **2026 World Cup**.
- [ ] **R-H2** **Real persistent memory**: the agent can reference things learned in a previous session in a way that "day 1 could not do" → there is a **before/after** demo (day 1 vs after ≥ 4 days).
- [ ] **R-H3** **All agent state + memory stored on Walrus, deployed to Mainnet.**
- [ ] **R-H4** A **public interface** that shows the memory working (prediction history / roast / debate log…).
- [ ] **R-H5** Deploy the submission on **Walrus Mainnet** + provide a **dedicated wallet address**.
- [ ] **R-H6** **Live project link** + **demo video ≤ 3 minutes**.
- [ ] **R-H7** Complete the **Walrus Memory feedback form** (with GitHub tickets if any).
- [ ] **R-H8** Listed on **DeepSurge** + submit the **Airtable form** + **public GitHub repo** + **logo/description/website/contact**.
- [ ] **R-H9** Join the **Walrus Discord**; post demo/screenshot/link with **#Walrus** on X.

---

## 3. Functional requirements

### 3.1 Memory & personalization (core — priority P0)
- **F-MEM-1** Each user has a stable identity (`resourceId` = Sui address) so memory follows them across sessions.
- **F-MEM-2** Gil **remembers** (`remember`) events: favorite/hated teams, hot-takes, each prediction, mood, memorable "moments".
- **F-MEM-3** Gil **recalls** (`recall`) relevant context before answering, and **quotes back** old memories in its replies.
- **F-MEM-4** Memory is **stored canonically on Walrus** (MemWal/Mainnet); Supabase is only an index/cache (see architecture).
- **F-MEM-5** An evolving **fan working profile**: favorite team, rivals, W–L record, "hot-take signature", "saltiness" level.
- **F-MEM-6** A **before/after harness**: an internal tool/route that reproduces the same question with empty vs accumulated memory state to prove the difference (for the demo & judging).

### 3.2 Predictions & scoring (P0)
- **F-PRED-1** Users predict: win/draw, (optionally) the scoreline, for each match; plus long-term predictions (champion, top scorer…).
- **F-PRED-2** Save predictions to a **prediction ledger** (Supabase) with a timestamp, and also `remember` them into MemWal.
- **F-PRED-3** When a result comes in → **auto-score correct/wrong**, update record & streak.
- **F-PRED-4** Lock predictions after kickoff (no editing after the whistle).

### 3.3 Q&A & analysis (P1)
- **F-QA-1** Answer fixtures, results, standings (from the Supabase cache + a football data source).
- **F-QA-2** Lighthearted match analysis with personality; **roast players/teams** at an entertainment level, not offensively.
- **F-QA-3** Hot-take debate: Gil remembers your old stance and "calls you out" when you're inconsistent.
- **F-QA-4** Chat answers render Markdown via Streamdown and tool results via structured JSON parts, not raw JSON text.
- **F-QA-5** Mastra tools cover fixture lookup by group/team/date/prediction gate and team-profile lookup by team/player alias.
- **F-QA-6** Private chat tools cover wallet-scoped dapp history: predictions, roasts, MVP/worst votes, Sui/Walrus proof records, score record, and a unified action timeline.

### 3.3a Daily What's Up agentic publishing (P1)
- **F-BRIEF-1** A protected workflow can publish a Daily What's Up dispatch for a date/type/focus.
- **F-BRIEF-2** The workflow uses distinct roles: orchestrator, scout, synthesizer, writer, moderator, and publisher.
- **F-BRIEF-3** Scout can load fixture gates, team/player profile memory, official schedule references, configured web sources, and manual side stories.
- **F-BRIEF-4** Writer must load a dedicated briefing memory path (`daily-walrus:global:world-cup-2026:briefings`) before writing.
- **F-BRIEF-5** The workflow must reject duplicate-risk drafts and re-run scout/synthesis/writing up to 3 attempts before publishing.
- **F-BRIEF-6** Published dispatches store the full payload on Walrus Blob, short summary metadata in Walrus Memory, UI index data in Supabase, and an optional Sui `OutputRecord`.
- **F-BRIEF-7** The public UI exposes article markdown, sources, agent trace, blob/object links, memory namespace, content hash, and novelty result.

### 3.3b World Cup live data operations (P1)
- **F-LIVE-1** A provider adapter layer can seed/update World Cup fixtures, live state, match events, lineups, and player availability without making the provider the scoring authority.
- **F-LIVE-2** The system supports a static/open schedule fallback plus a pluggable API-Football provider for richer live data when credentials are configured.
- **F-LIVE-3** Every live-data run records provider, job type, scope, mode, status, fetched/applied count, content hash, error, and timestamps in an admin sync ledger.
- **F-LIVE-4** Public users can view match status, score, timeline, lineup pitch, and injury/suspension availability from the rebuildable cache.
- **F-LIVE-5** Admin/oracle endpoints are token-gated and support dry-run before apply for `fixtures_full`, `live_tick`, `finalize_result`, `lineups`, and `pre_match`.
- **F-LIVE-6** Final score settlement remains an explicit oracle action; provider data can assist operator review but must not auto-settle predictions by itself.
- **F-LIVE-7** Daily What's Up scout can include live match state, lineup availability, and injury/suspension notes as source facts.

### 3.4 Memory-display interface (P0 — required by R-H4)
- **F-UI-1** **Prediction history**: a timeline of predictions + correct/wrong + streak.
- **F-UI-2** **Memory panel / "Gil's notebook"**: shows what Gil currently remembers about you (read from Walrus → proves on-chain).
- **F-UI-2a** Inline "Gil remembers" evidence inside chat is collapsed by default and expandable per answer.
- **F-UI-2b** Gil Desk renders private history tool cards for "what did I predict/roast/do in the dapp?" without exposing another wallet's data.
- **F-UI-3** **Leaderboard**: accuracy ranking (realtime).
- **F-UI-4** **Roast card generator**: generates the "Gil's Report Card" image to download/post.
- **F-UI-5** **Before/after viewer**: places Gil's "day 1" vs "now" answers side by side for the same question.

### 3.5 Walrus & on-chain (P0)
- **F-W-1** Deploy the site to **Walrus Sites Mainnet**; SPA routing via `ws-resources.json`.
- **F-W-2** Memory written to **Walrus Mainnet**; store the `blobId`/account id to verify.
- **F-W-3** (Hedge) A **raw `@mysten/walrus` write path** from the session wallet to prove on-chain independently of the relayer.
- **F-W-4** A **"verify on Walrus"** page/button: opens the blob/object on an explorer/aggregator from the UI.
- **F-W-5** Daily What's Up proof uses the same verifier model: blob/object links, memory namespace, content hash, and optional Sui receipt.

---

## 4. Non-functional requirements
- **NF-1 Performance:** chat responses are **streamed**; UI actions < 200ms; Walrus writes run **async** outside the response path.
- **NF-2 Cost:** stay within the Supabase free tier + a small WAL/SUI budget; **Quilt** to batch small blobs.
- **NF-3 Demo stability:** guard against Supabase pause & host idle (keep-alive/cron) during the judging window.
- **NF-4 Security:** API keys (Anthropic, DB) only on the server; **never** exposed to the frontend. Session wallet key in a secret manager. MemWal uses Seal encryption.
- **NF-5 Verifiability:** every "stored on Walrus" claim must be openable on-chain/aggregator so judges can verify themselves.
- **NF-6 Availability:** responsive (desktop + mobile), fast loading on Walrus Sites (optimized assets).
- **NF-7 Content safety:** roasts are for entertainment, avoiding real hate/offense; avoid FIFA/player trademark infringement (see design-direction §iconography).
- **NF-8 Reproducibility:** seed data + a script to rebuild a "account with history" for the demo.
- **NF-9 Anti-repetition:** public agentic content must load recent published memory and avoid repeating the same article angle.

---

## 5. Definition of "Done" for the MVP
1. A stranger opens the Walrus Site link, connects/creates a wallet, chats with Gil, places a few predictions.
2. They come back later (a new session) → Gil **correctly recalls** what it learned and **roasts** based on the record.
3. Memory is **verifiable** as living on Walrus Mainnet.
4. There is a convincing **before/after** + a shareable **roast card**.
5. The §2 compliance checklist is complete.

## 6. Prioritization (MoSCoW)
- **Must:** F-MEM-1..6, F-PRED-1..3, F-UI-1/2/5, F-W-1/2, all of §2.
- **Should:** F-QA-1..3, F-UI-3/4, F-PRED-4, F-W-3/4.
- **Could:** voice, localization, pixel mini-game, roast-card NFT.
- **Could:** paid/redundant live sports provider, automated cron scheduling for official match windows.
- **Won't (now):** native mobile, payments, social login.
