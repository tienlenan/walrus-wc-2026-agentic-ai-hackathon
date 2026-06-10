const BASE = import.meta.env.VITE_MASTRA_URL ?? "http://localhost:4111";

export interface BriefingSource {
  sourceId: string;
  kind: string;
  title: string;
  url: string | null;
  publishedAt: string | null;
  facts: string[];
}

export interface BriefingTraceStep {
  agent: string;
  status: "ok" | "rejected" | "failed";
  summary: string;
  startedAt: string;
  completedAt: string;
  details?: Record<string, unknown>;
}

export interface BriefingProof {
  contentHash: string;
  walrusBlobId: string | null;
  walrusObjectId: string | null;
  walrusStatus: string;
  walrusBlobUrl: string | null;
  walrusObjectUrl: string | null;
  memwalNamespace: string | null;
  memoryStatus: string;
  outputObjectId: string | null;
  outputTxDigest: string | null;
}

export interface DailyBriefing {
  id: string;
  briefingDate: string;
  briefingType: string;
  status: string;
  title: string;
  slug: string;
  summary: string;
  markdown: string;
  contentJson: Record<string, unknown>;
  sources: BriefingSource[];
  agentTrace: BriefingTraceStep[];
  proof: BriefingProof;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function getLatestBriefing(): Promise<DailyBriefing | null> {
  const res = await fetch(`${BASE}/api/briefings/latest`);
  if (!res.ok) throw new Error(`briefing ${res.status}`);
  const data = (await res.json()) as { briefing: DailyBriefing | null };
  return data.briefing;
}

export async function listBriefings(limit = 12): Promise<DailyBriefing[]> {
  const res = await fetch(`${BASE}/api/briefings?limit=${limit}`);
  if (!res.ok) throw new Error(`briefings ${res.status}`);
  const data = (await res.json()) as { briefings: DailyBriefing[] };
  return data.briefings;
}
