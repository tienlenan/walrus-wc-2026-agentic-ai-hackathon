# Mainnet Runtime IDs

Captured from the live production API on 2026-06-10.

## Public Endpoints

| Item | Value |
|---|---|
| Public app | `https://roast2026wc.wal.app/` |
| Backend API | `https://gil-var-shamebook-api.vercel.app/` |
| Runtime tracking API | `https://gil-var-shamebook-api.vercel.app/api/tracking/runtime` |
| World Cup snapshot API | `https://gil-var-shamebook-api.vercel.app/api/world-cup/snapshot` |
| Sui explorer base | `https://suiscan.xyz/mainnet/object` |
| Walrus aggregator | `https://aggregator.walrus-mainnet.walrus.space` |

## Sui Mainnet Objects

| Item | Object ID |
|---|---|
| Deploy wallet | `0xf5ca4f02cf58d6448b6429c691b53c89c56b30c3ded38b45e73ce78829e99f6d` |
| Move package | `0x2c9496db107257631c4bad0b8f97593a661f82df83b0bd84500bec57d7738beb` |
| MatchRegistry | `0xa992d65237ec8a953f04f0450c39203cc2777b2a67ae61add8c39f74578d3446` |
| Scoreboard | `0xfed0e2738f38965144bdcc840d4bf79ff0c9d75a9afd04753cd4f13c763cec10` |
| AdminCap | `0xd94e85b3a9e06ecd12b9c032412ffaa6d8d7044d9e97214621aad19528171c41` |
| OracleCap | `0x147d6290d21bd01d51a6cdafc2610cfcdb3d4272d7419d57d71df714fa90c25c` |
| Walrus Site object | `0xd7b94c015080b56d9ba19e18112eb69bf5d40dff83158631cd455cd9860c0158` |
| Walrus Site base36 diagnostic | `5dk6jtcpgo39hujesoc658qum6wetenol3b5avm3qpuywq0qqg` |

## Walrus Memory

| Item | Value |
|---|---|
| MemWal account | `0x416245a6d474f48e139e0ca6e3f6c89ae6edb9f15f2a6f0c2b5be1157fca2c51` |
| Relayer | `https://relayer.memory.walrus.xyz` |
| Global namespace | `daily-walrus:global:world-cup-2026` |
| Namespace URL | `https://relayer.memory.walrus.xyz/account/0x416245a6d474f48e139e0ca6e3f6c89ae6edb9f15f2a6f0c2b5be1157fca2c51/namespace/daily-walrus%3Aglobal%3Aworld-cup-2026` |
| Per-user namespace pattern | `daily-walrus:<sui-address>` |

## Memory Syncs

| Memory kind | Status | Content hash | Count |
|---|---|---|---|
| `world_cup_schedule` | `synced` | `a42baa72cf1e627c5330667f730600d239795a521489f52ffd24c4f5b075a5f5` | 104 fixtures, 104 open matches |
| `world_cup_teams` | `synced` | `9d561534f1179d30d76845bd862598a91597fa44673ed5cf93097f53987c16b7` | 48 teams, 1248 players, 49 docs |
| `player_roast_traits` | `synced` | `0061009a1c5ec8786f9b7e0c50691faa0f01c4a435decf67eff1a2bd56f8ac34` | 8 players, 8 docs |

## Data Proof

- Fixtures registered on Sui Mainnet: 104/104.
- Team profile blobs on Walrus Mainnet: 48/48.
- Full machine-readable snapshot, including all team Walrus blob/object IDs: `submission-pack/proof/mainnet-runtime-ids.json`.
- Runtime reports `publisherConfigured=false`, so global schedule raw blob URLs are not exposed through the tracking API. The canonical global schedule/team/player memory proof is the MemWal sync evidence above.
