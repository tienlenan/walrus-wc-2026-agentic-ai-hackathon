# User Flows — The Daily Walrus

> Links: [requirements](02-requirements.md) · [architecture](03-architecture.md) · [design-direction](05-design-direction.md)

Notation: **Gil** = mascot/agent. `resourceId` = the user's Sui address (anchors memory).

---

## Screen map
```
Landing ("THE DAILY WALRUS" front page)
 ├─ Connect + Sign in with Sui (wallet address → resourceId)
 ├─ Newsroom (main chat with Gil)            ← core screen
 ├─ Predictions desk (place & view predictions)
 ├─ Daily What's Up (public agentic dispatches + proof)
 ├─ Match Center (live state, timeline, lineup pitch, availability)
 ├─ My Record / Gil's Notebook (memory panel + history)
 ├─ Leaderboard (realtime)
 ├─ Before/After (proves the memory)         ← for judges & demo
 └─ Roast Card (generates a shareable image)
```

---

## Flow 1 — Onboarding & identity (first day)
**Goal:** get a stable `resourceId` for memory to follow.
1. User opens `https://roast2026wc.wal.app/` → the "newspaper" front page with Gil's greeting.
2. Connect an existing Sui wallet, then sign the nonce message. The verified address becomes the `resourceId`.
3. (Optional) declare a **favorite team** → `remember("Fan of <team>")` + save `users.favorite_team`.
4. Gil greets tabloid-style: *"Another rookie tipster. Let's see how many times these tusks get it wrong…"*
> The day-1 baseline is captured here (empty memory) to build the Before/After later.

## Flow 2 — Q&A & analysis (any time)
1. User asks: "Any good matches tonight?" / "Who is Brazil playing?"
2. The chat service resolves intent and prepares Vercel-style JSON render parts:
   - `tool-getFixtures` for group/team/date/gate schedule questions.
   - `tool-getTeamProfile` for coach, squad, flag, player list, or Walrus blob proof questions.
   - `tool-getMyPredictions`, `tool-getMyRoasts`, `tool-getMyMatchVotes`, `tool-getMyOutputRecords`, `tool-getMyDappActions`, or `tool-getMyGameRecord` for private wallet history questions.
3. The agent receives the same tool context in the prompt, then answers in Markdown with a short Gil jab only when it fits.
4. The frontend renders text through Streamdown and tool results as sourced cards; raw JSON is never shown.
5. Gil `recall`s before answering → injects personal context if any ("Your beloved team is playing again").

## Flow 3 — Placing a prediction (P0)
1. At the **Predictions desk** the signed-in user picks a match → predicts winner/draw, scoreline, MVP, worst player, champion, or team-advance.
2. For team/player kinds, the user selects from indexed WC teams/squads. No free-text target can be signed.
3. Wallet signs a Sui tx → owned `Prediction` object. Supabase mirrors the event and `remember("Prediction <match>: <payload>")` runs through MemWal.
4. Gil reacts instantly based on **history**: *"Picking the favorite again? Last time you tipped like this you whiffed."*
5. The prediction is **locked** at kickoff (`locked_at`).

## Flow 4 — Scoring & record updates (oracle-gated when results are in)
1. A live-data job can update cached fixture/live state for operator review.
2. Operator compares provider result with the official visible result.
3. Operator calls `/api/oracle/score` for the final score/settle action.
4. Scoreline and winner predictions auto-grade from the final score. MVP/worst/champion/advance use oracle/manual correctness with their own point weights.
5. Each prediction → `correct`/`wrong`; updates **W–L, accuracy, streak**; refreshes `leaderboard_mv`.
6. `remember` the "moment": *"User missed prediction <match> — streak broken at 0."* → material to roast later.
7. Realtime pushes updates to the **Leaderboard** & **My Record**.

## Flow 5 — Return session & personalized ROAST (day 2..N) ⭐
**This is the flow that shows "memory at work".**
1. The user returns (a new session/thread) with the same `resourceId`.
2. Before answering, the agent `recall`s + reads the record → builds **"Gil's notebook"**.
3. Inline notebook evidence is collapsed by default; the user can expand **Gil remembers** only when they want to inspect the receipts.
4. Gil opens with the user's own history: *"Hello, master tipster. 2/9 right. Going to praise your beloved team again today, are we?"*
5. If the user changes their stance → Gil **points out the contradiction**: *"Last week you said France would win, now it's Argentina?"*
6. The user can ask "What did I predict?", "Who did I roast?", or "What have I done in the dapp?" → Gil uses wallet-scoped tool cards, not another user's data.
7. The user can click **"What does Gil remember about me?"** → opens the **Memory panel** (read from Walrus) + a **verify on Walrus** link.

