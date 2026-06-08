import { MemWal } from "@mysten-incubation/memwal";

const RELAYER_URL = process.env.MEMWAL_RELAYER_URL ?? "https://relayer.memory.walrus.xyz";

/** Memory chỉ bật khi đã có account + delegate key (sau khi provision). */
export function isMemoryEnabled(): boolean {
  return Boolean(process.env.MEMWAL_ACCOUNT_ID && process.env.MEMWAL_DELEGATE_KEY);
}

/** Namespace per-user → ký ức bám theo từng người dùng trong cùng 1 account. */
export function memNamespace(resourceId: string): string {
  return `daily-walrus:${resourceId}`;
}

// Cache client theo namespace (cùng key/account, khác namespace).
const clients = new Map<string, MemWal>();

function clientFor(namespace: string): MemWal {
  let c = clients.get(namespace);
  if (!c) {
    c = MemWal.create({
      key: process.env.MEMWAL_DELEGATE_KEY as string,
      accountId: process.env.MEMWAL_ACCOUNT_ID as string,
      serverUrl: RELAYER_URL,
      namespace,
    });
    clients.set(namespace, c);
  }
  return c;
}

interface RecallItemLike {
  text?: string;
  content?: string;
  memory?: string;
  snippet?: string;
}

/** Ghi 1 ký ức và chờ index xong. No-op nếu memory chưa cấu hình. */
export async function remember(namespace: string, text: string): Promise<void> {
  if (!isMemoryEnabled() || !text.trim()) return;
  await clientFor(namespace).rememberAndWait(text);
}

/** Gợi nhớ ký ức liên quan → mảng text. Rỗng nếu chưa cấu hình/không có. */
export async function recall(namespace: string, query: string, topK = 5): Promise<string[]> {
  if (!isMemoryEnabled()) return [];
  const res = (await clientFor(namespace).recall({ query })) as { results?: RecallItemLike[] };
  const items = res?.results ?? [];
  return items
    .map((r) => r.text ?? r.content ?? r.memory ?? r.snippet ?? "")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, topK);
}

/** Kiểm tra relayer còn sống. */
export async function memoryHealth(): Promise<boolean> {
  if (!isMemoryEnabled()) return false;
  try {
    await clientFor("health-check").health();
    return true;
  } catch {
    return false;
  }
}
