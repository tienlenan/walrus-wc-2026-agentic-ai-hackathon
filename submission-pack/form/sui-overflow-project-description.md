# Sui Overflow Project Description

Use this as the combined description source for DeepSurge / Sui Overflow fields.

## Project Name

Gil's VAR Shamebook

## One-Liner

An AI World Cup 2026 pundit that remembers wallet-scoped predictions with Walrus Memory, gates picks on Sui, and roasts bad football takes with verifiable Walrus/Sui receipts.

## Short Description

Gil's VAR Shamebook is a consumer AI app for World Cup 2026. Users connect a Sui wallet, ask Gil about fixtures and teams, submit match predictions, open roast gift boxes after scoring, and receive personalized roast-style commentary based on what Gil remembers about their previous takes.

The project combines an agentic sports pundit, persistent decentralized memory, on-chain prediction gates, and verifiable storage. Walrus Memory stores both global World Cup context and wallet-scoped user memory. Sui records prediction actions and output receipts. Walrus Blob stores generated artifacts such as team profiles, gallery assets, Daily What's Up payloads, and proof files. Walrus Sites hosts the public app.

## Full Description

Gil's VAR Shamebook turns decentralized memory into a visible product mechanic.

Instead of treating AI memory as hidden backend state, the app makes memory part of the user experience: Gil remembers what a wallet predicted, which teams the user keeps defending, what bad takes were signed before, and which roasts or notebook entries were previously generated. The more a user interacts, the more personal Gil becomes.

The app ships as a World Cup 2026 roast newspaper. Users can chat with Gil, ask for fixture or team-profile information, submit predictions, track leaderboard performance, open post-score roast gifts, inspect Gil's notebook, read Daily What's Up briefings, browse a meme gallery, and verify deployed objects through a runtime tracking page.

Under the hood, the product uses Sui as the action and proof layer, Walrus as the storage and memory layer, and a multi-agent workflow as the editorial layer. This makes the experience both playful and auditable: bad football takes are not just joked about, they are remembered and tied back to public proof surfaces.

## Core User Flows

1. **Wallet sign-in**
   - User connects a Sui wallet.
   - The wallet address becomes the memory identity and action signer.
   - Per-user memory follows the pattern `daily-walrus:<sui-address>`.

2. **Ask Gil**
   - User asks about fixtures, teams, players, predictions, or prior takes.
   - Gil can call structured tools for fixture lookup, team profile lookup, memory recall, and proof-aware responses.
   - Replies can include generative UI cards, markdown rendering, memory receipts, and Sui/Walrus output proof.

3. **Make predictions**
   - User selects a match or tournament prediction.
   - The app checks whether the match prediction gate is open.
   - User signs a Sui transaction.
   - Prediction data is indexed for leaderboard and later scoring.

4. **Score and roast**
   - Once results are seeded by the oracle flow, matches are settled.
   - Leaderboard and prediction history update.
   - User can open a roast gift box after a scored prediction.
   - Correct or wrong outcomes generate different roast receipts.

5. **Recall memory**
   - Gil's Notebook shows what the agent remembers for the connected wallet.
   - Global memory contains fixtures, teams, squads, coaches, and player roast traits.
   - User memory contains predictions, chat context, preferences, and prior signed outputs.

6. **Daily What's Up**
   - A multi-agent workflow creates a daily World Cup briefing.
   - It loads prior briefing memory to avoid repeating old content.
   - It scouts sources, summarizes key items, writes the briefing, reviews it, publishes it, and stores proof metadata.
   - The UI exposes Walrus Blob, Walrus Memory, and Sui receipt references.

7. **Runtime tracking**
   - Judges can inspect public endpoints, Sui package/object IDs, Walrus Memory namespaces, Walrus Blob links, and sync status.
   - This avoids relying only on screenshots or claims.

## Feature Set

- Wallet-gated Sui sign-in.
- On-chain prediction gates and fixture registration.
- Prediction desk with 104 World Cup fixtures.
- Group-based fixture filtering.
- Sui-signed prediction receipts.
- Leaderboard and scoring state.
- Post-score roast gift boxes.
- Gil chat with markdown and generative UI tool cards.
- Team profile lookup with coaches, squads, flags, fixtures, and Walrus blob proof.
- Gil's Notebook for wallet-scoped memory recall.
- Daily What's Up multi-agent briefing system.
- Duplicate-aware briefing generation using prior memory context.
- Roast Wall for team/player roasts.
- Global player roast traits memory.
- Gallery with Walrus-hosted cartoon assets.
- Runtime Tracking page for contract, memory, blob, and site proof.
- Guide Dr. Gil onboarding/settings for language, timezone, and roast severity.
- Walrus Sites public deployment at `https://roast2026wc.wal.app/`.

## Agentic / Multi-Agent Design

The app contains two agentic layers.

### 1. Interactive Gil Agent

Gil is the user-facing agent. It can answer normal chat, provide playful football commentary, and call tools when the user asks for structured information.

Tool-aware capabilities include:

- Fixture lookup by team, group, date, or prediction gate status.
- Team profile lookup.
- Memory recall for user history.
- Context-aware suggestions, for example asking about Ronaldo can suggest dragging Messi into the roast as well.
- Markdown and generative UI rendering so every response is not just plain text.

### 2. Daily What's Up Editorial Workflow

Daily What's Up is designed as a multi-agent editorial pipeline:

