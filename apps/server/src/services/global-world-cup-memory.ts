import { ids } from "@daily-walrus/contract";
import { getPool } from "@daily-walrus/db";
import { isMemoryEnabled, recall, rememberBulk } from "@daily-walrus/walrus";
import { getGameSnapshot, type FixtureDto } from "./game-snapshot.js";
import { SUI_NETWORK } from "./sui-clients.js";
import { contentHash, publishJsonBlob, type WalrusBlobPointer } from "./walrus-blob.js";
import { getWorldCupSnapshot } from "./world-cup-data.js";
import { PLAYER_ROAST_TRAITS, buildPlayerRoastMemoryDocuments } from "../data/player-roast-traits.js";

export const WORLD_CUP_GLOBAL_NAMESPACE = "daily-walrus:global:world-cup-2026";

export interface GlobalMemoryStatusDto {
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

export interface RuntimeTrackingDto {
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
    lastSync: GlobalMemoryStatusDto;
    teamSync: GlobalMemoryStatusDto;
    playerRoastSync: GlobalMemoryStatusDto;
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
  sources: ReturnType<typeof getWorldCupSnapshot>["sources"];
}

interface SyncOptions {
  reason?: string;
  force?: boolean;
}

const MEMWAL_RELAYER_URL = process.env.MEMWAL_RELAYER_URL ?? "https://relayer.memory.walrus.xyz";

function explorerBaseUrl(): string {
  const configured = process.env.SUI_EXPLORER_OBJECT_BASE_URL ?? process.env.SUI_EXPLORER_BASE_URL;
  if (configured && !configured.includes("suiexplorer.com")) return configured.replace(/\/$/, "");
  return `https://suiscan.xyz/${SUI_NETWORK}/object`;
}

function objectUrl(objectId: string): string {
  const template = process.env.SUI_EXPLORER_OBJECT_URL_TEMPLATE;
  if (template && !template.includes("suiexplorer.com")) return template.replace("{network}", SUI_NETWORK).replace("{id}", objectId);
  return `${explorerBaseUrl()}/${objectId}`;
}

function walrusAggregatorUrl(): string {
  return (
    process.env.WALRUS_AGGREGATOR_URL ??
    (SUI_NETWORK === "mainnet" ? "https://aggregator.walrus-mainnet.walrus.space" : "https://aggregator.walrus-testnet.walrus.space")
  ).replace(/\/$/, "");
}

function blobUrl(blobId: string | null | undefined): string | null {
  return blobId ? `${walrusAggregatorUrl()}/v1/blobs/${blobId}` : null;
}

function memoryNamespaceUrl(): string | null {
  const account = process.env.MEMWAL_ACCOUNT_ID;
  if (!account) return null;
  return `${MEMWAL_RELAYER_URL.replace(/\/$/, "")}/account/${account}/namespace/${encodeURIComponent(WORLD_CUP_GLOBAL_NAMESPACE)}`;
}

async function ensureGlobalMemoryTable(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  await getPool().query(`
    create table if not exists global_memory_syncs (
      namespace text not null,
      memory_kind text not null default 'world_cup_schedule',
      content_hash text not null,
      status text not null default 'pending',
      reason text,
      error text,
      walrus_blob_id text,
      walrus_object_id text,
      walrus_status text,
      fixture_count int not null default 0,
      open_matches int not null default 0,
      closed_matches int not null default 0,
      not_onchain_matches int not null default 0,
      team_count int not null default 0,
      player_count int not null default 0,
      memory_docs int not null default 0,
      updated_at timestamptz not null default now()
    )
  `);
  await getPool().query(`
    alter table global_memory_syncs add column if not exists memory_kind text not null default 'world_cup_schedule';
    alter table global_memory_syncs add column if not exists reason text;
    alter table global_memory_syncs add column if not exists error text;
    alter table global_memory_syncs add column if not exists walrus_blob_id text;
    alter table global_memory_syncs add column if not exists walrus_object_id text;
    alter table global_memory_syncs add column if not exists walrus_status text;
    alter table global_memory_syncs add column if not exists fixture_count int not null default 0;
    alter table global_memory_syncs add column if not exists open_matches int not null default 0;
    alter table global_memory_syncs add column if not exists closed_matches int not null default 0;
    alter table global_memory_syncs add column if not exists not_onchain_matches int not null default 0;
    alter table global_memory_syncs add column if not exists team_count int not null default 0;
    alter table global_memory_syncs add column if not exists player_count int not null default 0;
    alter table global_memory_syncs add column if not exists memory_docs int not null default 0;
    alter table global_memory_syncs drop constraint if exists global_memory_syncs_pkey;
    alter table global_memory_syncs add constraint global_memory_syncs_pkey primary key (namespace, memory_kind);
  `);
}

function byMatchNumber(a: FixtureDto, b: FixtureDto): number {
  const an = Number(a.matchId);
  const bn = Number(b.matchId);
  if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
  return a.matchId.localeCompare(b.matchId);
}

function fixtureLine(fixture: FixtureDto): string {
  const kickoff = fixture.kickoff ? new Date(fixture.kickoff).toISOString() : "TBA";
  const score = fixture.status === "finished" ? ` result ${fixture.homeScore}-${fixture.awayScore}` : "";
  const group = fixture.groupName ? `Group ${fixture.groupName}` : fixture.stage ?? "Knockout";
  const gate = fixture.predictionOpen ? "prediction open" : fixture.predictionStatus.replace(/_/g, " ");
  return `M${fixture.matchId}: ${fixture.home} vs ${fixture.away}, ${group}, ${kickoff}, ${fixture.venue ?? "venue TBA"}, ${fixture.city ?? "city TBA"}, ${gate}${score}.`;
}

function buildStableSchedulePayload(fixtures: FixtureDto[]) {
  return fixtures.sort(byMatchNumber).map((fixture) => ({
    matchId: fixture.matchId,
    stage: fixture.stage,
    groupName: fixture.groupName,
    home: fixture.home,
    away: fixture.away,
    kickoff: fixture.kickoff,
    venue: fixture.venue,
    city: fixture.city,
    status: fixture.status,
    homeScore: fixture.homeScore,
    awayScore: fixture.awayScore,
    chainRegistered: fixture.chainRegistered,
    predictionStatus: fixture.predictionStatus,
  }));
}

function buildMemoryDocuments(fixtures: FixtureDto[]): string[] {
  const ordered = [...fixtures].sort(byMatchNumber);
  const open = ordered.filter((fixture) => fixture.predictionOpen).length;
  const notOnchain = ordered.filter((fixture) => fixture.predictionStatus === "not_onchain").length;
  const finished = ordered.filter((fixture) => fixture.status === "finished").length;
  const docs = [
    [
      "Daily Walrus global World Cup 2026 schedule memory.",
      `There are ${ordered.length} fixtures, ${open} currently open for prediction, ${notOnchain} known but not registered on-chain, ${finished} finished.`,
      "When a user asks about the schedule, group table, kickoff, venue, or whether predictions are open, answer from this global memory first.",
      "Predictions are only accepted when the match is registered on-chain, before kickoff, and not settled. Finished matches are oracle-scored and memory must be refreshed after result seed.",
    ].join(" "),
  ];

  for (const group of "ABCDEFGHIJKL") {
    const groupFixtures = ordered.filter((fixture) => fixture.groupName === group);
    if (groupFixtures.length === 0) continue;
    docs.push(`World Cup 2026 Group ${group} schedule: ${groupFixtures.map(fixtureLine).join(" ")}`);
  }

  const knockout = ordered.filter((fixture) => !fixture.groupName);
  if (knockout.length > 0) {
    docs.push(`World Cup 2026 knockout and TBD schedule: ${knockout.map(fixtureLine).join(" ")}`);
  }

  return docs;
}

async function previousHash(memoryKind = "world_cup_schedule"): Promise<string | null> {
  if (!process.env.DATABASE_URL) return null;
  await ensureGlobalMemoryTable();
  const { rows } = await getPool().query(`select content_hash from global_memory_syncs where namespace = $1 and memory_kind = $2`, [
    WORLD_CUP_GLOBAL_NAMESPACE,
    memoryKind,
  ]);
  return (rows[0]?.content_hash as string | undefined) ?? null;
}

async function upsertStatus(input: {
  hash: string;
  status: string;
  reason: string;
  error?: string | null;
  pointer?: WalrusBlobPointer;
  fixtures: FixtureDto[];
}): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  await ensureGlobalMemoryTable();
  const closedMatches = input.fixtures.filter((fixture) => !fixture.predictionOpen && fixture.predictionStatus !== "not_onchain").length;
  await getPool().query(
    `insert into global_memory_syncs(
       namespace, memory_kind, content_hash, status, reason, error, walrus_blob_id, walrus_object_id,
       walrus_status, fixture_count, open_matches, closed_matches, not_onchain_matches, updated_at
     )
     values ($1,'world_cup_schedule',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now())
     on conflict (namespace, memory_kind) do update set
       content_hash = excluded.content_hash,
       status = excluded.status,
       reason = excluded.reason,
       error = excluded.error,
       walrus_blob_id = excluded.walrus_blob_id,
       walrus_object_id = excluded.walrus_object_id,
       walrus_status = excluded.walrus_status,
       fixture_count = excluded.fixture_count,
       open_matches = excluded.open_matches,
       closed_matches = excluded.closed_matches,
       not_onchain_matches = excluded.not_onchain_matches,
       updated_at = now()`,
    [
      WORLD_CUP_GLOBAL_NAMESPACE,
      input.hash,
      input.status,
      input.reason,
      input.error ?? null,
      input.pointer?.blobId ?? null,
      input.pointer?.objectId ?? null,
      input.pointer?.status ?? null,
      input.fixtures.length,
      input.fixtures.filter((fixture) => fixture.predictionOpen).length,
      closedMatches,
      input.fixtures.filter((fixture) => fixture.predictionStatus === "not_onchain").length,
    ],
  );
}

