import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { OutputKind, buildSubmitOutputRecord } from "@daily-walrus/contract";
import { isMemoryEnabled, rememberBulk } from "@daily-walrus/walrus";
import type { BriefingAgentTraceStep, BriefingArticle, BriefingSource, BriefingType, DailyBriefingDto } from "./briefing-types.js";
import { BRIEFING_MEMORY_NAMESPACE } from "./briefing-memory.js";
import { upsertDailyBriefing } from "./briefing-store.js";
import { registerSuiOutputRecord } from "./sui-output-records.js";
import { getSuiGrpcClient } from "./sui-clients.js";
import { contentHash, publishJsonBlob } from "./walrus-blob.js";

interface PublishInput {
  briefingDate: string;
  briefingType: BriefingType;
  article: BriefingArticle;
  sources: BriefingSource[];
  agentTrace: BriefingAgentTraceStep[];
  contentJson: Record<string, unknown>;
}

function signerFromEnv(): Ed25519Keypair | null {
  const secret = process.env.BRIEFING_PUBLISHER_WALLET_KEY ?? process.env.SESSION_WALLET_KEY ?? process.env.ORACLE_WALLET_KEY;
  return secret ? Ed25519Keypair.fromSecretKey(secret) : null;
}

function digestFromResult(result: {
  Transaction?: { digest: string; status?: { success?: boolean; error?: unknown } };
  FailedTransaction?: { digest: string; status?: { success?: boolean; error?: unknown } };
}): string {
  const tx = result.Transaction ?? result.FailedTransaction;
  if (!tx) throw new Error("missing transaction result");
  if (result.FailedTransaction || tx.status?.success === false) {
    throw new Error(`transaction failed: ${String(tx.status?.error ?? "unknown")}`);
  }
  return tx.digest;
}

function buildMemoryDocs(input: PublishInput, hash: string, blobId: string | null): string[] {
  const sourceIds = input.sources.map((source) => source.sourceId).join(", ");
  const shortSummary = input.article.summary.replace(/\s+/g, " ").slice(0, 260);
  return [
    [
      `Daily Walrus dispatch published for ${input.briefingDate} (${input.briefingType}).`,
      `Title: ${input.article.title}.`,
      `Summary: ${shortSummary}.`,
      `Source IDs: ${sourceIds || "none"}.`,
      `Content hash: ${hash}.`,
      blobId ? `Walrus blob: ${blobId}.` : "Walrus blob not configured.",
    ].join(" "),
  ];
}

async function submitSuiReceipt(input: { blobId: string | null; contentHash: string; briefingId: string; walrusStatus: string }) {
  const signer = signerFromEnv();
  if (!signer) return { outputTxDigest: null, outputObjectId: null, status: "not_configured" };
  const sui = getSuiGrpcClient();
  const result = await sui.signAndExecuteTransaction({
    transaction: buildSubmitOutputRecord({
      kind: OutputKind.ProfilePointer,
      blobId: input.blobId ?? "",
      contentHash: input.contentHash,
    }),
    signer,
    include: { effects: true, events: true },
  });
  const txDigest = digestFromResult(result);
  await registerSuiOutputRecord(signer.toSuiAddress(), {
    outputKind: "profile_pointer",
    resourceType: "daily_briefing",
    resourceId: input.briefingId,
    txDigest,
    blobId: input.blobId,
    contentHash: input.contentHash,
    walrusStatus: input.walrusStatus,
  });
  return { outputTxDigest: txDigest, outputObjectId: null, status: "recorded" };
}

export async function publishDailyBriefing(input: PublishInput): Promise<DailyBriefingDto> {
  const basePayload = {
    kind: "daily-briefing",
    briefingDate: input.briefingDate,
    briefingType: input.briefingType,
    title: input.article.title,
    slug: input.article.slug,
    summary: input.article.summary,
    markdown: input.article.markdown,
    sources: input.sources,
    agentTrace: input.agentTrace,
    contentJson: input.contentJson,
    createdAt: new Date().toISOString(),
  };
  const hash = contentHash(basePayload);
  const pointer = await publishJsonBlob("daily-briefing", { ...basePayload, contentHash: hash });
  const memoryDocs = buildMemoryDocs(input, hash, pointer.blobId);
  let memoryStatus = "not_configured";
  if (isMemoryEnabled()) {
    try {
      await rememberBulk(BRIEFING_MEMORY_NAMESPACE, memoryDocs);
      memoryStatus = "synced";
    } catch (error) {
      memoryStatus = `failed:${error instanceof Error ? error.message.slice(0, 160) : "unknown"}`;
    }
  }

  const draft = await upsertDailyBriefing({
    briefingDate: input.briefingDate,
    briefingType: input.briefingType,
    status: "published",
    title: input.article.title,
    slug: input.article.slug,
    summary: input.article.summary,
    markdown: input.article.markdown,
    contentJson: { ...input.contentJson, payload: basePayload },
    sources: input.sources,
    agentTrace: input.agentTrace,
    contentHash: hash,
    walrusBlobId: pointer.blobId,
    walrusObjectId: pointer.objectId,
    walrusStatus: pointer.status,
    memwalNamespace: BRIEFING_MEMORY_NAMESPACE,
    memoryStatus,
    publishedAt: new Date().toISOString(),
  });

  let outputTxDigest: string | null = null;
  let outputObjectId: string | null = null;
  try {
    const receipt = await submitSuiReceipt({
      blobId: pointer.blobId,
      contentHash: hash,
      briefingId: draft.id,
      walrusStatus: pointer.status,
    });
    outputTxDigest = receipt.outputTxDigest;
    outputObjectId = receipt.outputObjectId;
  } catch (error) {
    console.warn("[briefings] Sui receipt failed:", error instanceof Error ? error.message : error);
  }

  if (!outputTxDigest && !outputObjectId) return draft;
  return upsertDailyBriefing({
    briefingDate: input.briefingDate,
    briefingType: input.briefingType,
    status: "published",
    title: input.article.title,
    slug: input.article.slug,
    summary: input.article.summary,
    markdown: input.article.markdown,
    contentJson: { ...input.contentJson, payload: basePayload },
    sources: input.sources,
    agentTrace: input.agentTrace,
    contentHash: hash,
    walrusBlobId: pointer.blobId,
    walrusObjectId: pointer.objectId,
    walrusStatus: pointer.status,
    memwalNamespace: BRIEFING_MEMORY_NAMESPACE,
    memoryStatus,
    outputObjectId,
    outputTxDigest,
    publishedAt: new Date().toISOString(),
  });
}
