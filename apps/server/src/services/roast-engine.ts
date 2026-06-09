import { randomUUID } from "node:crypto";
import { gil } from "../mastra/agents/gil.js";
import { getPool } from "@daily-walrus/db";
import { isMemoryEnabled, memNamespace, recall, remember } from "@daily-walrus/walrus";
import { normalizeRoastSeverity } from "@daily-walrus/shared";
import { getTeamProfiles } from "./world-cup-data.js";
import { publishJsonBlob, type WalrusBlobPointer } from "./walrus-blob.js";
import { findPlayerRoastTraits } from "../data/player-roast-traits.js";

export interface RoastInput {
  targetType: "team" | "player";
  targetId?: string;
  targetName?: string;
  teamCode?: string;
  playerNumber?: number;
  roastSeverity?: string;
  lang?: string;
  instructions?: string;
}

export interface RoastDto {
  id: string;
  targetType: "team" | "player";
  targetId: string;
  targetName: string;
  teamCode: string | null;
  playerNumber: number | null;
  roastText: string;
  cardTitle: string;
  imageUrl: string | null;
  sourceContext: unknown;
  outputObjectId: string | null;
  outputTxDigest: string | null;
  outputHash: string | null;
  walrusBlobId: string | null;
  walrusStatus: string;
  outputPointer: WalrusBlobPointer;
  createdAt: string;
  memoryEnabled: boolean;
}

function fallbackRoast(targetName: string, lang?: string): string {
  if (lang === "vi") {
    return `${targetName} vừa bước vào tòa soạn và cái bảng chiến thuật tự xin nghỉ phép. Gil chấm 6/10: có cố gắng, nhưng bóng đá không cộng điểm thương hại.`;
  }
  return `${targetName} walked into Gil's newsroom and the tactics board asked for annual leave. Six out of ten for effort, zero bonus points for dignity.`;
}

function normalizeTarget(input: RoastInput): {
  targetType: "team" | "player";
  targetId: string;
  targetName: string;
  teamCode: string | null;
  playerNumber: number | null;
  context: Record<string, unknown>;
} {
  const teamCode = input.teamCode?.trim().toUpperCase() || null;
  const team = teamCode ? getTeamProfiles().find((item) => item.code === teamCode) : null;
  const player =
    input.playerNumber && team ? team.squad.find((item) => item.number === input.playerNumber) ?? null : null;

  if (input.targetType === "player") {
    const targetName = input.targetName?.trim() || player?.playerName || "Unknown player";
    return {
      targetType: "player",
      targetId: input.targetId?.trim() || `${teamCode ?? "free"}:${input.playerNumber ?? targetName.toLowerCase()}`,
      targetName,
      teamCode,
      playerNumber: input.playerNumber ?? player?.number ?? null,
      context: { team: team ? { code: team.code, name: team.name, group: team.groupName, coach: team.coach } : null, player },
    };
  }

  const targetName = input.targetName?.trim() || team?.name || teamCode || "Unknown team";
  return {
    targetType: "team",
    targetId: input.targetId?.trim() || teamCode || targetName.toLowerCase(),
    targetName,
    teamCode,
    playerNumber: null,
    context: team
      ? {
          code: team.code,
          name: team.name,
          group: team.groupName,
          coach: team.coach,
          confederation: team.confederation,
          squadSample: team.squad.slice(0, 6).map((player) => player.playerName),
        }
      : {},
  };
}

async function saveRoast(identity: string, roast: Omit<RoastDto, "id" | "createdAt" | "memoryEnabled">): Promise<RoastDto> {
  if (!process.env.DATABASE_URL) {
    return { ...roast, id: randomUUID(), createdAt: new Date().toISOString(), memoryEnabled: isMemoryEnabled() };
  }

  const { rows } = await getPool().query(
    `insert into roasts(
      target_type, target_id, target_name, team_code, player_number, roast_text,
      card_title, image_url, source_context, resource_id, output_hash, walrus_blob_id, walrus_status
    )
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13)
    returning id, created_at`,
    [
      roast.targetType,
      roast.targetId,
      roast.targetName,
      roast.teamCode,
      roast.playerNumber,
      roast.roastText,
      roast.cardTitle,
      roast.imageUrl,
      JSON.stringify(roast.sourceContext),
      identity,
      roast.outputHash,
      roast.walrusBlobId,
      roast.walrusStatus,
    ],
  );

  return {
    ...roast,
    id: String(rows[0].id),
    createdAt: new Date(rows[0].created_at).toISOString(),
    memoryEnabled: isMemoryEnabled(),
  };
}

