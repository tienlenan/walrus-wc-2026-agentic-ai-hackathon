# Airtable Form Answers - The Daily Walrus

Source form: https://airtable.com/appoDAKpC74UOqoDa/shrIl2BMnzMwpuLhO

## Project name

The Daily Walrus

## Please select the session

Walrus Session 4 - Walrus Memory World Cup

## Team Leader Name

TODO: Fill manually.

## Team Leader Email

TODO: Fill manually.

## Newsletter

Optional.

## Team Leader Telegram Handle

TODO: Fill manually if available.

## Discord handle

TODO: Fill manually. Required by the form.

## Country

TODO: Fill manually.

## DeepSurge project Link

TODO: Fill after DeepSurge project is submitted on mainnet.

## Project Link (URL)

https://roast2026wc.wal.app/

Mainnet Walrus Site object is deployed:

`0xd7b94c015080b56d9ba19e18112eb69bf5d40dff83158631cd455cd9860c0158`

Base36 diagnostic:

`5dk6jtcpgo39hujesoc658qum6wetenol3b5avm3qpuywq0qqg`

Do not use `https://5dk6jtcpgo39hujesoc658qum6wetenol3b5avm3qpuywq0qqg.wal.app` as the final URL; it returns 404 until a SuiNS name points to the site object.

## I confirm that I have submitted it on Mainnet

Do not check until the final public SuiNS/wal.app URL and DeepSurge page are complete.

Mainnet contract and Walrus Site object are deployed. Public `wal.app` access is live at `https://roast2026wc.wal.app/`.

## Please describe the workflow and functionalities of your project

The Daily Walrus is an AI World Cup 2026 pundit with persistent memory on Walrus. A user connects a Sui wallet, chats with Gil, makes match and tournament predictions, and receives personalized roast-style feedback based on their historical takes.

Core workflow:

1. The user connects a Sui wallet and signs in.
2. Gil recalls global World Cup memory: fixtures, teams, players, squads, coaches, venues, and player roast traits.
3. The user submits predictions through wallet-gated Sui transactions.
4. Match gates close based on kickoff time; after a result seed/oracle update, predictions are scored and the leaderboard updates.
5. Walrus Memory stores persistent user and global memory so Gil can reference prior sessions. The key demo is day-one behavior versus later behavior after memory has accumulated.
6. Important generated outputs such as roasts, notebook evidence, team profiles, and media payloads are anchored through Walrus/Sui proof surfaces where configured.
7. The Runtime Tracking page exposes contract, object, Walrus Memory, Walrus blob, and site links for judges to inspect.

The app is intentionally playful: users are not only scored, they are remembered and roasted by Gil for bad football takes.

Mainnet proof:

- Package: `0x2c9496db107257631c4bad0b8f97593a661f82df83b0bd84500bec57d7738beb`
- Publish digest: `68d4RuFpzqNqzXgLum5KQFkd2qCRL137EkyS4YXpipv2`
- MatchRegistry: `0xa992d65237ec8a953f04f0450c39203cc2777b2a67ae61add8c39f74578d3446`
- Scoreboard: `0xfed0e2738f38965144bdcc840d4bf79ff0c9d75a9afd04753cd4f13c763cec10`
- Walrus Site object: `0xd7b94c015080b56d9ba19e18112eb69bf5d40dff83158631cd455cd9860c0158`
- Fixture seed: 104/104 matches registered on mainnet.

## Share any visuals of your project

Upload these files:

- `submission-pack/assets/posters/poster-sketchnote.png`
- `submission-pack/assets/docs/high-level-design-requirements.pdf`
- `submission-pack/assets/docs/storage-memory-explainer.pdf`
- all files in `submission-pack/assets/screenshots/`

## Demo video of the form (sub 3 minutes)

Record and upload a real sub-3-minute screen walkthrough after SuiNS/public URL is connected.

Suggested flow:

