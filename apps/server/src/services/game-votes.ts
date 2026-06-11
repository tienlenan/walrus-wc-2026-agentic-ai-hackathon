import { getPool } from "@daily-walrus/db";
import { hashToU32 } from "@daily-walrus/shared";
import { ensureUser } from "./sui-output-records.js";

export type MatchVoteKind = "match_mvp" | "worst_player";

export interface MatchVoteLeaderDto {
  targetHash: number;
  targetLabel: string;
  votes: number;
}

export interface MatchVoteDto {
  matchId: string;
  kind: MatchVoteKind;
  targetHash: number;
  targetLabel: string;
  outputObjectId: string | null;
  outputTxDigest: string | null;
  outputHash: string | null;
}

export interface MatchVoteSummaryDto {
  matchId: string;
  kind: MatchVoteKind;
  leaders: MatchVoteLeaderDto[];
  myVote: MatchVoteDto | null;
}

function assertVoteKind(kind: string): MatchVoteKind {
  if (kind === "match_mvp" || kind === "worst_player") return kind;
  throw new Error("vote kind must be match_mvp or worst_player");
}

async function ensureFixtureExists(matchId: string): Promise<void> {
  const { rowCount } = await getPool().query("select 1 from fixtures where match_id = $1", [matchId]);
  if (rowCount !== 1) throw new Error("match not found");
}

export async function saveMatchVote(
  address: string,
  input: {
    matchId?: string;
    kind?: string;
    targetLabel?: string;
    outputObjectId?: string | null;
    outputTxDigest?: string | null;
    outputHash?: string | null;
  },
): Promise<MatchVoteDto> {
  if (!address.startsWith("0x")) throw new Error("verified Sui session required");
  const matchId = String(input.matchId ?? "").trim();
  if (!matchId) throw new Error("matchId required");
  const kind = assertVoteKind(String(input.kind ?? ""));
  const targetLabel = String(input.targetLabel ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
  if (!targetLabel) throw new Error("targetLabel required");
  const outputObjectId = input.outputObjectId ? String(input.outputObjectId).trim().slice(0, 180) : null;
  const outputTxDigest = input.outputTxDigest ? String(input.outputTxDigest).trim().slice(0, 180) : null;
  const outputHash = input.outputHash ? String(input.outputHash).trim().toLowerCase() : null;
  if (outputHash && !/^[0-9a-f]{64}$/.test(outputHash)) throw new Error("outputHash must be sha256 hex");

  await ensureFixtureExists(matchId);
  const userId = await ensureUser(address);
  const targetHash = hashToU32(targetLabel.toLowerCase());

  const { rows } = await getPool().query(
    `insert into match_votes(match_id, user_id, kind, target_hash, target_label, output_object_id, output_tx_digest, output_hash)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     on conflict (match_id, user_id, kind) do update set
       target_hash = excluded.target_hash,
       target_label = excluded.target_label,
       output_object_id = excluded.output_object_id,
       output_tx_digest = excluded.output_tx_digest,
       output_hash = excluded.output_hash,
       updated_at = now()
     returning match_id, kind, target_hash, target_label, output_object_id, output_tx_digest, output_hash`,
    [matchId, userId, kind, targetHash, targetLabel, outputObjectId, outputTxDigest, outputHash],
  );

  const row = rows[0];
  return {
    matchId: String(row.match_id),
    kind: row.kind as MatchVoteKind,
    targetHash: Number(row.target_hash),
    targetLabel: String(row.target_label),
    outputObjectId: row.output_object_id ?? null,
    outputTxDigest: row.output_tx_digest ?? null,
    outputHash: row.output_hash ?? null,
  };
}

export async function getVoteSummaries(matchIds: string[], address?: string | null): Promise<MatchVoteSummaryDto[]> {
  if (matchIds.length === 0) return [];

  const leaders = await getPool().query(
    `with grouped as (
       select match_id, kind, target_hash, max(target_label) as target_label, count(*)::int as votes
       from match_votes
       where match_id = any($1::text[])
       group by match_id, kind, target_hash
     ),
     ranked as (
       select *,
         row_number() over (partition by match_id, kind order by votes desc, target_label asc) as rank
       from grouped
     )
     select match_id, kind, target_hash, target_label, votes
     from ranked
     where rank <= 5
     order by match_id, kind, votes desc, target_label asc`,
    [matchIds],
  );

  const myVotes = address?.startsWith("0x")
    ? await getPool().query(
        `select v.match_id, v.kind, v.target_hash, v.target_label, v.output_object_id, v.output_tx_digest, v.output_hash
         from match_votes v
         join users u on u.id = v.user_id
         where u.sui_address = $2
           and v.match_id = any($1::text[])`,
        [matchIds, address],
      )
    : { rows: [] };

  const myByKey = new Map<string, MatchVoteDto>();
  for (const row of myVotes.rows) {
    const vote: MatchVoteDto = {
      matchId: String(row.match_id),
      kind: row.kind as MatchVoteKind,
      targetHash: Number(row.target_hash),
      targetLabel: String(row.target_label),
      outputObjectId: row.output_object_id ?? null,
      outputTxDigest: row.output_tx_digest ?? null,
      outputHash: row.output_hash ?? null,
    };
    myByKey.set(`${vote.matchId}:${vote.kind}`, vote);
  }

  const byKey = new Map<string, MatchVoteSummaryDto>();
  for (const row of leaders.rows) {
    const key = `${String(row.match_id)}:${String(row.kind)}`;
    const summary =
      byKey.get(key) ??
      ({
        matchId: String(row.match_id),
        kind: row.kind as MatchVoteKind,
        leaders: [],
        myVote: myByKey.get(key) ?? null,
      } satisfies MatchVoteSummaryDto);
    summary.leaders.push({
      targetHash: Number(row.target_hash),
      targetLabel: String(row.target_label),
      votes: Number(row.votes),
    });
    byKey.set(key, summary);
  }

  for (const [key, vote] of myByKey.entries()) {
    if (!byKey.has(key)) {
      byKey.set(key, { matchId: vote.matchId, kind: vote.kind, leaders: [], myVote: vote });
    }
  }

  return [...byKey.values()];
}