export async function createRoast(identity: string, input: RoastInput): Promise<RoastDto> {
  const target = normalizeTarget(input);
  const ns = memNamespace(identity);
  const memories = await recall(ns, `roast ${target.targetName}`).catch(() => [] as string[]);
  const playerRoastTraits = target.targetType === "player" ? findPlayerRoastTraits(target.targetName, target.teamCode) : [];
  const severity = normalizeRoastSeverity(input.roastSeverity);
  const roastDirectionVi =
    severity === "light"
      ? "giọng vui hơn, chấm nhẹ, châm biếm lịch sự."
      : severity === "savage"
        ? "không thương tiếc, mỉa mai sâu và sắc, punchline dứt khoát."
        : "chuẩn báo lá cải: châm biếm thẳng thắng, không để người đọc lặng lẽ tha thứ.";
  const roastDirectionEn =
    severity === "light"
      ? "light and playful, mostly teasing and mildly sarcastic."
      : severity === "savage"
        ? "merciless and cutting, with bold sarcasm and strong punchlines."
        : "standard tabloid edge: witty, sharp, and confident.";

  const prompt =
    input.lang === "vi"
      ? `Viết một roast bóng đá ngắn bằng tiếng Việt cho ${target.targetName}. Giọng Gil: ${roastDirectionVi} Giữ ranh giới: không thù ghét, không nhắm vào protected class, không bôi nhọ đời tư. Nếu JSON có playerRoastTraits, ưu tiên roastAngles/safeLines và tuân thủ avoid. Dựa trên context JSON và memory nếu có. 2-4 câu, có punchline.`
      : `Write a short football roast in English for ${target.targetName}. Gil voice: ${roastDirectionEn} Keep boundaries: no hate, no protected-class attacks, no private-life claims. If JSON includes playerRoastTraits, prioritize roastAngles/safeLines and obey avoid. Use the JSON context and memory if relevant. 2-4 sentences with a punchline.`;

  let roastText: string;
  try {
    const res = await gil.generate([
      { role: "system", content: `${prompt}\nCustom instructions: ${input.instructions ?? "none"}` },
      {
        role: "user",
        content: JSON.stringify({
          target,
          memories,
          playerRoastTraits,
        }),
      },
    ]);
    roastText = res.text.trim() || fallbackRoast(target.targetName, input.lang);
  } catch (error) {
    console.error("[roast] gil failed:", error instanceof Error ? error.message : error);
    roastText = fallbackRoast(target.targetName, input.lang);
  }

  const cardTitle = input.lang === "vi" ? `Gil roast ${target.targetName}` : `Gil roasts ${target.targetName}`;
  const sourceContext = {
    target: target.context,
    memoriesUsed: memories.length,
    playerRoastTraits,
    roastSeverity: severity,
  };
  const outputPointer = await publishJsonBlob("roast-output", {
    resourceId: identity,
    targetType: target.targetType,
    targetId: target.targetId,
    targetName: target.targetName,
    teamCode: target.teamCode,
    playerNumber: target.playerNumber,
    cardTitle,
    roastText,
    sourceContext,
    createdAt: new Date().toISOString(),
  });
  const saved = await saveRoast(identity, {
    targetType: target.targetType,
    targetId: target.targetId,
    targetName: target.targetName,
    teamCode: target.teamCode,
    playerNumber: target.playerNumber,
    roastText,
    cardTitle,
    imageUrl: null,
    sourceContext,
    outputObjectId: null,
    outputTxDigest: null,
    outputHash: outputPointer.hash,
    walrusBlobId: outputPointer.blobId,
    walrusStatus: outputPointer.status,
    outputPointer,
  });

  if (isMemoryEnabled()) {
    void remember(ns, `Gil roasted ${target.targetName}: ${roastText}`).catch((error) =>
      console.error("[roast] remember failed:", error?.message ?? error),
    );
  }

  return saved;
}

export async function listRoasts(limit = 20): Promise<RoastDto[]> {
  if (!process.env.DATABASE_URL) return [];
  const { rows } = await getPool().query(
    `select id, target_type, target_id, target_name, team_code, player_number, roast_text,
       card_title, image_url, source_context, output_object_id, output_tx_digest,
       output_hash, walrus_blob_id, walrus_status, created_at
     from roasts
     order by created_at desc
     limit $1`,
    [Math.max(1, Math.min(50, limit))],
  );
  return rows.map((row) => ({
    id: String(row.id),
    targetType: row.target_type,
    targetId: String(row.target_id),
    targetName: String(row.target_name),
    teamCode: row.team_code ?? null,
    playerNumber: row.player_number == null ? null : Number(row.player_number),
    roastText: String(row.roast_text),
    cardTitle: String(row.card_title ?? `Gil roasts ${row.target_name}`),
    imageUrl: row.image_url ?? null,
    sourceContext: row.source_context ?? {},
    outputObjectId: row.output_object_id ?? null,
    outputTxDigest: row.output_tx_digest ?? null,
    outputHash: row.output_hash ?? null,
    walrusBlobId: row.walrus_blob_id ?? null,
    walrusStatus: String(row.walrus_status ?? "not_configured"),
    outputPointer: {
      status: row.walrus_status ?? "not_configured",
      blobId: row.walrus_blob_id ?? null,
      objectId: null,
      hash: String(row.output_hash ?? ""),
    },
    createdAt: new Date(row.created_at).toISOString(),
    memoryEnabled: isMemoryEnabled(),
  }));
}
