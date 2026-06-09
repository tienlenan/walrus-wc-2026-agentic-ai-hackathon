# Mainnet Readiness

Captured on: 2026-06-09

## Completed

- Deploy wallet funded with SUI and WAL.
- Mainnet Move package published.
- Mainnet Walrus Sites object deployed.
- 104/104 World Cup fixtures registered into the mainnet MatchRegistry.
- `apps/web/public/ws-resources.json` updated with the mainnet site object ID.

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

## Fixture Seed Evidence

- MatchRegistry content verified with `match_count=104`.
- Match 1 register tx: `DXfbZj4U89VgBAxnm2qRAJo5hevwdxHKwW6b3cYh7WXS`
- Match 2 register tx: `3FzSbYBjEgSswFsRqUk7LmK6sob4ioSxpNsiUvg2XUBB`
- Match 104 register tx: `3vkHeidnmnYxJe3a9vc1hXTEzWAngv44L4robPxiVSub`

## Remaining Blocker

Public `wal.app` browsing still needs SuiNS.

Current check:

- `https://5dk6jtcpgo39hujesoc658qum6wetenol3b5avm3qpuywq0qqg.wal.app` returns 404.

Next action:

1. Buy or select a SuiNS name.
2. Point the SuiNS name to site object `0xd7b94c015080b56d9ba19e18112eb69bf5d40dff83158631cd455cd9860c0158`.
3. Use `https://<suins>.wal.app` as the final project URL.
4. Record a real sub-3-minute demo from that public URL.
5. Update Airtable and DeepSurge with the final URL.
