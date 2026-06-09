import { getSession } from "./auth";
import type { WalrusOutputPointer } from "./sui-output-record";

const BASE = import.meta.env.VITE_MASTRA_URL ?? "http://localhost:4111";

export interface SquadPlayer {
  number: number;
  position: "GK" | "DF" | "MF" | "FW";
  playerName: string;
  firstNames: string;
  lastNames: string;
  shirtName: string;
  dateOfBirth: string;
  club: string;
  heightCm: number;
}

export interface TeamProfile {
  code: string;
  name: string;
  groupName: string;
  confederation: string;
  coach: string | null;
  coachNationality: string | null;
  flagEmoji: string;
  squadSourceUrl: string;
  walrusStatus: string;
  walrusBlobId: string | null;
  walrusObjectId: string | null;
  profileHash: string;
  squad: SquadPlayer[];
}

export interface WorldCupFixture {
  matchId: string;
  stage: string;
  groupName: string | null;
  homeTeamCode: string | null;
  awayTeamCode: string | null;
  home: string;
  away: string;
  kickoff: string;
  venue: string;
  city: string;
  sourceUrl: string;
  chainRegistered: boolean;
}

export interface WorldCupSnapshot {
  sources: {
    fifaScheduleUrl: string;
    crawlableScheduleUrl: string;
    matchTimesUrl: string;
    squadSourceUrl: string;
    squadDocumentTimestampUtc: string;
    scheduleGeneratedAtUtc: string;
  };
  teams: TeamProfile[];
  fixtures: WorldCupFixture[];
  updatedAt: string;
}

export interface GlobalMemoryStatus {
  namespace: string;
  memoryKind: string;
  memoryEnabled: boolean;
  status: string;
  reason: string | null;
  error: string | null;
  contentHash: string | null;
  walrusBlobId: string | null;
  walrusObjectId: string | null;
  walrusStatus: string | null;
  fixtureCount: number;
  openMatches: number;
  closedMatches: number;
  notOnchainMatches: number;
  teamCount: number;
  playerCount: number;
  memoryDocs: number;
  updatedAt: string | null;
}

export interface RuntimeTracking {
  updatedAt: string;
  network: string;
  explorerBaseUrl: string;
  walrusAggregatorUrl: string;
  memory: {
    enabled: boolean;
    relayerUrl: string;
    accountConfigured: boolean;
    delegateConfigured: boolean;
    globalNamespace: string;
    globalNamespaceUrl: string | null;
    lastSync: GlobalMemoryStatus;
    teamSync: GlobalMemoryStatus;
    playerRoastSync: GlobalMemoryStatus;
  };
  contracts: Array<{
    key: string;
    label: string;
    objectId: string;
    url: string;
  }>;
  walrus: {
    publisherConfigured: boolean;
    profileBlobs: number;
    outputRecords: number;
    globalScheduleBlobUrl: string | null;
    globalScheduleObjectUrl: string | null;
  };
  fixtures: {
    total: number;
    registered: number;
    open: number;
    notOnchain: number;
    closedFinished: number;
    closedKickoff: number;
    unknown: number;
    finished: number;
  };
  sources: WorldCupSnapshot["sources"];
}

export interface Roast {
  id: string;
  targetType: "team" | "player";
  targetId: string;
  targetName: string;
  teamCode: string | null;
  playerNumber: number | null;
  roastText: string;
  cardTitle: string;
  imageUrl: string | null;
  outputObjectId: string | null;
  outputTxDigest: string | null;
  outputHash: string | null;
  walrusBlobId: string | null;
  walrusStatus: string;
  outputPointer: WalrusOutputPointer;
  createdAt: string;
  memoryEnabled: boolean;
}

export async function getWorldCupSnapshot(): Promise<WorldCupSnapshot> {
  const res = await fetch(`${BASE}/api/world-cup/snapshot`);
  if (!res.ok) throw new Error(`world cup snapshot ${res.status}`);
  return (await res.json()) as WorldCupSnapshot;
}

export async function getRuntimeTracking(): Promise<RuntimeTracking> {
  const res = await fetch(`${BASE}/api/tracking/runtime`);
  if (!res.ok) throw new Error(`runtime tracking ${res.status}`);
  return (await res.json()) as RuntimeTracking;
}

export async function getNotebook(query: string): Promise<{ memories: string[]; memoryEnabled: boolean }> {
  const session = getSession();
  if (!session?.token) throw new Error("Sign in first.");
  const headers: Record<string, string> = { "content-type": "application/json" };
  headers.Authorization = `Bearer ${session.token}`;

  const res = await fetch(`${BASE}/api/gil/notebook`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`notebook ${res.status}`);
  return (await res.json()) as { memories: string[]; memoryEnabled: boolean };
}

export async function listRoasts(): Promise<Roast[]> {
  const res = await fetch(`${BASE}/api/roasts?limit=20`);
  if (!res.ok) throw new Error(`roasts ${res.status}`);
  const data = (await res.json()) as { roasts: Roast[] };
  return data.roasts;
}

export async function createRoast(input: {
  targetType: "team" | "player";
  targetName?: string;
  teamCode?: string;
  playerNumber?: number;
  lang?: string;
  roastSeverity?: string;
  instructions?: string;
}): Promise<Roast> {
  const session = getSession();
  if (!session?.token) throw new Error("Sign in first.");
  const headers: Record<string, string> = { "content-type": "application/json" };
  headers.Authorization = `Bearer ${session.token}`;

  const res = await fetch(`${BASE}/api/roast`, {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`roast ${res.status}`);
  const data = (await res.json()) as { roast: Roast };
  return data.roast;
}
