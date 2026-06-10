import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import type { SuiObjectChange, SuiTransactionBlockResponse } from "@mysten/sui/jsonRpc";
import { buildSubmitOutputRecord, OutputKind } from "@daily-walrus/contract";
import { getSession } from "./auth";

const BASE = import.meta.env.VITE_MASTRA_URL ?? "http://localhost:4111";

export type OutputKindKey = "chat" | "roast" | "match_vote" | "notebook_query" | "profile_pointer";
export type ResourceType = "chat_message" | "roast" | "match_vote" | "notebook_query" | "team_profile" | "gift_reveal" | "daily_briefing";

export interface WalrusOutputPointer {
  status: "not_configured" | "published" | "already_certified" | "failed";
  blobId: string | null;
  objectId: string | null;
  hash: string;
  error?: string;
}

export interface SuiOutputProof {
  outputKind: OutputKindKey;
  resourceType: ResourceType;
  resourceId: string;
  suiObjectId: string | null;
  txDigest: string;
  blobId: string | null;
  contentHash: string;
  walrusStatus: WalrusOutputPointer["status"];
}

const KIND_CODE: Record<OutputKindKey, number> = {
  chat: OutputKind.Chat,
  roast: OutputKind.Roast,
  match_vote: OutputKind.MatchVote,
  notebook_query: OutputKind.NotebookQuery,
  profile_pointer: OutputKind.ProfilePointer,
};

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => [key, normalize(item)]),
  );
}

export function stableJson(value: unknown): string {
  return JSON.stringify(normalize(value));
}

export async function sha256Hex(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(typeof value === "string" ? value : stableJson(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function findOutputObjectId(result: SuiTransactionBlockResponse): string | null {
  const created = result.objectChanges?.find(
    (change: SuiObjectChange) =>
      change.type === "created" &&
      "objectType" in change &&
      typeof change.objectType === "string" &&
      change.objectType.endsWith("::prediction_game::OutputRecord"),
  );
  return created && "objectId" in created && typeof created.objectId === "string" ? created.objectId : null;
}

export async function registerSuiOutput(proof: SuiOutputProof) {
  const session = getSession();
  if (!session?.token) throw new Error("Sign in first.");
  const res = await fetch(`${BASE}/api/outputs/register`, {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${session.token}` },
    body: JSON.stringify(proof),
  });
  if (!res.ok) throw new Error(`output register ${res.status}`);
  return (await res.json()) as { output: SuiOutputProof & { id: string; createdAt: string } };
}

export function useSuiOutputRecorder() {
  const client = useSuiClient();
  const { mutateAsync } = useSignAndExecuteTransaction<SuiTransactionBlockResponse>({
    execute: async ({ bytes, signature }) =>
      client.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: {
          showRawEffects: true,
          showObjectChanges: true,
          showEvents: true,
        },
      }),
  });

  return async function recordOutput(input: {
    outputKind: OutputKindKey;
    resourceType: ResourceType;
    resourceId: string;
    payload: unknown;
    pointer?: WalrusOutputPointer | null;
    register?: boolean;
  }): Promise<SuiOutputProof> {
    const contentHash = input.pointer?.hash || (await sha256Hex(input.payload));
    const tx = buildSubmitOutputRecord({
      kind: KIND_CODE[input.outputKind],
      blobId: input.pointer?.blobId ?? null,
      contentHash,
    });
    const result = await mutateAsync({ transaction: tx });
    const proof: SuiOutputProof = {
      outputKind: input.outputKind,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      suiObjectId: findOutputObjectId(result),
      txDigest: result.digest,
      blobId: input.pointer?.blobId ?? null,
      contentHash,
      walrusStatus: input.pointer?.status ?? "not_configured",
    };
    if (input.register !== false) await registerSuiOutput(proof);
    return proof;
  };
}