export async function recordGlobalTeamMemorySync(input: {
  hash: string;
  status: string;
  reason: string;
  error?: string | null;
  teamCount: number;
  playerCount: number;
  memoryDocs: number;
}): Promise<GlobalMemoryStatusDto> {
  if (!process.env.DATABASE_URL) return getGlobalWorldCupMemoryStatus("not_synced", "world_cup_teams");
  await ensureGlobalMemoryTable();
  await getPool().query(
    `insert into global_memory_syncs(
       namespace, memory_kind, content_hash, status, reason, error,
       team_count, player_count, memory_docs, updated_at
     )
     values ($1,'world_cup_teams',$2,$3,$4,$5,$6,$7,$8,now())
     on conflict (namespace, memory_kind) do update set
       content_hash = excluded.content_hash,
       status = excluded.status,
       reason = excluded.reason,
       error = excluded.error,
       team_count = excluded.team_count,
       player_count = excluded.player_count,
       memory_docs = excluded.memory_docs,
       updated_at = now()`,
    [
      WORLD_CUP_GLOBAL_NAMESPACE,
      input.hash,
      input.status,
      input.reason,
      input.error ?? null,
      input.teamCount,
      input.playerCount,
      input.memoryDocs,
    ],
  );
  return getGlobalWorldCupMemoryStatus("not_synced", "world_cup_teams");
}

