# Runtime Tracking & Global Memory Design

## 1) Goal
- Answer fixture, group, venue, lock-state, and result questions through global memory.
- Keep schedule memory seeded once and re-sync on delay/postponement/round update.
- Provide a public `#tracking` page with one-click links to:
  - Sui objects,
  - Walrus memory/blobs,
  - contract/memory namespaces,
  - and live sync status.
- Track the latest Daily What's Up dispatch proof, including briefing memory namespace, novelty result, blob/object links, and Sui receipt.

## 2) Data Ownership
| Layer | Responsibility | Read/Write |
|---|---|---|
| Sui `wc_predict` | Source of truth for prediction gate, scoring, and `OutputRecord` proof | Submit prediction / score / settle / output hashes |
| Walrus Memory global | Semantic memory for schedule, lock rules, and fixture status | Memory recall + periodic sync writes |
| Walrus Memory briefing | Editorial memory for published Daily What's Up summaries and anti-repeat context | Loaded before writing + updated after publish |
| Walrus blobs | Optional raw JSON payloads (chat, roast, profile, snapshot) | Write when publisher exists |
| Supabase | Rebuildable index/cache, tracking metadata, leaderboard, fixture query | Cache + fast queries |

## 3) Namespaces
- Per-user memory: `daily-walrus:<suiAddress>`
- Global memory: `daily-walrus:global:world-cup-2026`
- Briefing memory: `daily-walrus:global:world-cup-2026:briefings`
- Both namespaces are loaded before generating replies:
  - Global memory for schedule/results rules
  - User memory for behavior history and roast context
  - Briefing memory for Daily What's Up anti-repeat and later recall

## 4) Sync Workflow
```mermaid
flowchart TD
  A["Seed fixtures (104 total)"] --> B["Build stable schedule payload"]
  B --> C["Publish raw snapshot to Walrus (if publisher enabled)"]
  B --> D["Split into overview/group/knockout chunks"]
  D --> E["Remember chunks into global namespace"]
  C --> F["Upsert global_memory_syncs"]
  E --> F
  G["Oracle settle match"] --> H["Update DB result"]
  H --> B
  I["Postponement / kickoff change / bracket update"] --> B
```

## 4.1) Daily What's Up Workflow
```mermaid
flowchart TD
  A["Admin/Cron trigger"] --> B["Orchestrator starts agent run"]
  B --> C["Load briefing memory summaries"]
  C --> D["Scout schedule, teams, players, sources"]
  D --> E["Synthesize fresh angles"]
  E --> F["Writer drafts markdown"]
  F --> G{"Novelty check"}
  G -- "duplicate risk" --> H["Re-scout up to 3 attempts"]
  H --> D
  G -- "fresh enough" --> I["Moderator checks sources and wording"]
  I --> J["Publish full JSON to Walrus Blob"]
  J --> K["Remember summary in briefing namespace"]
  J --> L["Anchor blob/hash with Sui OutputRecord"]
  J --> M["Upsert daily_briefings index"]
```

Novelty is computed against recent briefing memory. The trace records `previousBriefings`, novelty score, duplicate reason, and retry rows when a draft is rejected.

## 5) Prediction Gate
- `fixtures.chain_registered = false`: schedule view only, no prediction action.
- `chain_registered = true` + kickoff future + not finished: prediction open.
- After kickoff passed or fixture finished: prediction locked.
- `settle_match` updates DB result, emits events, and triggers best-effort global memory sync.

## 6) Tracking API
Endpoint: `GET /api/tracking/runtime`

Returns:
- Sui network + explorer URLs.
- Contract object IDs and oracle ids.
- Memory service status + namespace + last sync hash.
- Walrus publisher status and object/blob URLs (if configured).
- Fixture counters (`total`, `registered`, `open`, `not_onchain`, `closed`, `finished`).
- Source URLs for schedules and squad data.
- Latest Daily What's Up title/date/hash/blob/object/memory status/namespace.
- Daily What's Up novelty status and retry evidence when present.

Admin endpoint:
`POST /api/oracle/memory-sync` with `X-Oracle-Token`.

## 7) UI Tracking Page
Route: `#tracking` in SPA.

Use cases:
- Open Sui explorer objects quickly.
- Open Walrus object/blob URL for memory proof.
- Copy contract/object IDs and namespace.
- Confirm writing state (live, not just cache mode).
- Inspect the latest public dispatch proof and open its Walrus blob/object.

## 8) Operational Notes
- Missing `MEMWAL_ACCOUNT_ID` or `MEMWAL_DELEGATE_KEY` shows `memory_not_configured`.
- Missing `WALRUS_PUBLISHER_URL` falls back to the configured Walrus CLI when available; raw blob fields show the actual published/failed status.
- `global_memory_syncs` is tracking metadata, not canonical memory.
- `daily_briefings` is the UI index; canonical article payload is the Walrus blob, and editorial memory is the briefing namespace.
