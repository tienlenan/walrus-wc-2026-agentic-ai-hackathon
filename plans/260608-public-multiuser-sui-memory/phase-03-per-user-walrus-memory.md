---
phase: 3
title: "Per-User Walrus Memory"
status: pending
priority: P1
effort: "1d"
dependencies: [1]
---

# Phase 3: Per-User Walrus Memory (user-owned MemWalAccount)

## Overview
Mỗi user có **MemWalAccount riêng do ví họ sở hữu** (tạo lúc onboarding bằng sponsored tx) + **app delegate key** để Gil ghi/đọc ký ức hộ. Memory THẬT SỰ thuộc về user (revocable, portable) — narrative ăn điểm nhất của hackathon.

> ⚠️ **RED TEAM (Balanced):** GIỮ namespace single-account hiện có làm **fallback luôn-chạy** (verify trước ở Pre-flight); user-owned account = **additive sau Spike B** (MemWal SDK có trả unsigned PTB không?). KHÔNG xoá namespace path. `APP_DELEGATE_KEY` (ghi mọi user) → secret store + rotation runbook. resourceId phải từ **session đã verify chữ ký**, không từ body. Chi tiết: plan.md §Per-phase deltas P3.

## Requirements
- **Functional:** lần đầu login (nếu chưa có account cho address) → `createAccount` + `addDelegateKey(APP_PUBKEY)` (sponsored, gasless); map `address → accountId`; `remember`/`recall` scope theo accountId của user; Gil dùng đúng account của user đang chat.
- **Non-functional:** app giữ **1 delegate keypair** duy nhất (`APP_DELEGATE_KEY`, server-only) dùng làm delegate cho TẤT CẢ account user; xử lý user chưa onboard (degrade: chat không nhớ).

## Architecture
- App sinh 1 delegate keypair 1 lần (`generateDelegateKey()` → APP_DELEGATE_KEY + APP_PUBKEY, lưu server).
- **Onboarding:** trên client (đã login), nếu `users.memwal_account_id` trống → build tx `account::create_account(registry, clock)` + `account::add_delegate_key(account, APP_PUBKEY, APP_SUI_ADDR, "the-daily-walrus", clock)` → sponsored execute (Phase 1) → lưu `memwal_account_id` vào Supabase.
- **Server memory:** `MemWal.create({ key: APP_DELEGATE_KEY, accountId: <user accountId>, namespace: "daily-walrus" })`; cache theo accountId.
- MemWal mainnet PACKAGE_ID `0xcee7a6…a24c6`, REGISTRY_ID `0x0da982…a7edd`.

## Related Code Files
- Modify: `packages/walrus/src/memwal-client.ts` (nhận `accountId` per call/factory; cache key = accountId|namespace; bỏ phụ thuộc MEMWAL_ACCOUNT_ID global, thêm APP_DELEGATE_KEY)
- Create: `packages/walrus/src/build-onboarding-tx.ts` (tạo PTB create_account+add_delegate_key, kind-only để sponsor), `apps/web/src/lib/memory-onboarding.ts`, `apps/server/src/routes/memory.ts` (lookup/save accountId)
- Modify: `apps/server/src/services/chat-with-gil.ts` (lấy accountId của user từ Supabase, truyền vào recall/remember), `packages/db` (helper users.memwal_account_id), `.env.example` (+MEMWAL_PACKAGE_ID, MEMWAL_REGISTRY_ID, APP_DELEGATE_KEY, APP_DELEGATE_PUBKEY)

## Implementation Steps
1. Sinh APP delegate keypair 1 lần (script) → lưu `APP_DELEGATE_KEY`/`APP_DELEGATE_PUBKEY` vào `.env.local`.
2. Refactor `memwal-client.ts`: `getMemwal(accountId, namespace)` dùng APP_DELEGATE_KEY; `remember(accountId, ns, text)` / `recall(accountId, ns, query)`.
3. `build-onboarding-tx.ts`: PTB create_account + add_delegate_key (kind-only) → sponsored execute.
4. `memory-onboarding.ts` (web): sau login, gọi `/api/memory/account`; nếu chưa có → chạy onboarding tx (sponsored) → POST accountId về server lưu Supabase.
5. `chat-with-gil.ts`: nạp `accountId` của user (Supabase) → recall/remember theo account đó. User chưa onboard → chat không nhớ (degrade) + nhắc onboard.
6. Verify multi-user: 2 địa chỉ khác nhau → 2 MemWalAccount khác (owner = address của họ); Gil nhớ độc lập; mở on-chain xác minh owner.

## Success Criteria
- [ ] 2 user (2 địa chỉ) login → mỗi người có MemWalAccount riêng, **owner = địa chỉ của họ** (verify on-chain).
- [ ] Gil nhớ độc lập từng user (before/after per user) qua app delegate key.
- [ ] Onboarding gasless (sponsored); accountId lưu Supabase; không lộ APP_DELEGATE_KEY ra client.

## Risk Assessment
- Onboard 2 tx → sponsored để gasless; nếu sponsor fail → fallback user-pays (cần user có chút SUI — hiếm với zkLogin) → cân nhắc luôn sponsor onboarding.
- MemWal beta (v0.0.7) → pin version; giữ raw `@mysten/walrus` làm proof-of-write nếu BGK đòi ví user ghi.
- APP_DELEGATE_KEY là khoá ghi mọi account → server-only, cân nhắc rotate.
