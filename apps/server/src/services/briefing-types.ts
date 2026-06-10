import type { WalrusBlobPointer } from "./walrus-blob.js";

export type BriefingType = "daily" | "post_match" | "knockout_update" | "manual_demo";
export type BriefingStatus = "draft" | "published" | "rejected" | "failed";
export type AgentRunStatus = "running" | "completed" | "failed";

export interface BriefingSource {
  sourceId: string;
  kind: "fixture_cache" | "team_profile" | "official_schedule" | "configured_web" | "manual_side_story" | "live_match";
  title: string;
  url: string | null;
  publishedAt: string | null;
  facts: string[];
}

export interface BriefingAgentTraceStep {
  agent: "orchestrator" | "scout" | "synthesizer" | "writer" | "moderator" | "publisher";
  status: "ok" | "rejected" | "failed";
  summary: string;
  startedAt: string;
  completedAt: string;
  details?: Record<string, unknown>;
}

export interface BriefingOutline {
  headlineAngles: string[];
  matchesToWatch: string[];
  teamNotes: string[];
  playerWatch: string[];
  memoryHooks: string[];
  sourceIds: string[];
}

export interface BriefingArticle {
  title: string;
  slug: string;
  summary: string;
  markdown: string;
}

export interface BriefingMemoryItem {
  briefingDate: string;
  briefingType: BriefingType;
  title: string;
  summary: string;
  contentHash: string;
  sourceIds: string[];
}

export interface BriefingMemorySnapshot {
  namespace: string;
  items: BriefingMemoryItem[];
  avoidSummaries: string[];
  avoidSourceIds: string[];
}

export interface BriefingProof {
  contentHash: string;
  walrusBlobId: string | null;
  walrusObjectId: string | null;
  walrusStatus: WalrusBlobPointer["status"];
  walrusBlobUrl: string | null;
  walrusObjectUrl: string | null;
  memwalNamespace: string | null;
  memoryStatus: string;
  outputObjectId: string | null;
  outputTxDigest: string | null;
}

export interface DailyBriefingDto {
  id: string;
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
  proof: BriefingProof;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentRunDto {
  id: string;
  workflowType: string;
  workflowKey: string;
  status: AgentRunStatus;
  inputJson: Record<string, unknown>;
  outputJson: Record<string, unknown>;
  error: string | null;
  startedAt: string;
  completedAt: string | null;
}

export interface RunDailyBriefingInput {
  date?: string;
  type?: BriefingType;
  focus?: string;
  force?: boolean;
}

export interface RunDailyBriefingResult {
  briefing: DailyBriefingDto;
  agentRun: AgentRunDto | null;
  reused: boolean;
}
