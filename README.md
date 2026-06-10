# 🦭📰 The Daily Walrus

> An AI World Cup 2026 pundit with a memory. Make your predictions — and get roasted for them.

**The Daily Walrus** is an AI "sports tabloid" fronted by **Gil**, a grizzled walrus pundit who's
seen every World Cup since 1954. You chat about fixtures, make predictions, and drop hot takes — Gil
remembers all of it (stored permanently on **Walrus**), tracks your record, and roasts you with your
own history. The longer you use it, the more personal — and savage — Gil gets.

Built for the **Walrus Memory World Cup** hackathon. Full brief, plan, architecture, and design live
in [`docs/`](docs).

## ✨ Features
- **Chat with Gil** — fixtures, results, and playful match analysis, fully in character.
- **Predictions desk** — call match outcomes and tournament picks; auto-scored as results land.
- **Persistent memory on Walrus** — Gil references what he learned in earlier sessions: a real
  day‑1‑vs‑day‑N "before/after".
- **Personalized roasts** — based on your record, favourite team, and past takes.
- **Leaderboard** — prediction accuracy, in realtime.
- **Gil's Notebook** — see exactly what Gil remembers about you, verifiable on‑chain.
- **Shareable report cards** — auto‑generated roast cards to screenshot and post.
- **Daily What's Up** — multi-agent dispatches with editorial memory, anti-repeat checks,
  Walrus Blob payloads, and Sui/Walrus proof links.

## 🧱 Tech stack
| Layer | Choice |
|---|---|
| Frontend | React + Vite → **Walrus Sites** (Mainnet) |
| Agent runtime | **Mastra** (ai‑sdk) |
| LLM | **Gemini** via **Vercel AI Gateway** |
| Agent memory | **Walrus Memory** (`@mysten-incubation/memwal`) — canonical store on Mainnet |
| Database | **Supabase** (Postgres + pgvector + realtime) — index / cache / leaderboard |
| Server host | Mastra-compatible Node API on **Vercel** |

> Design note: **Walrus is the source of truth for memory**; Supabase is a rebuildable index/cache.
> See [`docs/03-architecture.md`](docs/03-architecture.md).

## 📁 Project structure
```
walrus-memory-world-cup/
├─ apps/
│  ├─ web/        # React + Vite (deploys to Walrus Sites)
│  └─ server/     # Mastra agent server — Gil (Gemini via AI Gateway)
├─ packages/
│  ├─ db/         # Supabase: pg pool, admin client, SQL schema
│  └─ shared/     # shared types + Gil persona / system prompt
├─ docs/          # plan, requirements, architecture, flows, design, research
├─ .env.example
├─ pnpm-workspace.yaml
└─ package.json
```

## 🚀 Getting started
### Prerequisites
- Node ≥ 20.9, pnpm 9
- A Supabase project (connection string + API keys)
- A Vercel AI Gateway API key

### Setup
```bash
pnpm install
cp .env.example .env.local                 # then fill in the values
pnpm --filter @daily-walrus/db db:push     # create tables on Supabase
```

### Run
```bash
pnpm dev:web       # web app       → http://localhost:5173
pnpm dev:server    # Mastra server → http://localhost:4111
```

### Quick verify
```bash
pnpm --filter @daily-walrus/db     test:connection            # database connectivity
pnpm --filter @daily-walrus/server ping "Who wins WC 2026?"   # Gil replies (no server needed)
```

## 📜 Scripts
| Command | What it does |
|---|---|
| `pnpm dev:web` | Run the web app (Vite) |
| `pnpm dev:server` | Run the Mastra server |
| `pnpm build` | Build all packages |
| `pnpm --filter @daily-walrus/db db:push` | Apply the SQL schema to Supabase |
| `pnpm --filter @daily-walrus/db test:connection` | Test the database connection |
| `pnpm --filter @daily-walrus/server ping` | One‑shot Gil reply (bypasses HTTP) |

## 📚 Docs
Planning & design (written in English):

| Doc | Contents |
|---|---|
| [01-plan](docs/01-plan.md) | Product concept, roadmap, risks, open decisions |
| [02-requirements](docs/02-requirements.md) | Functional / non‑functional + hackathon compliance |
| [03-architecture](docs/03-architecture.md) | System design, data model, memory flow, deploy |
| [04-user-flows](docs/04-user-flows.md) | User journeys incl. the before/after memory demo |
| [05-design-direction](docs/05-design-direction.md) | Theme, Gil mascot, design tokens, roast card |
| [06-research-notes](docs/06-research-notes.md) | SDK / CLI reference + sources |
| [07-runtime-tracking-design](docs/07-runtime-tracking-design.md) | Global schedule memory + contract/Walrus tracking page |
| [high-level-design-requirements](docs/high-level-design-requirements.md) | Short English design/requirements summary with PDF export |

## 🗺️ Status
- ✅ Web app · server · Supabase schema · Gil persona · wallet session · i18n/settings
- ✅ Walrus Memory spine via MemWal: per-user notebook + global WC2026 schedule/team memory
- ✅ Predictions, on-chain gating, oracle scoring, leaderboard, roast wall, team profiles, runtime tracking
- ✅ Daily What's Up: six-role agent workflow, briefing memory dedupe, Walrus Blob proof, Sui receipt
- ✅ Testnet verification completed: 104/104 fixtures registered, prediction submit → score → settle → indexer replay
- ✅ Mainnet contract + Walrus Site object deployed; 104/104 fixtures registered on-chain
- ✅ Public Walrus URL live: `https://roast2026wc.wal.app/`

## License
TBD

---
〈 GIL'S VERDICT: STORED FOREVER, JUST LIKE YOUR BAD TAKES. 〉
