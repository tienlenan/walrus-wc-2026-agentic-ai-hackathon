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
3. The agent receives the same tool context in the prompt, then answers in Markdown with a short Gil jab only when it fits.
4. The frontend renders text through Streamdown and tool results as fixture/profile cards; raw JSON is never shown.
5. Gil `recall`s before answering → injects personal context if any ("Your beloved team is playing again").

## Flow 3 — Placing a prediction (P0)
1. At the **Predictions desk** the signed-in user picks a match → predicts scoreline/MVP/worst/champion/advance.
2. Wallet signs a Sui tx → owned `Prediction` object. Supabase mirrors the event and `remember("Prediction <match>: <payload>")` runs through MemWal.
3. Gil reacts instantly based on **history**: *"Picking the favorite again? Last time you tipped like this you whiffed."*
4. The prediction is **locked** at kickoff (`locked_at`).

## Flow 4 — Scoring & record updates (automatic when results are in)
1. A job updates `fixtures` (results) → `scorePredictions(matchId)`.
2. Each prediction → `correct`/`wrong`; updates **W–L, accuracy, streak**; refreshes `leaderboard_mv`.
3. `remember` the "moment": *"User missed prediction <match> — streak broken at 0."* → material to roast later.
4. Realtime pushes updates to the **Leaderboard** & **My Record**.

## Flow 5 — Return session & personalized ROAST (day 2..N) ⭐
**This is the flow that shows "memory at work".**
1. The user returns (a new session/thread) with the same `resourceId`.
2. Before answering, the agent `recall`s + reads the record → builds **"Gil's notebook"**.
3. Inline notebook evidence is collapsed by default; the user can expand **Gil remembers** only when they want to inspect the receipts.
4. Gil opens with the user's own history: *"Hello, master tipster. 2/9 right. Going to praise your beloved team again today, are we?"*
5. If the user changes their stance → Gil **points out the contradiction**: *"Last week you said France would win, now it's Argentina?"*
6. The user can click **"What does Gil remember about me?"** → opens the **Memory panel** (read from Walrus) + a **verify on Walrus** link.

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

---

## Empty & error states (don't forget)
- **Empty:** a new user with no history → Gil "goads" them into placing their first prediction instead of a blank screen.
- **Result not in yet:** the prediction shows "pending"; don't score early.
- **Network loss/relayer error:** still allow basic chat; write memory with **async retry**; show a light "Gil is rummaging through his notebook…".
- **Supabase paused/host idle:** keep-alive cron; if slow → a friendly loading state.

## Success metrics (for the demo)
- ≥1 account with **≥4 days** of real history before judging.
- The Before/After shows a difference you can **see at a glance**.
- ≥1 roast card shared publicly (#Walrus).
- Memory openable on-chain in < 3 clicks.