export async function syncGlobalPlayerRoastMemory(options: SyncOptions = {}): Promise<GlobalMemoryStatusDto> {
  const reason = options.reason ?? "manual";
  const memoryKind = "player_roast_traits";
  const docs = buildPlayerRoastMemoryDocuments();
  const stablePayload = {
    kind: memoryKind,
    updatedAt: new Date().toISOString(),
    traits: PLAYER_ROAST_TRAITS,
  };
  const hash = contentHash({ kind: memoryKind, traits: PLAYER_ROAST_TRAITS });

  if (!options.force && (await previousHash(memoryKind)) === hash) {
    return getGlobalWorldCupMemoryStatus("unchanged", memoryKind);
  }

  const pointer = await publishJsonBlob("global-player-roast-traits", stablePayload);
  let status = "memory_not_configured";
  let error: string | null = null;

  try {
    if (isMemoryEnabled()) {
      const accepted = await rememberBulk(WORLD_CUP_GLOBAL_NAMESPACE, docs);
      status = accepted.jobIds.length > 0 ? "synced" : "memory_not_configured";
    }
  } catch (err) {
    status = "failed";
    error = err instanceof Error ? err.message : String(err);
  }

  if (process.env.DATABASE_URL) {
    await ensureGlobalMemoryTable();
    await getPool().query(
      `insert into global_memory_syncs(
         namespace, memory_kind, content_hash, status, reason, error,
         walrus_blob_id, walrus_object_id, walrus_status, team_count, player_count, memory_docs, updated_at
       )
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now())
       on conflict (namespace, memory_kind) do update set
         content_hash = excluded.content_hash,
         status = excluded.status,
         reason = excluded.reason,
         error = excluded.error,
         walrus_blob_id = excluded.walrus_blob_id,
         walrus_object_id = excluded.walrus_object_id,
         walrus_status = excluded.walrus_status,
         team_count = excluded.team_count,
         player_count = excluded.player_count,
         memory_docs = excluded.memory_docs,
         updated_at = now()`,
      [
        WORLD_CUP_GLOBAL_NAMESPACE,
        memoryKind,
        hash,
        status,
        reason,
        error,
        pointer.blobId,
        pointer.objectId,
        pointer.status,
        new Set(PLAYER_ROAST_TRAITS.map((trait) => trait.teamCode)).size,
        PLAYER_ROAST_TRAITS.length,
        docs.length,
      ],
    );
  }

  return getGlobalWorldCupMemoryStatus(status, memoryKind);
}