- **Orchestrator:** coordinates the daily run.
- **Scout:** gathers schedule, match, team, and side-story context.
- **Memory Loader:** loads previous briefings from a dedicated memory path.
- **Synthesizer:** extracts the non-repeated key points.
- **Writer:** creates the final briefing in Gil's voice.
- **Reviewer:** checks quality, relevance, and repetition risk.
- **Publisher:** stores the output in the database and publishes proof metadata to Walrus/Sui surfaces.

The duplicate-avoidance loop is important: if the content overlaps too much with previous memory, the system can scout again rather than publishing another stale briefing.

## Memory Model

The project uses three memory layers:

1. **Global World Cup Memory**
   - Namespace: `daily-walrus:global:world-cup-2026`
   - Stores fixtures, teams, squads, coaches, player traits, and briefing memory.
   - Used by all users.

2. **Wallet-Scoped User Memory**
   - Namespace pattern: `daily-walrus:<sui-address>`
   - Stores user predictions, chats, preferences, prior roasts, and recallable history.
   - Enables the "before vs after" memory demo.

3. **Rebuildable Index/Cache**
   - Supabase stores fast query/index data for UI, leaderboard, and operational views.
   - It is not the canonical memory layer.
   - Walrus Memory, Walrus Blob, and Sui objects are the proof surfaces.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Hosting | Walrus Sites Mainnet |
| Wallet / Sui client | `@mysten/dapp-kit`, `@mysten/sui` |
| Smart contracts | Sui Move package for prediction game state |
| Agent runtime | Mastra-compatible Node API |
| LLM routing | Gemini via Vercel AI Gateway |
| Memory | Walrus Memory / MemWal |
| Blob storage | Walrus Blob |
| Database/index | Supabase Postgres |
| Backend hosting | Vercel |
| Markdown rendering | Streamdown |
| Client state | Zustand |

## Why It Fits Sui Overflow

Recommended track: **Specialized Track: Walrus**.

The project is also strongly relevant to Agentic Web, but the best single-track fit is Walrus because Walrus is the core product primitive: persistent AI memory, blob-hosted artifacts, public data proof, and Walrus Sites hosting all directly affect the user experience.

The project uses Sui and Walrus together:

- Sui handles identity, transaction signing, prediction gates, scoring, and output receipts.
- Walrus Memory handles persistent agent memory.
- Walrus Blob stores generated and structured artifacts.
- Walrus Sites hosts the live app.
- Runtime Tracking exposes links and object IDs for inspection.

## Unique Points

- **Memory is the product, not an implementation detail.** Gil changes behavior as it remembers more about a wallet.
- **Walrus is used across the stack.** Memory, blob storage, gallery assets, team profile payloads, proof files, and hosting all touch Walrus.
- **Agentic UX is visible.** The app includes both an interactive tool-calling chat agent and a multi-agent Daily What's Up publishing workflow.
- **Proof-first design.** Runtime Tracking exposes contract IDs, memory namespaces, blob links, content hashes, and Sui receipts.
- **Consumer-grade wrapper.** Instead of a dry proof-of-concept, the app is a playful sports tabloid with predictions, roasts, gift boxes, galleries, and leaderboards.
- **Global plus personal memory.** Gil can recall fixed global World Cup data and wallet-specific history.
- **Repetition-aware publishing.** Daily What's Up loads old briefing memory before generating new content to avoid duplicate articles.
- **On-chain gating.** Predictions only open when the match is registered and eligible.

## Mainnet Proof

- Live app: `https://roast2026wc.wal.app/`
- GitHub: `https://github.com/tienlenan/walrus-wc-2026-agentic-ai-hackathon`
- Sui network: `mainnet`
- Deploy wallet: `0xf5ca4f02cf58d6448b6429c691b53c89c56b30c3ded38b45e73ce78829e99f6d`
- Move package: `0x2c9496db107257631c4bad0b8f97593a661f82df83b0bd84500bec57d7738beb`
- Publish digest: `68d4RuFpzqNqzXgLum5KQFkd2qCRL137EkyS4YXpipv2`
- MatchRegistry: `0xa992d65237ec8a953f04f0450c39203cc2777b2a67ae61add8c39f74578d3446`
- Scoreboard: `0xfed0e2738f38965144bdcc840d4bf79ff0c9d75a9afd04753cd4f13c763cec10`
- Walrus Site object: `0xd7b94c015080b56d9ba19e18112eb69bf5d40dff83158631cd455cd9860c0158`
- MemWal account: `0x416245a6d474f48e139e0ca6e3f6c89ae6edb9f15f2a6f0c2b5be1157fca2c51`
- Global namespace: `daily-walrus:global:world-cup-2026`
- Fixture registration: `104/104`
- Team profile blobs: `48/48`

## Suggested Demo Flow

1. Open `https://roast2026wc.wal.app/`.
2. Show wallet/network status and the Gil newspaper homepage.
3. Open Predictions and show on-chain open gates.
4. Ask Gil for fixtures or a team profile to show tool-driven generative UI.
5. Open Gil's Notebook to show memory recall.
6. Open Daily What's Up and show the multi-agent briefing proof.
7. Open Runtime Tracking and show the Sui package, Walrus Memory, and Walrus Blob proof links.
8. Open Gallery or Roast Wall to show the consumer-facing playful layer.

## Short Pitch

Gil's VAR Shamebook is a World Cup AI pundit with receipts. It remembers a wallet's football takes with Walrus Memory, gates predictions on Sui, publishes generated artifacts to Walrus, and exposes proof links so judges can verify the system live. It is both an agentic web app and a consumer product: part prediction game, part AI roast newspaper, part decentralized memory demo.

