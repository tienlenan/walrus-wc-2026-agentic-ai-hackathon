import { MemWal } from "@mysten-incubation/memwal";

// Use a truthy check (not ??) so an empty-string env var on the host falls back to the default
// relayer instead of becoming serverUrl:"" and breaking every recall/remember call.
const RELAYER_URL = process.env.MEMWAL_RELAYER_URL?.trim() || "https://relayer.memory.walrus.xyz";

/** Memory is only enabled once an account + delegate key exist (after provisioning). */
export function isMemoryEnabled(): boolean {
  return Boolean(process.env.MEMWAL_ACCOUNT_ID && process.env.MEMWAL_DELEGATE_KEY);
}

/** Per-user namespace → memories follow each user within the same account. */
export function memNamespace(resourceId: string): string {
  return `daily-walrus:${resourceId}`;
}

// Cache the client by namespace (same key/account, different namespace).
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

/** Write 1 memory and wait for indexing to finish. No-op if memory is not configured. */
export async function remember(namespace: string, text: string): Promise<void> {
  if (!isMemoryEnabled() || !text.trim()) return;
  await clientFor(namespace).rememberAndWait(text);
}

export async function rememberBulk(namespace: string, texts: string[]): Promise<{ jobIds: string[]; total: number }> {
  const clean = texts.map((text) => text.trim()).filter(Boolean);
  if (!isMemoryEnabled() || clean.length === 0) return { jobIds: [], total: 0 };
  const jobIds: string[] = [];
  for (let i = 0; i < clean.length; i += 20) {
    const accepted = await clientFor(namespace).rememberBulk(
      clean.slice(i, i + 20).map((text) => ({
        text,
        namespace,
      })),
    );
    jobIds.push(...accepted.job_ids);
  }
  return { jobIds, total: clean.length };
}

/** Recall relevant memories → array of text. Empty if not configured/none found. */
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

/** Check whether the relayer is alive. */
export async function memoryHealth(): Promise<boolean> {
  if (!isMemoryEnabled()) return false;
  try {
    await clientFor("health-check").health();
    return true;
  } catch {
    return false;
  }
}