export async function syncGlobalWorldCupMemory(options: SyncOptions = {}): Promise<GlobalMemoryStatusDto> {
  const reason = options.reason ?? "manual";
  const snapshot = await getGameSnapshot(null);
  const worldCup = getWorldCupSnapshot();
  const fixtures = snapshot.fixtures.length > 0 ? snapshot.fixtures : worldCup.fixtures.map((fixture) => ({
    ...fixture,
    status: "scheduled",
    homeScore: null,
    awayScore: null,
    predictionOpen: false,
    predictionStatus: "not_onchain" as const,
    predictionClosesAt: fixture.kickoff,
    predictionLockedReason: "match is not registered on-chain",
  }));
  const stablePayload = {
    sources: worldCup.sources,
    fixtures: buildStableSchedulePayload([...fixtures]),
  };
  const hash = contentHash(stablePayload);

  if (!options.force && (await previousHash()) === hash) {
    return getGlobalWorldCupMemoryStatus("unchanged");
  }

  const pointer = await publishJsonBlob("global-world-cup-schedule", stablePayload);
  try {
    if (isMemoryEnabled()) {
      const accepted = await rememberBulk(WORLD_CUP_GLOBAL_NAMESPACE, buildMemoryDocuments([...fixtures]));
      await upsertStatus({ hash, status: "synced", reason, pointer, fixtures });
      if (accepted.jobIds.length === 0) {
        await upsertStatus({ hash, status: "memory_not_configured", reason, pointer, fixtures });
      }
    } else {
      await upsertStatus({ hash, status: "memory_not_configured", reason, pointer, fixtures });
    }
  } catch (error) {
    await upsertStatus({
      hash,
      status: "failed",
      reason,
      error: error instanceof Error ? error.message : String(error),
      pointer,
      fixtures,
    });
  }

  return getGlobalWorldCupMemoryStatus();
}

export async function recallGlobalWorldCupMemory(query: string, topK = 6): Promise<string[]> {
  return recall(WORLD_CUP_GLOBAL_NAMESPACE, query, topK).catch(() => []);
}

export async function getGlobalWorldCupMemoryStatus(
  defaultStatus = "not_synced",
  memoryKind = "world_cup_schedule",
): Promise<GlobalMemoryStatusDto> {
  if (!process.env.DATABASE_URL) {
    return {
      namespace: WORLD_CUP_GLOBAL_NAMESPACE,
      memoryKind,
      memoryEnabled: isMemoryEnabled(),
      status: defaultStatus,
      reason: null,
      error: null,
      contentHash: null,
      walrusBlobId: null,
      walrusObjectId: null,
      walrusStatus: null,
      fixtureCount: 0,
      openMatches: 0,
      closedMatches: 0,
      notOnchainMatches: 0,
      teamCount: 0,
      playerCount: 0,
      memoryDocs: 0,
      updatedAt: null,
    };
  }

  await ensureGlobalMemoryTable();
  const { rows } = await getPool().query(`select * from global_memory_syncs where namespace = $1 and memory_kind = $2`, [
    WORLD_CUP_GLOBAL_NAMESPACE,
    memoryKind,
  ]);
  const row = rows[0];
  if (!row) {
    return {
      namespace: WORLD_CUP_GLOBAL_NAMESPACE,
      memoryKind,
      memoryEnabled: isMemoryEnabled(),
      status: defaultStatus,
      reason: null,
      error: null,
      contentHash: null,
      walrusBlobId: null,
      walrusObjectId: null,
      walrusStatus: null,
      fixtureCount: 0,
      openMatches: 0,
      closedMatches: 0,
      notOnchainMatches: 0,
      teamCount: 0,
      playerCount: 0,
      memoryDocs: 0,
      updatedAt: null,
    };
  }
  return {
    namespace: WORLD_CUP_GLOBAL_NAMESPACE,
    memoryKind: String(row.memory_kind ?? "world_cup_schedule"),
    memoryEnabled: isMemoryEnabled(),
    status: String(row.status ?? defaultStatus),
    reason: (row.reason as string | null) ?? null,
    error: (row.error as string | null) ?? null,
    contentHash: (row.content_hash as string | null) ?? null,
    walrusBlobId: (row.walrus_blob_id as string | null) ?? null,
    walrusObjectId: (row.walrus_object_id as string | null) ?? null,
    walrusStatus: (row.walrus_status as string | null) ?? null,
    fixtureCount: Number(row.fixture_count ?? 0),
    openMatches: Number(row.open_matches ?? 0),
    closedMatches: Number(row.closed_matches ?? 0),
    notOnchainMatches: Number(row.not_onchain_matches ?? 0),
    teamCount: Number(row.team_count ?? 0),
    playerCount: Number(row.player_count ?? 0),
    memoryDocs: Number(row.memory_docs ?? 0),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
  };
}

