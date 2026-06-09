---
phase: 1
title: "Auth & Identity"
status: pending
priority: P1
effort: "1.5d"
dependencies: []
---

# Phase 1: Auth & Identity

## Overview
Đăng nhập đa người dùng bằng **ví Sui** hoặc **Google (zkLogin)**; địa chỉ Sui = danh tính (`resourceId`). Dựng **gas-station** ở backend để sponsor giao dịch (gasless) tới hạn mức, **fallback user tự trả gas**.

## Requirements
- **Functional:** connect ví (wallet-standard: Slush/Phantom…); login Google→zkLogin qua Enoki; lấy `address`; ký & execute 1 Move call; đường **sponsored** (server trả gas) + **fallback user-pays**.
- **Non-functional:** `ENOKI_PRIVATE_KEY` / khoá ví sponsor **chỉ ở server**; endpoint sponsor phải xác thực caller + whitelist Move targets + giới hạn quota; `VITE_ENOKI_PUBLIC_KEY` public an toàn.

## Architecture
- **Frontend provider tree:** `QueryClientProvider` → `SuiClientProvider` (mainnet) → `<RegisterEnokiWallets/>` → `WalletProvider autoConnect`. `ConnectButton` hiện cả ví + "Sign in with Google".
- **Identity:** `useCurrentAccount().address` (đồng nhất cho wallet & zkLogin).
- **Gas-station (best practice, kiểm soát chi phí):** ví sponsor của app (funded SUI) ở server. Client build tx `onlyTransactionKind:true` → `POST /api/tx/sponsor` (server gắn gas của sponsor, co-sign) → user ký → `POST /api/tx/execute`. Khi quota hết hoặc sponsor lỗi → client `useSignAndExecuteTransaction` (user tự trả).
- (Tùy chọn) Enoki sponsored thay cho gas-station tự host nếu mua Professional — giữ interface giống nhau để swap.

## Related Code Files
- Create: `apps/web/src/providers.tsx` (provider tree), `apps/web/src/components/connect-bar.tsx`, `apps/web/src/lib/sui-tx.ts` (sponsored + fallback execute), `apps/server/src/services/gas-station.ts`, `apps/server/src/routes/tx.ts`
- Modify: `apps/web/src/main.tsx` (bọc providers), `apps/web/src/lib/auth.ts` + `wallet-session.ts` (resourceId = verified address), `apps/server/src/serve.ts` (mount /api/tx/*), `.env.example` (+ENOKI keys, +SPONSOR_WALLET_KEY, +VITE_GOOGLE_CLIENT_ID), `apps/web/package.json` (deps)
- Delete: —

## Implementation Steps
1. `pnpm --filter @daily-walrus/web add @mysten/dapp-kit @mysten/enoki @tanstack/react-query` (sui đã có). Import `@mysten/dapp-kit/dist/index.css`.
2. Provider tree + `RegisterEnokiWallets` (guard `isEnokiNetwork`); Google clientId + redirectUrl (whitelist ở Google Cloud + Enoki Portal + `localhost:5173`).
3. `ConnectBar`: `ConnectButton` + nút Google (`isEnokiWallet`/`provider==='google'`); hiển thị address rút gọn + disconnect.
4. Auth/session: `resourceId = verified Sui address` from sign-in-with-Sui. No localStorage random identity for write/personalized endpoints; public data is read-only.
5. Backend `gas-station.ts`: ví sponsor (SPONSOR_WALLET_KEY), build `GasData` + co-sign sponsored tx (`@mysten/sui` Transaction `setSender`/`setGasOwner`); quota counter (Supabase `sponsor_usage`).
6. Routes `/api/tx/sponsor` (kind bytes → sponsored bytes+digest) + `/api/tx/execute` (digest+signature → executeTransactionBlock). Xác thực sender == authed address; whitelist target package.
7. `sui-tx.ts` client: `executeMoveCall(tx)` → thử sponsored; nếu 4xx/quota → fallback `useSignAndExecuteTransaction`.
8. Smoke: login wallet + Google; chạy 1 Move call dummy (vd `0x2::...`/devnet) qua cả 2 đường.

## Success Criteria
- [ ] Login được bằng **ví Sui** và bằng **Google (zkLogin)**; UI hiện địa chỉ Sui.
- [ ] 1 Move call chạy **sponsored (gasless)** thành công; khi quota off → **fallback user-pays** chạy.
- [ ] Secret (ENOKI_PRIVATE_KEY, SPONSOR_WALLET_KEY) chỉ ở server; endpoint sponsor có auth + whitelist + quota.

## Risk Assessment
- Enoki sponsored = trả phí ở quota lớn → **tự host gas-station** (ví sponsor funded) cho hackathon; Enoki chỉ lo zkLogin (Sandbox free). 
- **zkLogin address phụ thuộc clientId + salt** → pin Google clientId & salt service, đừng đổi sau launch (đổi = user mất account).
- Sponsor endpoint là "ví chi tiền" → auth + rate-limit + whitelist target bắt buộc.