## Flow 6 — Before/After viewer (for judges & video) ⭐
**Goal:** prove the *Memory Depth & Authenticity* criterion.
1. Go to the **Before/After** page.
2. Left column = **"Day-1 Gil"**: answers a sample question with empty memory (captured at onboarding, or run with a clean `resource`).
3. Right column = **"Gil now"**: the same question, a `resource` with ≥4 days accumulated → a personalized answer that correctly recalls the old prediction/hot-take.
4. Highlight the "only possible thanks to memory" part (e.g. quoting the original hot-take + date).
5. An **"Open blob on Walrus"** button so judges can verify the memory source themselves.

## Flow 7 — Roast Card sharing (going viral)
1. The user clicks **"Get my report card"**.
2. The app renders **"Gil's Report Card"** 1080×1350: masthead + Gil's expression (celebrating/roasting) + grade A+→F + a stat line (`PREDICTIONS · CORRECT · STREAK · ACCURACY`) + a one-line roast + a "Powered by Walrus" footer.
3. Download the image / **"Post #Walrus"** button (opens X with a prepared caption).

## Flow 8 — Verify on Walrus (trust & technical points)
1. In the Memory panel / Report card → a **"Verify on Walrus/Sui"** button.
2. Opens the Walrus `blobId` and/or Sui `OutputRecord`/`Prediction` object → shows the real memory/snapshot/output proof.
3. Serves NF-5 (verifiability) & builds trust at judging time.

## Flow 9 — Daily What's Up publishing (agentic web) ⭐
**Goal:** show an autonomous multi-agent workflow that uses Walrus Memory as editorial memory, not just output storage.
1. Admin/cron triggers `POST /api/oracle/briefings/run` for a date/type/focus.
2. Orchestrator starts an `agent_runs` row and loads recent dispatch summaries from `daily-walrus:global:world-cup-2026:briefings`.
3. Scout gathers fixed schedule facts, team profile memory, player roast traits, official links, configured web sources, and manual side stories.
4. Synthesizer builds fresh angles and passes "avoid recent summaries" to the writer.
5. Writer creates an English markdown article; novelty check compares the draft against briefing memory.
6. If duplicate risk is high, the workflow rejects the draft and re-runs scout/synthesis/writing up to 3 attempts.
7. Moderator strips wagering language and rejects unsupported source references.
8. Publisher writes full JSON to Walrus Blob, remembers short metadata in the dedicated briefing namespace, stores UI index data, and anchors an optional Sui `OutputRecord`.
9. User opens **Daily What's Up**: article, sources, agent trace, novelty score, blob/object links, memory namespace, and tx digest are visible.
10. User asks Gil about today's dispatch; Gil can recall the published summary from global briefing memory.

## Flow 10 — Official WC live match operations
**Goal:** keep match data fresh for public viewing and agent briefings without letting a provider auto-settle predictions.
1. Admin runs `live-data:sync --job=fixtures_full` as a dry-run to inspect provider fixture changes.
2. Admin applies `fixtures_full` only when the provider output is acceptable; global schedule memory can refresh after apply.
3. During match windows, admin/cron runs `live_tick` for live state and events.
4. Before kickoff, admin runs `lineups` and `pre_match` so the public Match Center can show lineup pitch and availability notes.
5. Public users open **Match Center** (`#matches`) to view status, score, timeline, lineups, and injury/suspension state from the cache.
6. Daily What's Up scout can include the live match cache as source facts.
7. At full time, admin runs `finalize_result` dry-run, verifies against the official result, then calls `/api/oracle/score`.

---

## Empty & error states (don't forget)
- **Empty:** a new user with no history → Gil "goads" them into placing their first prediction instead of a blank screen.
- **Result not in yet:** the prediction shows "pending"; don't score early.
- **No catalog target:** disable submit and show the user the match/team data is not ready instead of allowing arbitrary text.
- **Network loss/relayer error:** still allow basic chat; write memory with **async retry**; show a light "Gil is rummaging through his notebook…".
- **Supabase paused/host idle:** keep-alive cron; if slow → a friendly loading state.

## Success metrics (for the demo)
- ≥1 account with **≥4 days** of real history before judging.
- The Before/After shows a difference you can **see at a glance**.
- ≥1 roast card shared publicly (#Walrus).
- Memory openable on-chain in < 3 clicks.