async function profileBlobCount(): Promise<number> {
  if (!process.env.DATABASE_URL) return 0;
  const { rows } = await getPool().query(`select count(*)::int as count from team_profiles where walrus_blob_id is not null`);
  return Number(rows[0]?.count ?? 0);
}

async function outputRecordCount(): Promise<number> {
  if (!process.env.DATABASE_URL) return 0;
  const { rows } = await getPool().query(`select count(*)::int as count from sui_output_records`);
  return Number(rows[0]?.count ?? 0);
}

export async function getRuntimeTracking(): Promise<RuntimeTrackingDto> {
  const [snapshot, memoryStatus, teamMemoryStatus, playerRoastMemoryStatus, profiles, outputs] = await Promise.all([
    getGameSnapshot(null),
    getGlobalWorldCupMemoryStatus(),
    getGlobalWorldCupMemoryStatus("not_synced", "world_cup_teams"),
    getGlobalWorldCupMemoryStatus("not_synced", "player_roast_traits"),
    profileBlobCount().catch(() => 0),
    outputRecordCount().catch(() => 0),
  ]);
  const fixtures = snapshot.fixtures;
  const contractIds = [
    ["package", "Move package", ids.pkg()],
    ["registry", "Match registry", ids.registry()],
    ["scoreboard", "Scoreboard", ids.scoreboard()],
    ["adminCap", "Admin cap", ids.adminCap()],
    ["oracleCap", "Oracle cap", ids.oracleCap()],
  ] as const;

  return {
    updatedAt: new Date().toISOString(),
    network: SUI_NETWORK,
    explorerBaseUrl: explorerBaseUrl(),
    walrusAggregatorUrl: walrusAggregatorUrl(),
    memory: {
      enabled: isMemoryEnabled(),
      relayerUrl: MEMWAL_RELAYER_URL,
      accountConfigured: Boolean(process.env.MEMWAL_ACCOUNT_ID),
      delegateConfigured: Boolean(process.env.MEMWAL_DELEGATE_KEY),
      globalNamespace: WORLD_CUP_GLOBAL_NAMESPACE,
      globalNamespaceUrl: memoryNamespaceUrl(),
      lastSync: memoryStatus,
      teamSync: teamMemoryStatus,
      playerRoastSync: playerRoastMemoryStatus,
    },
    contracts: contractIds.map(([key, label, objectId]) => ({
      key,
      label,
      objectId,
      url: objectUrl(objectId),
    })),
    walrus: {
      publisherConfigured: Boolean(process.env.WALRUS_PUBLISHER_URL),
      profileBlobs: profiles,
      outputRecords: outputs,
      globalScheduleBlobUrl: blobUrl(memoryStatus.walrusBlobId),
      globalScheduleObjectUrl: memoryStatus.walrusObjectId ? objectUrl(memoryStatus.walrusObjectId) : null,
    },
    fixtures: {
      total: fixtures.length,
      registered: fixtures.filter((fixture) => fixture.chainRegistered).length,
      open: fixtures.filter((fixture) => fixture.predictionOpen).length,
      notOnchain: fixtures.filter((fixture) => fixture.predictionStatus === "not_onchain").length,
      closedFinished: fixtures.filter((fixture) => fixture.predictionStatus === "closed_finished").length,
      closedKickoff: fixtures.filter((fixture) => fixture.predictionStatus === "closed_kickoff").length,
      unknown: fixtures.filter((fixture) => fixture.predictionStatus === "unknown").length,
      finished: fixtures.filter((fixture) => fixture.status === "finished").length,
    },
    sources: getWorldCupSnapshot().sources,
  };
}
