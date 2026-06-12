import { getPool } from "@daily-walrus/db";
import { SUI_NETWORK } from "./sui-clients.js";
import type {
  AgentRunDto,
  AgentRunStatus,
  BriefingAgentTraceStep,
  BriefingSource,
  BriefingStatus,
  BriefingType,
  DailyBriefingDto,
} from "./briefing-types.js";

interface DailyBriefingRow {
  id: string;
  briefing_date: string | Date;
  briefing_type: BriefingType;
  status: BriefingStatus;
  title: string;
  slug: string;
  summary: string;
  markdown: string;
  content_json: Record<string, unknown>;
  sources: BriefingSource[];
  agent_trace: BriefingAgentTraceStep[];
  content_hash: string;
  walrus_blob_id: string | null;
  walrus_object_id: string | null;
  walrus_status: DailyBriefingDto["proof"]["walrusStatus"];
  walrus_blob_url?: string | null;
  walrus_object_url?: string | null;
  memwal_namespace: string | null;
  memory_status: string;
  output_object_id: string | null;
  output_tx_digest: string | null;
  published_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
}

interface AgentRunRow {
  id: string;
  workflow_type: string;
  workflow_key: string;
  status: AgentRunStatus;
  input_json: Record<string, unknown>;
  output_json: Record<string, unknown>;
  error: string | null;
  started_at: string | Date;
  completed_at: string | Date | null;
}

export interface UpsertBriefingInput {
  briefingDate: string;
  briefingType: BriefingType;
  status: BriefingStatus;
  title: string;
  slug: string;
  summary: string;
  markdown: string;
  contentJson: Record<string, unknown>;
  sources: BriefingSource[];
  agentTrace: BriefingAgentTraceStep[];
  contentHash: string;
  walrusBlobId?: string | null;
  walrusObjectId?: string | null;
  walrusStatus?: DailyBriefingDto["proof"]["walrusStatus"];
  walrusBlobUrl?: string | null;
  walrusObjectUrl?: string | null;
  memwalNamespace?: string | null;
  memoryStatus?: string;
  outputObjectId?: string | null;
  outputTxDigest?: string | null;
  publishedAt?: string | null;
}

