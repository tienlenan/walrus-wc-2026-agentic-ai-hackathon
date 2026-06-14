import { lazy, type ComponentType } from "react";

// Walrus Sites serves every JS chunk as its own content-addressed blob through the wal.app
// portal (no CDN). Cold reads are slow and occasionally flaky, and a redeploy purges the old
// chunk blobs — so a cached index.html can reference hashes that no longer exist. Without
// recovery a single failed dynamic import unmounts the whole React tree (blank background).

const RELOAD_FLAG = "gil:chunk-reloaded";

export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|chunkloaderror|dynamically imported module/i.test(
    message,
  );
}

// Reload at most once per tab so a stale index.html (post-redeploy) is replaced with a fresh
// one. Returns true if a reload was triggered; false if we already tried this session.
export function reloadOnceForStaleChunk(): boolean {
  try {
    if (sessionStorage.getItem(RELOAD_FLAG)) return false;
    sessionStorage.setItem(RELOAD_FLAG, "1");
  } catch {
    /* sessionStorage unavailable — fall through and reload anyway */
  }
  window.location.reload();
  return true;
}

// Call after the app successfully mounts so the next post-redeploy stale chunk can reload again.
export function clearChunkReloadFlag(): void {
  try {
    sessionStorage.removeItem(RELOAD_FLAG);
  } catch {
    /* ignore */
  }
}

// One quiet retry absorbs transient Walrus blob flakiness; a second failure that looks like a
// stale chunk triggers a single reload (the never-resolving promise hands control to the reload).
export async function retryDynamicImport<T>(factory: () => Promise<T>): Promise<T> {
  try {
    return await factory();
  } catch {
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      return await factory();
    } catch (error) {
      if (isChunkLoadError(error) && reloadOnceForStaleChunk()) {
        return new Promise<T>(() => {});
      }
      throw error;
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mirror React.lazy so props infer
export function lazyWithRetry<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(() => retryDynamicImport(factory));
}
