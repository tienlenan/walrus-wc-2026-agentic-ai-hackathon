# Overflow 2026 Agentic Walrus Brief

## Positioning

Primary track: **Special - Walrus**.

Secondary narrative: **Agentic Web** through an autonomous publishing workflow.

The app remains **Gil's VAR Shamebook**. The Overflow addition is **Daily
What's Up**: Gil's newsroom now publishes verifiable World Cup dispatches
using a multi-agent pipeline backed by Walrus Blob, Walrus Memory, and Sui proof
objects.

## Workflow

```mermaid
flowchart LR
  A["Cron / Admin Trigger"] --> B["Orchestrator"]
  B --> M["Load Briefing Memory"]
  M --> C["Scout Agent"]
  C --> D["Synthesizer Agent"]
  D --> E["Writer Agent"]
  E --> N{"Novelty Check"}
  N -- "duplicate risk" --> C
  N -- "fresh enough" --> F["Moderator Agent"]
  F --> G["Publisher Agent"]
  G --> H["Supabase Index"]
  G --> I["Walrus Blob"]
  G --> J["Walrus Briefing Memory"]
  G --> K["Sui OutputRecord"]
  H --> L["Daily What's Up UI"]
```

The editorial memory path is `daily-walrus:global:world-cup-2026:briefings`.
Before writing, the workflow loads recent summaries and source IDs. After writing,
it computes a novelty score. Duplicate-risk drafts are rejected and re-scouted up
to three attempts.

## Proof Model

| Layer | Stored data |
|---|---|
| Walrus Blob | Full public dispatch JSON and markdown |
| Walrus Memory | Short summary metadata for global recall and anti-repeat writing context |
| Sui OutputRecord | Optional publisher-owned `blobId + contentHash` receipt |
| Supabase | Rebuildable UI index and run ledger |

## Demo Path

1. Open `#briefings` / Daily What's Up.
2. Show latest article and source list.
3. Expand agent trace.
4. Point out `previousBriefings`, novelty score, and any retry rows.
5. Open Walrus blob from proof strip.
6. Open `#tracking` and show latest dispatch status.
7. Ask Gil what today's Daily What's Up said; Gil should recall from global memory when MemWal is configured.

## Latest Mainnet Proof

- Blob: `w-M8jICdQOW-HE2GAwsuAUJRn3DgakvT82cYXXFZ11E`
- Object: `0x8191c033c28fe4876f71bb136bfcfa7b4165f3de203f058b3abbb7afaf6d6035`
- Content hash: `bad2146329f579b70c108936be3900591c6239935b1c33d1326810b2bd98b56b`
- Sui receipt: `D23CGDAVV8AjCs7Mvox1AUb2hvxsXGi43BBsM3MsQ753`
- Novelty: loaded `1` previous briefing, score `0.025`, duplicate `false`
