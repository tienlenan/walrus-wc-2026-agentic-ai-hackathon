const targets = [
  process.env.MASTRA_URL,
  process.env.VITE_MASTRA_URL,
  process.env.PUBLIC_SITE_URL,
].filter(Boolean) as string[];

async function ping(url: string): Promise<{ url: string; ok: boolean; status?: number; error?: string }> {
  try {
    const res = await fetch(url, { method: "GET" });
    return { url, ok: res.ok, status: res.status };
  } catch (error) {
    return { url, ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function main(): Promise<void> {
  if (targets.length === 0) {
    console.log("No keep-alive targets configured. Set MASTRA_URL, VITE_MASTRA_URL, or PUBLIC_SITE_URL.");
    return;
  }
  console.log(await Promise.all(targets.map(ping)));
}

void main();
