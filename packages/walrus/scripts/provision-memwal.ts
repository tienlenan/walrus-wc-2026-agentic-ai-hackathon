// Provision a MemWal account + delegate key (programmatic, best-practice: a dedicated on-chain wallet).
// Writes the results to .env.local itself (does not print secrets to stdout).
// Run: pnpm --filter @daily-walrus/walrus provision
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { createAccount, generateDelegateKey, addDelegateKey } from "@mysten-incubation/memwal/account";

// MemWal mainnet contract (docs.wal.app/walrus-memory/contract/overview)
const PACKAGE_ID = "0xcee7a6fd8de52ce645c38332bde23d4a30fd9426bc4681409733dd50958a24c6";
const REGISTRY_ID = "0x0da982cefa26864ae834a8a0504b904233d49e20fcc17c373c8bed99c75a7edd";
const RPC = process.env.SUI_RPC_URL ?? "https://fullnode.mainnet.sui.io:443";
const ENV_PATH = resolve(process.cwd(), "../../.env.local");

function upsertEnvLocal(updates: Record<string, string>): void {
  const lines = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, "utf8").split("\n") : [];
  for (const [k, v] of Object.entries(updates)) {
    const i = lines.findIndex((l) => l.startsWith(k + "="));
    if (i >= 0) lines[i] = `${k}=${v}`;
    else lines.push(`${k}=${v}`);
  }
  writeFileSync(ENV_PATH, lines.join("\n"));
}

async function suiBalanceSui(owner: string): Promise<number> {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "suix_getBalance", params: [owner] }),
  });
  const json = (await res.json()) as { result?: { totalBalance?: string } };
  return Number(json.result?.totalBalance ?? 0) / 1e9;
}

// 1) Session wallet (owner). Reuse SESSION_WALLET_KEY if present; if creating a new one → write it to .env.local immediately.
const kp = process.env.SESSION_WALLET_KEY
  ? Ed25519Keypair.fromSecretKey(process.env.SESSION_WALLET_KEY)
  : new Ed25519Keypair();
const suiPrivateKey = kp.getSecretKey();
const address = kp.toSuiAddress();
if (!process.env.SESSION_WALLET_KEY) {
  upsertEnvLocal({ SESSION_WALLET_KEY: suiPrivateKey });
  console.log("✓ Đã tạo ví session mới và lưu SESSION_WALLET_KEY vào .env.local");
}
console.log("Session wallet address:", address);

// 2) Check the SUI balance (need gas for 2 onchain tx).
const sui = await suiBalanceSui(address);
console.log("SUI balance:", sui);
if (sui < 0.05) {
  console.error(`\n❌ Cần nạp ~0.1 SUI (mainnet) để trả gas. Gửi SUI tới địa chỉ:\n   ${address}\nRồi chạy lại: pnpm --filter @daily-walrus/walrus provision`);
  process.exit(1);
}

// 3) Create the MemWalAccount onchain.
console.log("\n→ createAccount …");
const account = (await createAccount({
  packageId: PACKAGE_ID,
  registryId: REGISTRY_ID,
  suiPrivateKey,
  network: "mainnet",
})) as string | Record<string, string>;
const accountId = typeof account === "string" ? account : account.accountId ?? account.objectId ?? account.id;
if (!accountId) throw new Error("Không lấy được accountId: " + JSON.stringify(account));
console.log("   accountId:", accountId);

// 4) Delegate key + register onchain.
console.log("→ generateDelegateKey + addDelegateKey …");
const delegate = await generateDelegateKey();
await addDelegateKey({
  packageId: PACKAGE_ID,
  accountId,
  publicKey: delegate.publicKey,
  label: "the-daily-walrus",
  suiPrivateKey,
  network: "mainnet",
});

// 5) Write the credentials to .env.local.
upsertEnvLocal({ MEMWAL_ACCOUNT_ID: accountId, MEMWAL_DELEGATE_KEY: delegate.privateKey });
console.log("\n✅ Provisioned! Đã ghi MEMWAL_ACCOUNT_ID + MEMWAL_DELEGATE_KEY vào .env.local.");
console.log("   Thử: pnpm --filter @daily-walrus/walrus memwal:smoke");
