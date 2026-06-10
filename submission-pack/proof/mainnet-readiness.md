# Mainnet Readiness

Captured on: 2026-06-09

## Completed

- Deploy wallet funded with SUI and WAL.
- Mainnet Move package published.
- Mainnet Walrus Sites object deployed.
- Mainnet Walrus Site content updated after the English-only cartoon gallery pass.
- 104/104 World Cup fixtures registered into the mainnet MatchRegistry.
- Walrus Memory global namespace synced on mainnet.
- 48/48 team profile blob/object pairs published on Walrus Mainnet.
- `apps/web/public/ws-resources.json` updated with the mainnet site object ID.
- Submission screenshots refreshed from the public `wal.app` URL after the latest mainnet build.
- Real public-app demo video recorded from `https://roast2026wc.wal.app/`.

## Mainnet IDs

| Item | Value |
|---|---|
| Deploy wallet | `0xf5ca4f02cf58d6448b6429c691b53c89c56b30c3ded38b45e73ce78829e99f6d` |
| Publish digest | `68d4RuFpzqNqzXgLum5KQFkd2qCRL137EkyS4YXpipv2` |
| Package | `0x2c9496db107257631c4bad0b8f97593a661f82df83b0bd84500bec57d7738beb` |
| MatchRegistry | `0xa992d65237ec8a953f04f0450c39203cc2777b2a67ae61add8c39f74578d3446` |
| Scoreboard | `0xfed0e2738f38965144bdcc840d4bf79ff0c9d75a9afd04753cd4f13c763cec10` |
| AdminCap | `0xd94e85b3a9e06ecd12b9c032412ffaa6d8d7044d9e97214621aad19528171c41` |
| OracleCap | `0x147d6290d21bd01d51a6cdafc2610cfcdb3d4272d7419d57d71df714fa90c25c` |
| Walrus Site object | `0xd7b94c015080b56d9ba19e18112eb69bf5d40dff83158631cd455cd9860c0158` |
| Walrus Site base36 diagnostic | `5dk6jtcpgo39hujesoc658qum6wetenol3b5avm3qpuywq0qqg` |
| Walrus Memory account | `0x416245a6d474f48e139e0ca6e3f6c89ae6edb9f15f2a6f0c2b5be1157fca2c51` |
| Walrus Memory relayer | `https://relayer.memory.walrus.xyz` |
| Walrus Memory global namespace | `daily-walrus:global:world-cup-2026` |
| Walrus Memory namespace URL | `https://relayer.memory.walrus.xyz/account/0x416245a6d474f48e139e0ca6e3f6c89ae6edb9f15f2a6f0c2b5be1157fca2c51/namespace/daily-walrus%3Aglobal%3Aworld-cup-2026` |

## Walrus Memory Sync Evidence

| Memory kind | Status | Content hash | Count | Updated |
|---|---|---|---|---|
| `world_cup_schedule` | `synced` | `a42baa72cf1e627c5330667f730600d239795a521489f52ffd24c4f5b075a5f5` | 104 fixtures, 104 open | `2026-06-09T17:06:13.109Z` |
| `world_cup_teams` | `synced` | `9d561534f1179d30d76845bd862598a91597fa44673ed5cf93097f53987c16b7` | 48 teams, 1248 players, 49 docs | `2026-06-09T17:07:50.215Z` |
| `player_roast_traits` | `synced` | `0061009a1c5ec8786f9b7e0c50691faa0f01c4a435decf67eff1a2bd56f8ac34` | 8 players, 8 docs | `2026-06-09T17:06:13.961Z` |

Full runtime ID snapshot, including 48 team profile Walrus blob/object pairs: `submission-pack/proof/mainnet-runtime-ids.json`.

## Fixture Seed Evidence

- MatchRegistry content verified with `match_count=104`.
- Match 1 register tx: `DXfbZj4U89VgBAxnm2qRAJo5hevwdxHKwW6b3cYh7WXS`
- Match 2 register tx: `3FzSbYBjEgSswFsRqUk7LmK6sob4ioSxpNsiUvg2XUBB`
- Match 104 register tx: `3vkHeidnmnYxJe3a9vc1hXTEzWAngv44L4robPxiVSub`

## Latest Site Content Verification

- Gallery now contains 12 cartoon-only cards.
- Gallery card copy and image text are English-only.
- Gallery links point to Walrus Mainnet blobs; no testnet gallery links remain.
- Latest sitemap shows the 12 `/gallery/cartoon-*.svg` resources and the old gallery resources removed.

## Remaining Manual Submission Items

1. Fill personal/team contact fields in Airtable.
2. Add DeepSurge project link.
3. Add X post URL after posting the demo/screenshot with `#Walrus`.