1. Open `https://roast2026wc.wal.app/`.
2. Connect wallet.
3. Submit one prediction.
4. Show Gil's notebook/memory recall.
5. Show roast wall or leaderboard.
6. Open Runtime Tracking and proof links.

## Which features sets your solution apart from the rest?

- Real persistent AI memory through Walrus Memory, not just a local chat log.
- Wallet-scoped memory: Gil remembers a user's predictions, bias, favorite teams, and previous bad takes.
- Global World Cup memory: fixtures, teams, squads, coaches, and player roast traits are recallable by the agent.
- Prediction gates and scoring are modeled as Sui objects so the scoring flow has public receipts.
- Runtime Tracking page exposes proof links for judges instead of hiding the architecture behind screenshots.
- The product is intentionally fun: Gil is a roast-heavy football pundit, making the memory behavior obvious and shareable.
- Rebuildable cache model: Supabase is only an index/cache; Walrus Memory, Walrus Blob, and Sui objects are the proof layers.

## Feedback on using Walrus Memory

Current actionable feedback:

- Walrus Memory is strong for agent memory, but the hosted relayer versus user-wallet write path can be confusing for hackathon judging. Documentation should clearly state how judges should evaluate "stored on Walrus" versus "written by the participant wallet".
- Mainnet onboarding requires several moving pieces: SUI gas, WAL, Walrus Memory account/delegate key, Walrus Sites, SuiNS. A single checklist or command-driven readiness tool would reduce friction.
- Better examples for combining Walrus Memory with a web agent stack would help: wallet identity, namespace strategy, before/after demo harness, and public proof page.

TODO: Create GitHub tickets if the form requires issue links rather than narrative feedback.

## Feedback about building on Walrus

What worked well:

- Walrus Sites is a good fit for static React/Vite frontends.
- Walrus blob storage maps naturally to generated media, JSON payloads, posters, and proof artifacts.
- Walrus Memory fits the agent use case because the product needs recall that changes behavior over time.

Challenges:

- Mainnet deploy requires both SUI and WAL; missing either blocks the final step.
- Testnet site verification is less direct because `wal.app` browsing is mainnet-oriented.
- SuiNS requirement for friendly public site access should be surfaced earlier in the Walrus Sites quickstart.
- Distinguishing canonical memory from rebuildable cache/index state requires careful architecture documentation.

Desired improvements:

- A one-command mainnet readiness check for Walrus Sites and Walrus Memory.
- More production examples for agent memory namespaces.
- Clearer guidance on public proof URLs for blobs, memory accounts, and site objects.

## X account

TODO: Fill manually.

## Share link to X tweet

TODO: Post project demo/screenshot/link with `#Walrus`, then paste the tweet URL.

Suggested tweet:

The Daily Walrus is live for the Walrus Memory World Cup: a World Cup 2026 AI pundit that remembers your predictions, tracks your record, and roasts your bad football takes with Walrus Memory.

Built with Walrus Memory, Walrus Blob, Sui objects, and Walrus Sites.

#Walrus

## SUI address

Dedicated deploy wallet:

`0xf5ca4f02cf58d6448b6429c691b53c89c56b30c3ded38b45e73ce78829e99f6d`

Mainnet status: funded, package published, site object deployed.

## GitHub

Project repository:

https://github.com/tienlenan/walrus-wc-2026-agentic-ai-hackathon

## Did you get referred to Session 4 by someone?

TODO: Fill with referrer Discord handle if applicable, otherwise "No".

## Session Feedback

The session theme is strong because it forces memory to be visible through a changing product experience. The World Cup framing makes before/after memory easy for users and judges to understand.

Suggested improvement: publish a final submission readiness checklist earlier, including DeepSurge, Airtable, Mainnet Walrus Sites, SuiNS, WAL funding, and demo video requirements.

## DeepSurge Feedback

TODO: Fill after submitting the DeepSurge project.

## Rules confirmation

Check only after reviewing the rules and confirming the final public SuiNS URL plus DeepSurge page.

Rules page:

https://thewalrussessions.wal.app/memory-world-cup/index.html
