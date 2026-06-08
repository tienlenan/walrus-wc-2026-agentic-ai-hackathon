---
phase: 8
title: "Deploy & Submission"
status: pending
priority: P1
effort: "1.5d"
dependencies: [5, 6, 7]
---

# Phase 8: Deploy & Submission

## Overview
Deploy site lên **Walrus Sites Mainnet** + server host; gắn SuiNS; chống pause/idle; quay **before/after** + roast card; hoàn tất **nộp bài** hackathon.

## Requirements
- **Functional:** build web → Walrus Sites Mainnet (SPA routing `ws-resources.json`); server (Mastra/tsx + indexer + score-keeper + roast-engine) lên Railway; gắn SuiNS; before/after demo; submission checklist.
- **Non-functional:** secret chỉ ở host env (không commit); keep-alive Supabase + host trong tuần chấm; tải nhanh.

## Architecture
- **Web:** `vite build` → `site-builder --context=mainnet deploy --epochs 12 apps/web/dist` (+`ws-resources.json` `{"routes":{"/*":"/index.html"}}`); gắn **SuiNS** cho URL đẹp.
- **Server:** Railway container chạy `node --import tsx src/serve.ts` (gồm chat, /api/tx/*, indexer loop, score-keeper, roast-engine); env vars (AI_GATEWAY_API_KEY, DATABASE_URL pooler, ENOKI/SPONSOR keys, MEMWAL/APP_DELEGATE, WC_* contract ids, FOOTBALL_API_KEY).
- **Keep-alive:** cron ping Supabase + server (tránh free pause/idle).

## Related Code Files
- Create: `scripts/deploy-walrus-site.sh`, `apps/server/Dockerfile` (+ Railway config), `scripts/keep-alive.ts`, `apps/web/public/ws-resources.json` (đã có — verify)
- Modify: `README.md` (live URL, demo), `.env.example` (đủ biến prod), `docs/03-architecture.md` + `docs/06-research-notes.md` (cập nhật M3)
- Delete: —

## Implementation Steps
0. **Migrate contract Testnet → Mainnet:** `sui client switch --env mainnet` + `sui client publish` (sau khi test kỹ trên testnet ở Phase 2); cập nhật `WC_PACKAGE_ID/REGISTRY/CAPS` mainnet vào env; re-point indexer/oracle/score-keeper sang mainnet. Nếu cần gasless cho user mainnet → bật gas-station/sponsored (Phase 1, đã hoãn từ dev).
1. Cài `site-builder` (suiup, mainnet config); fund ví deploy (WAL + SUI).
2. `vite build` → `site-builder deploy` Mainnet; verify SPA deep-link OK; gắn SuiNS.
3. Deploy server lên Railway (env vars, persistent); verify CORS từ site → server; indexer/score-keeper/roast-engine chạy.
4. Cron keep-alive (Supabase + server) cho tuần chấm.
5. Tạo ≥1 tài khoản có **≥4 ngày** lịch sử → quay **before/after** (Gil ngày 1 vs ngày N) + roast realtime + roast card.
6. Submission: DeepSurge + Airtable form + video ≤3' + post #Walrus trên X + **Walrus Memory feedback form** + GitHub public + logo/mô tả/website/contact + ví riêng cho session.

## Success Criteria
- [ ] Site **live Walrus Mainnet** (URL SuiNS), SPA routing OK; server ổn định (chat + roast + leaderboard realtime).
- [ ] Before/after thuyết phục + roast realtime + roast card chia sẻ được.
- [ ] Hoàn tất toàn bộ checklist nộp bài (xem `docs/02-requirements.md §2`).

## Risk Assessment
- Deploy Walrus Sites / Railway quirks → thử sớm; `ws-resources.json` bắt buộc cho SPA.
- Supabase pause + host idle → keep-alive cron.
- Timeline ≥4 ngày memory = đường găng → P3 + memory loop + roast chạy sớm.
- Secret prod → chỉ ở host env; rotate key đã lộ qua chat trước khi public.