function iso(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

function dateOnly(value: string | Date): string {
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
}

function jsonb(value: unknown): string {
  return JSON.stringify(value ?? {});
}

function walrusAggregatorUrl(): string {
  return (
    process.env.WALRUS_AGGREGATOR_URL ??
    (SUI_NETWORK === "mainnet" ? "https://aggregator.walrus-mainnet.walrus.space" : "https://aggregator.walrus-testnet.walrus.space")
  ).replace(/\/$/, "");
}

function explorerBaseUrl(): string {
  const configured = process.env.SUI_EXPLORER_OBJECT_BASE_URL ?? process.env.SUI_EXPLORER_BASE_URL;
  if (configured && !configured.includes("suiexplorer.com")) return configured.replace(/\/$/, "");
  return `https://suiscan.xyz/${SUI_NETWORK}/object`;
}

function blobUrl(blobId: string | null | undefined): string | null {
  return blobId ? `${walrusAggregatorUrl()}/v1/blobs/${blobId}` : null;
}

function objectUrl(objectId: string | null | undefined): string | null {
  if (!objectId) return null;
  const template = process.env.SUI_EXPLORER_OBJECT_URL_TEMPLATE;
  if (template && !template.includes("suiexplorer.com")) return template.replace("{network}", SUI_NETWORK).replace("{id}", objectId);
  return `${explorerBaseUrl()}/${objectId}`;
}

function mapBriefing(row: DailyBriefingRow): DailyBriefingDto {
  return {
    id: String(row.id),
    briefingDate: dateOnly(row.briefing_date),
    briefingType: row.briefing_type,
    status: row.status,
    title: String(row.title),
    slug: String(row.slug),
    summary: String(row.summary),
    markdown: String(row.markdown),
    contentJson: row.content_json ?? {},
    sources: row.sources ?? [],
    agentTrace: row.agent_trace ?? [],
    proof: {
      contentHash: String(row.content_hash),
      walrusBlobId: row.walrus_blob_id ?? null,
      walrusObjectId: row.walrus_object_id ?? null,
      walrusStatus: row.walrus_status ?? "not_configured",
      walrusBlobUrl: row.walrus_blob_url ?? blobUrl(row.walrus_blob_id),
      walrusObjectUrl: row.walrus_object_url ?? objectUrl(row.walrus_object_id),
      memwalNamespace: row.memwal_namespace ?? null,
      memoryStatus: String(row.memory_status ?? "not_configured"),
      outputObjectId: row.output_object_id ?? null,
      outputTxDigest: row.output_tx_digest ?? null,
    },
    publishedAt: iso(row.published_at),
    createdAt: iso(row.created_at) ?? new Date().toISOString(),
    updatedAt: iso(row.updated_at) ?? new Date().toISOString(),
  };
}

function mapRun(row: AgentRunRow): AgentRunDto {
  return {
    id: String(row.id),
    workflowType: String(row.workflow_type),
    workflowKey: String(row.workflow_key),
    status: row.status,
    inputJson: row.input_json ?? {},
    outputJson: row.output_json ?? {},
    error: row.error ?? null,
    startedAt: iso(row.started_at) ?? new Date().toISOString(),
    completedAt: iso(row.completed_at),
  };
}

export async function startAgentRun(input: {
  workflowType: string;
  workflowKey: string;
  inputJson: Record<string, unknown>;
}): Promise<AgentRunDto | null> {
  if (!process.env.DATABASE_URL) return null;
  const { rows } = await getPool().query<AgentRunRow>(
    `insert into agent_runs(workflow_type, workflow_key, status, input_json)
     values ($1,$2,'running',$3::jsonb)
     returning *`,
    [input.workflowType, input.workflowKey, jsonb(input.inputJson)],
  );
  if (!rows[0]) throw new Error("agent run insert failed");
  return mapRun(rows[0]);
}

export async function finishAgentRun(id: string | null | undefined, outputJson: Record<string, unknown>): Promise<AgentRunDto | null> {
  if (!process.env.DATABASE_URL || !id) return null;
  const { rows } = await getPool().query<AgentRunRow>(
    `update agent_runs
     set status = 'completed', output_json = $2::jsonb, completed_at = now()
     where id = $1
     returning *`,
    [id, jsonb(outputJson)],
  );
  return rows[0] ? mapRun(rows[0]) : null;
}

export async function failAgentRun(id: string | null | undefined, error: unknown, outputJson: Record<string, unknown> = {}): Promise<void> {
  if (!process.env.DATABASE_URL || !id) return;
  const message = error instanceof Error ? error.message : String(error);
  await getPool().query(
    `update agent_runs
     set status = 'failed', error = $2, output_json = $3::jsonb, completed_at = now()
     where id = $1`,
    [id, message.slice(0, 1000), jsonb(outputJson)],
  );
}

export async function upsertDailyBriefing(input: UpsertBriefingInput): Promise<DailyBriefingDto> {
  const fallback: DailyBriefingDto = {
    id: `briefing-${input.briefingDate}-${input.briefingType}`,
    briefingDate: input.briefingDate,
    briefingType: input.briefingType,
    status: input.status,
    title: input.title,
    slug: input.slug,
    summary: input.summary,
    markdown: input.markdown,
    contentJson: input.contentJson,
    sources: input.sources,
    agentTrace: input.agentTrace,
    proof: {
      contentHash: input.contentHash,
      walrusBlobId: input.walrusBlobId ?? null,
      walrusObjectId: input.walrusObjectId ?? null,
      walrusStatus: input.walrusStatus ?? "not_configured",
      walrusBlobUrl: input.walrusBlobUrl ?? null,
      walrusObjectUrl: input.walrusObjectUrl ?? null,
      memwalNamespace: input.memwalNamespace ?? null,
      memoryStatus: input.memoryStatus ?? "not_configured",
      outputObjectId: input.outputObjectId ?? null,
      outputTxDigest: input.outputTxDigest ?? null,
    },
    publishedAt: input.publishedAt ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (!process.env.DATABASE_URL) return fallback;

  const { rows } = await getPool().query<DailyBriefingRow>(
    `insert into daily_briefings(
       briefing_date, briefing_type, status, title, slug, summary, markdown,
       content_json, sources, agent_trace, content_hash, walrus_blob_id,
       walrus_object_id, walrus_status, memwal_namespace, memory_status,
       output_object_id, output_tx_digest, published_at
     )
     values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11,$12,$13,$14,$15,$16,$17,$18,$19)
     on conflict (briefing_date, briefing_type) do update set
       status = excluded.status,
       title = excluded.title,
       slug = excluded.slug,
       summary = excluded.summary,
       markdown = excluded.markdown,
       content_json = excluded.content_json,
       sources = excluded.sources,
       agent_trace = excluded.agent_trace,
       content_hash = excluded.content_hash,
       walrus_blob_id = excluded.walrus_blob_id,
       walrus_object_id = excluded.walrus_object_id,
       walrus_status = excluded.walrus_status,
       memwal_namespace = excluded.memwal_namespace,
       memory_status = excluded.memory_status,
       output_object_id = excluded.output_object_id,
       output_tx_digest = excluded.output_tx_digest,
       published_at = excluded.published_at,
       updated_at = now()
     returning *`,
    [
      input.briefingDate,
      input.briefingType,
      input.status,
      input.title,
      input.slug,
      input.summary,
      input.markdown,
      jsonb(input.contentJson),
      jsonb(input.sources),
      jsonb(input.agentTrace),
      input.contentHash,
      input.walrusBlobId ?? null,
      input.walrusObjectId ?? null,
      input.walrusStatus ?? "not_configured",
      input.memwalNamespace ?? null,
      input.memoryStatus ?? "not_configured",
      input.outputObjectId ?? null,
      input.outputTxDigest ?? null,
      input.publishedAt ?? null,
    ],
  );
  if (!rows[0]) return fallback;
  return mapBriefing(rows[0]);
}

export async function getBriefingByDateAndType(briefingDate: string, briefingType: BriefingType): Promise<DailyBriefingDto | null> {
  if (!process.env.DATABASE_URL) return null;
  const { rows } = await getPool().query<DailyBriefingRow>(
    `select * from daily_briefings where briefing_date = $1 and briefing_type = $2 limit 1`,
    [briefingDate, briefingType],
  );
  return rows[0] ? mapBriefing(rows[0]) : null;
}

export async function getDailyBriefing(id: string): Promise<DailyBriefingDto | null> {
  if (!process.env.DATABASE_URL) return null;
  const { rows } = await getPool().query<DailyBriefingRow>(`select * from daily_briefings where id = $1 or slug = $1 limit 1`, [id]);
  return rows[0] ? mapBriefing(rows[0]) : null;
}

export async function getLatestDailyBriefing(briefingType?: BriefingType): Promise<DailyBriefingDto | null> {
  if (!process.env.DATABASE_URL) return null;
  const values: unknown[] = [];
  const filter = briefingType ? "where briefing_type = $1" : "";
  if (briefingType) values.push(briefingType);
  const { rows } = await getPool().query<DailyBriefingRow>(
    `select * from daily_briefings ${filter} order by briefing_date desc, published_at desc nulls last, updated_at desc limit 1`,
    values,
  );
  return rows[0] ? mapBriefing(rows[0]) : null;
}

export async function listDailyBriefings(limit = 12, briefingType?: BriefingType): Promise<DailyBriefingDto[]> {
  if (!process.env.DATABASE_URL) return [];
  const values: unknown[] = [Math.max(1, Math.min(50, limit))];
  const filter = briefingType ? "where briefing_type = $2" : "";
  if (briefingType) values.push(briefingType);
  const { rows } = await getPool().query<DailyBriefingRow>(
    `select * from daily_briefings ${filter} order by briefing_date desc, published_at desc nulls last, updated_at desc limit $1`,
    values,
  );
  return rows.map(mapBriefing);
}

export async function listAgentRuns(limit = 20): Promise<AgentRunDto[]> {
  if (!process.env.DATABASE_URL) return [];
  const { rows } = await getPool().query<AgentRunRow>(
    `select * from agent_runs order by started_at desc limit $1`,
    [Math.max(1, Math.min(50, limit))],
  );
  return rows.map(mapRun);
}
