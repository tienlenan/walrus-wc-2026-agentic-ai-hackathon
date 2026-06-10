import { getPool } from "@daily-walrus/db";
import { boundedRaw, eventKey, stableHash } from "./provider-normalizers.js";
import type {
  LiveDataJobType,
  LiveDataProviderName,
  LiveDataSyncMode,
  LiveDataSyncStatus,
  MatchEventDto,
  MatchLiveStateDto,
  PlayerAvailabilityDto,
  ProviderAvailability,
  ProviderFixture,
  ProviderLiveSnapshot,
  ProviderLineupSnapshot,
  TeamLineupDto,
} from "./live-data-types.js";

let ensured = false;

export async function ensureLiveDataTables(): Promise<void> {
  if (!process.env.DATABASE_URL || ensured) return;
  await getPool().query(`
    alter table fixtures add column if not exists provider_fixture_id text;
    alter table fixtures add column if not exists provider_name text;
    alter table fixtures add column if not exists provider_updated_at timestamptz;
    alter table fixtures add column if not exists live_updated_at timestamptz;

    create table if not exists provider_entity_map (
      entity_type text not null,
      local_id text not null,
      provider text not null,
      provider_id text not null,
      meta jsonb not null default '{}'::jsonb,
      updated_at timestamptz not null default now(),
      primary key (entity_type, local_id, provider)
    );

    create table if not exists provider_sync_runs (
      id uuid primary key default uuid_generate_v4(),
      provider text not null,
      job_type text not null,
      scope text not null,
      mode text not null default 'dry_run',
      status text not null default 'running',
      fetched_count int not null default 0,
      applied_count int not null default 0,
      content_hash text,
      error text,
      started_at timestamptz not null default now(),
      completed_at timestamptz
    );

    create table if not exists match_live_states (
      match_id text primary key references fixtures(match_id) on delete cascade,
      provider text not null,
      provider_fixture_id text,
      status text not null default 'unknown',
      period text,
      elapsed int,
      home_score int,
      away_score int,
      source_url text,
      source_fetched_at timestamptz,
      source_updated_at timestamptz,
      content_hash text,
      raw jsonb not null default '{}'::jsonb,
      updated_at timestamptz not null default now()
    );

    create table if not exists match_events (
      id text primary key,
      match_id text not null references fixtures(match_id) on delete cascade,
      provider text not null,
      provider_event_id text,
      minute int,
      extra_minute int,
      event_type text not null,
      detail text,
      team_code text,
      team_name text,
      player_name text,
      assist_name text,
      comments text,
      source_url text,
      raw jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    );

    create table if not exists match_lineups (
      id uuid primary key default uuid_generate_v4(),
      match_id text not null references fixtures(match_id) on delete cascade,
      team_code text,
      team_name text not null,
      provider text not null,
      provider_team_id text,
      formation text,
      coach text,
      confirmed boolean not null default false,
      source_url text,
      raw jsonb not null default '{}'::jsonb,
      updated_at timestamptz not null default now(),
      unique(match_id, provider, team_name)
    );

    create table if not exists match_lineup_players (
      id uuid primary key default uuid_generate_v4(),
      match_id text not null references fixtures(match_id) on delete cascade,
      team_code text,
      team_name text not null,
      provider text not null,
      provider_player_id text,
      shirt_number int,
      player_name text not null,
      position text,
      role text not null,
      grid text,
      pitch_x numeric,
      pitch_y numeric,
      updated_at timestamptz not null default now()
    );

    create table if not exists player_availability (
      id uuid primary key default uuid_generate_v4(),
      match_id text references fixtures(match_id) on delete cascade,
      team_code text,
      team_name text not null,
      provider text not null,
      provider_player_id text,
      player_name text not null,
      status text not null,
      note text,
      reason text,
      source_url text,
      raw jsonb not null default '{}'::jsonb,
      updated_at timestamptz not null default now()
    );

    create table if not exists admin_live_data_overrides (
      id uuid primary key default uuid_generate_v4(),
      target_type text not null,
      target_id text not null,
      payload jsonb not null,
      reason text not null,
      source_url text,
      created_at timestamptz not null default now()
    );

    create index if not exists provider_sync_runs_started_idx on provider_sync_runs(started_at desc);
    create index if not exists match_events_match_idx on match_events(match_id, minute, id);
    create index if not exists match_lineup_players_match_idx on match_lineup_players(match_id, team_code, role);
    create index if not exists player_availability_team_idx on player_availability(team_code, status, updated_at desc);
    create unique index if not exists player_availability_provider_uidx
      on player_availability(provider, (coalesce(match_id, '')), team_name, player_name, status);
  `);
  ensured = true;
}

function sourceDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

type Queryable = {
  query: (statement: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
};

async function localMatchId(db: Queryable, fixture: ProviderFixture): Promise<string> {
  if (fixture.matchId) return fixture.matchId;
  const { rows } = await db.query(
    `select match_id
     from fixtures
     where lower(home) = lower($1)
       and lower(away) = lower($2)
       and ($3::timestamptz is null or kickoff is null or abs(extract(epoch from (kickoff - $3::timestamptz))) <= 172800)
     order by
       case when $3::timestamptz is null or kickoff is null then 0
            else abs(extract(epoch from (kickoff - $3::timestamptz))) end,
       match_id
     limit 1`,
    [fixture.home.name, fixture.away.name, fixture.kickoff],
  );
  return rows[0]?.match_id ? String(rows[0].match_id) : fixture.providerFixtureId;
}

export async function startSyncRun(input: {
  provider: LiveDataProviderName;
  jobType: LiveDataJobType;
  scope: string;
  mode: LiveDataSyncMode;
}): Promise<string | null> {
  if (!process.env.DATABASE_URL) return null;
  await ensureLiveDataTables();
  const { rows } = await getPool().query<{ id: string }>(
    `insert into provider_sync_runs(provider, job_type, scope, mode, status)
     values ($1,$2,$3,$4,'running')
     returning id`,
    [input.provider, input.jobType, input.scope, input.mode],
  );
  return rows[0]?.id ?? null;
}

export async function finishSyncRun(input: {
  runId: string | null;
  status: LiveDataSyncStatus;
  fetchedCount: number;
  appliedCount: number;
  contentHash: string | null;
  error?: string | null;
}): Promise<void> {
  if (!input.runId || !process.env.DATABASE_URL) return;
  await ensureLiveDataTables();
  await getPool().query(
    `update provider_sync_runs
     set status = $2,
         fetched_count = $3,
         applied_count = $4,
         content_hash = $5,
         error = $6,
         completed_at = now()
     where id = $1`,
    [input.runId, input.status, input.fetchedCount, input.appliedCount, input.contentHash, input.error ?? null],
  );
}

export async function upsertProviderFixtures(fixtures: ProviderFixture[]): Promise<number> {
  if (!process.env.DATABASE_URL) return 0;
  await ensureLiveDataTables();
  const client = await getPool().connect();
  try {
    await client.query("begin");
    let applied = 0;
    for (const fixture of fixtures) {
      const matchId = await localMatchId(client, fixture);
      await client.query(
        `insert into fixtures(
           match_id, stage, group_name, home, away, home_team_code, away_team_code, kickoff,
           venue, city, status, home_score, away_score, chain_registered, source_url,
           provider_fixture_id, provider_name, provider_updated_at, live_updated_at, updated_at
         )
         values ($1,$2,$3,$4,$5,$6,$7,$8::timestamptz,$9,$10,$11,$12,$13,false,$14,$15,$16,$17::timestamptz,now(),now())
         on conflict (match_id) do update set
           stage = coalesce(excluded.stage, fixtures.stage),
           group_name = coalesce(excluded.group_name, fixtures.group_name),
           home = excluded.home,
           away = excluded.away,
           home_team_code = coalesce(excluded.home_team_code, fixtures.home_team_code),
           away_team_code = coalesce(excluded.away_team_code, fixtures.away_team_code),
           kickoff = coalesce(excluded.kickoff, fixtures.kickoff),
           venue = coalesce(excluded.venue, fixtures.venue),
           city = coalesce(excluded.city, fixtures.city),
           status = excluded.status,
           home_score = excluded.home_score,
           away_score = excluded.away_score,
           source_url = coalesce(excluded.source_url, fixtures.source_url),
           provider_fixture_id = excluded.provider_fixture_id,
           provider_name = excluded.provider_name,
           provider_updated_at = excluded.provider_updated_at,
           live_updated_at = now(),
           updated_at = now()`,
        [
          matchId,
          fixture.stage,
          fixture.groupName,
          fixture.home.name,
          fixture.away.name,
          fixture.home.code,
          fixture.away.code,
          fixture.kickoff,
          fixture.venue,
          fixture.city,
          fixture.status,
          fixture.homeScore,
          fixture.awayScore,
          fixture.source.sourceUrl,
          fixture.providerFixtureId,
          fixture.source.provider,
          sourceDate(fixture.source.sourceUpdatedAt ?? fixture.source.sourceFetchedAt),
        ],
      );
      await client.query(
        `insert into provider_entity_map(entity_type, local_id, provider, provider_id, meta, updated_at)
         values ('fixture',$1,$2,$3,$4::jsonb,now())
         on conflict (entity_type, local_id, provider) do update set
           provider_id = excluded.provider_id,
           meta = excluded.meta,
           updated_at = now()`,
        [matchId, fixture.source.provider, fixture.providerFixtureId, JSON.stringify({ sourceUrl: fixture.source.sourceUrl })],
      );
      applied += 1;
    }
    await client.query("commit");
    return applied;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function upsertLiveSnapshot(snapshot: ProviderLiveSnapshot): Promise<number> {
  if (!process.env.DATABASE_URL || !snapshot.supported) return 0;
  await ensureLiveDataTables();
  await getPool().query(
    `insert into match_live_states(
       match_id, provider, provider_fixture_id, status, period, elapsed, home_score, away_score,
       source_url, source_fetched_at, source_updated_at, content_hash, raw, updated_at
     )
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::timestamptz,$11::timestamptz,$12,$13::jsonb,now())
     on conflict (match_id) do update set
       provider = excluded.provider,
       provider_fixture_id = excluded.provider_fixture_id,
       status = excluded.status,
       period = excluded.period,
       elapsed = excluded.elapsed,
       home_score = excluded.home_score,
       away_score = excluded.away_score,
       source_url = excluded.source_url,
       source_fetched_at = excluded.source_fetched_at,
       source_updated_at = excluded.source_updated_at,
       content_hash = excluded.content_hash,
       raw = excluded.raw,
       updated_at = now()`,
    [
      snapshot.matchId,
      snapshot.source.provider,
      snapshot.providerFixtureId,
      snapshot.status,
      snapshot.period,
      snapshot.elapsed,
      snapshot.homeScore,
      snapshot.awayScore,
      snapshot.source.sourceUrl,
      sourceDate(snapshot.source.sourceFetchedAt),
      sourceDate(snapshot.source.sourceUpdatedAt),
      snapshot.source.contentHash,
      JSON.stringify(boundedRaw(snapshot.source.raw)),
    ],
  );

  let applied = 1;
  for (const event of snapshot.events) {
    const id = eventKey({
      provider: event.source.provider,
      matchId: snapshot.matchId,
      providerEventId: event.providerEventId,
      minute: event.minute,
      eventType: event.eventType,
      playerName: event.player?.playerName,
    });
    await getPool().query(
      `insert into match_events(
         id, match_id, provider, provider_event_id, minute, extra_minute, event_type, detail,
         team_code, team_name, player_name, assist_name, comments, source_url, raw
       )
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb)
       on conflict (id) do update set
         detail = excluded.detail,
         comments = excluded.comments,
         raw = excluded.raw`,
      [
        id,
        snapshot.matchId,
        event.source.provider,
        event.providerEventId,
        event.minute,
        event.extraMinute,
        event.eventType,
        event.detail,
        event.team?.code ?? null,
        event.team?.name ?? null,
        event.player?.playerName ?? null,
        event.assist?.playerName ?? null,
        event.comments,
        event.source.sourceUrl,
        JSON.stringify(boundedRaw(event.source.raw)),
      ],
    );
    applied += 1;
  }
  return applied;
}

export async function upsertLineupSnapshot(snapshot: ProviderLineupSnapshot): Promise<number> {
  if (!process.env.DATABASE_URL || !snapshot.supported) return 0;
  await ensureLiveDataTables();
  const client = await getPool().connect();
  try {
    await client.query("begin");
    let applied = 0;
    for (const lineup of snapshot.lineups) {
      await client.query(
        `insert into match_lineups(
           match_id, team_code, team_name, provider, provider_team_id, formation, coach,
           confirmed, source_url, raw, updated_at
         )
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,now())
         on conflict (match_id, provider, team_name) do update set
           team_code = excluded.team_code,
           provider_team_id = excluded.provider_team_id,
           formation = excluded.formation,
           coach = excluded.coach,
           confirmed = excluded.confirmed,
           source_url = excluded.source_url,
           raw = excluded.raw,
           updated_at = now()`,
        [
          snapshot.matchId,
          lineup.team.code,
          lineup.team.name,
          snapshot.source.provider,
          lineup.team.providerTeamId,
          lineup.formation,
          lineup.coach,
          lineup.confirmed,
          snapshot.source.sourceUrl,
          JSON.stringify(boundedRaw(lineup)),
        ],
      );
      await client.query(
        `delete from match_lineup_players
         where match_id = $1 and provider = $2 and team_name = $3`,
        [snapshot.matchId, snapshot.source.provider, lineup.team.name],
      );
      for (const row of lineup.players) {
        await client.query(
          `insert into match_lineup_players(
             match_id, team_code, team_name, provider, provider_player_id, shirt_number,
             player_name, position, role, grid, pitch_x, pitch_y, updated_at
           )
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now())`,
          [
            snapshot.matchId,
            lineup.team.code,
            lineup.team.name,
            snapshot.source.provider,
            row.player.providerPlayerId,
            row.player.shirtNumber,
            row.player.playerName,
            row.player.position,
            row.role,
            row.grid,
            row.pitchX,
            row.pitchY,
          ],
        );
      }
      applied += 1 + lineup.players.length;
    }
    await client.query("commit");
    return applied;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function upsertAvailability(items: ProviderAvailability[]): Promise<number> {
  if (!process.env.DATABASE_URL) return 0;
  await ensureLiveDataTables();
  let applied = 0;
  for (const item of items) {
    await getPool().query(
      `insert into player_availability(
         match_id, team_code, team_name, provider, provider_player_id, player_name,
         status, note, reason, source_url, raw, updated_at
       )
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,now())
       on conflict (provider, (coalesce(match_id, '')), team_name, player_name, status) do update set
         note = excluded.note,
         reason = excluded.reason,
         source_url = excluded.source_url,
         raw = excluded.raw,
         updated_at = now()`,
      [
        item.matchId,
        item.team.code,
        item.team.name,
        item.source.provider,
        item.player.providerPlayerId,
        item.player.playerName,
        item.status,
        item.note,
        item.reason,
        item.source.sourceUrl,
        JSON.stringify(boundedRaw(item.source.raw)),
      ],
    );
    applied += 1;
  }
  return applied;
}

export async function latestSyncRuns(limit = 10): Promise<Array<{
  id: string;
  provider: LiveDataProviderName;
  jobType: LiveDataJobType;
  scope: string;
  mode: LiveDataSyncMode;
  status: LiveDataSyncStatus;
  fetchedCount: number;
  appliedCount: number;
  contentHash: string | null;
  error: string | null;
  startedAt: string;
  completedAt: string | null;
}>> {
  if (!process.env.DATABASE_URL) return [];
  await ensureLiveDataTables();
  const { rows } = await getPool().query(
    `select id, provider, job_type, scope, mode, status, fetched_count, applied_count,
       content_hash, error, started_at, completed_at
     from provider_sync_runs
     order by started_at desc
     limit $1`,
    [limit],
  );
  return rows.map((row) => ({
    id: String(row.id),
    provider: row.provider as LiveDataProviderName,
    jobType: row.job_type as LiveDataJobType,
    scope: String(row.scope),
    mode: row.mode as LiveDataSyncMode,
    status: row.status as LiveDataSyncStatus,
    fetchedCount: Number(row.fetched_count ?? 0),
    appliedCount: Number(row.applied_count ?? 0),
    contentHash: (row.content_hash as string | null) ?? null,
    error: (row.error as string | null) ?? null,
    startedAt: new Date(row.started_at).toISOString(),
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
  }));
}

export async function recordAdminOverride(input: {
  targetType: string;
  targetId: string;
  payload: unknown;
  reason: string;
  sourceUrl?: string | null;
}): Promise<{ id: string; createdAt: string }> {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  if (!input.reason.trim()) throw new Error("override reason required");
  await ensureLiveDataTables();
  const { rows } = await getPool().query<{ id: string; created_at: Date }>(
    `insert into admin_live_data_overrides(target_type, target_id, payload, reason, source_url)
     values ($1,$2,$3::jsonb,$4,$5)
     returning id, created_at`,
    [input.targetType, input.targetId, JSON.stringify(input.payload ?? {}), input.reason.trim(), input.sourceUrl ?? null],
  );
  const row = rows[0];
  if (!row) throw new Error("override insert failed");
  return { id: row.id, createdAt: new Date(row.created_at).toISOString() };
}

export async function fixtureProviderRef(matchId: string, provider: LiveDataProviderName): Promise<string | null> {
  if (!process.env.DATABASE_URL) return null;
  await ensureLiveDataTables();
  const { rows } = await getPool().query(
    `select provider_id from provider_entity_map
     where entity_type = 'fixture' and local_id = $1 and provider = $2
     union all
     select provider_fixture_id as provider_id from fixtures
     where match_id = $1 and provider_name = $2
     limit 1`,
    [matchId, provider],
  );
  return (rows[0]?.provider_id as string | undefined) ?? null;
}

export async function listLiveMatchIds(limit = 6): Promise<string[]> {
  if (!process.env.DATABASE_URL) return [];
  await ensureLiveDataTables();
  const { rows } = await getPool().query<{ match_id: string }>(
    `select f.match_id
     from fixtures f
     left join match_live_states mls on mls.match_id = f.match_id
     order by
       case when coalesce(mls.status, f.status) = 'live' then 0
            when coalesce(mls.status, f.status) = 'scheduled' then 1
            else 2 end,
       f.kickoff nulls last,
       f.match_id
     limit $1`,
    [limit],
  );
  return rows.map((row) => String(row.match_id));
}

export async function liveStateForMatch(matchId: string): Promise<MatchLiveStateDto | null> {
  if (!process.env.DATABASE_URL) return null;
  await ensureLiveDataTables();
  const { rows } = await getPool().query(
    `select match_id, provider, provider_fixture_id, status, period, elapsed, home_score,
       away_score, source_url, source_fetched_at, source_updated_at, content_hash, updated_at
     from match_live_states
     where match_id = $1`,
    [matchId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    matchId: String(row.match_id),
    provider: row.provider as LiveDataProviderName,
    providerFixtureId: (row.provider_fixture_id as string | null) ?? null,
    status: row.status,
    period: (row.period as string | null) ?? null,
    elapsed: row.elapsed == null ? null : Number(row.elapsed),
    homeScore: row.home_score == null ? null : Number(row.home_score),
    awayScore: row.away_score == null ? null : Number(row.away_score),
    sourceUrl: (row.source_url as string | null) ?? null,
    sourceFetchedAt: row.source_fetched_at ? new Date(row.source_fetched_at).toISOString() : null,
    sourceUpdatedAt: row.source_updated_at ? new Date(row.source_updated_at).toISOString() : null,
    contentHash: (row.content_hash as string | null) ?? null,
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export async function matchEvents(matchId: string, limit = 80): Promise<MatchEventDto[]> {
  if (!process.env.DATABASE_URL) return [];
  await ensureLiveDataTables();
  const { rows } = await getPool().query(
    `select id, match_id, provider, provider_event_id, minute, extra_minute, event_type,
       detail, team_code, team_name, player_name, assist_name, comments, source_url
     from match_events
     where match_id = $1
     order by minute nulls last, extra_minute nulls last, id
     limit $2`,
    [matchId, limit],
  );
  return rows.map((row) => ({
    id: String(row.id),
    matchId: String(row.match_id),
    provider: row.provider as LiveDataProviderName,
    providerEventId: (row.provider_event_id as string | null) ?? null,
    minute: row.minute == null ? null : Number(row.minute),
    extraMinute: row.extra_minute == null ? null : Number(row.extra_minute),
    eventType: String(row.event_type),
    detail: (row.detail as string | null) ?? null,
    teamCode: (row.team_code as string | null) ?? null,
    teamName: (row.team_name as string | null) ?? null,
    playerName: (row.player_name as string | null) ?? null,
    assistName: (row.assist_name as string | null) ?? null,
    comments: (row.comments as string | null) ?? null,
    sourceUrl: (row.source_url as string | null) ?? null,
  }));
}

export async function lineupsForMatch(matchId: string): Promise<TeamLineupDto[]> {
  if (!process.env.DATABASE_URL) return [];
  await ensureLiveDataTables();
  const { rows: lineupRows } = await getPool().query(
    `select match_id, team_code, team_name, provider, provider_team_id, formation, coach,
       confirmed, source_url, updated_at
     from match_lineups
     where match_id = $1
     order by team_name`,
    [matchId],
  );
  const { rows: playerRows } = await getPool().query(
    `select team_name, provider_player_id, shirt_number, player_name, position, role, grid,
       pitch_x, pitch_y
     from match_lineup_players
     where match_id = $1
     order by team_name, case role when 'starter' then 0 else 1 end, shirt_number nulls last, player_name`,
    [matchId],
  );
  return lineupRows.map((row) => ({
    matchId: String(row.match_id),
    teamCode: (row.team_code as string | null) ?? null,
    teamName: String(row.team_name),
    provider: row.provider as LiveDataProviderName,
    providerTeamId: (row.provider_team_id as string | null) ?? null,
    formation: (row.formation as string | null) ?? null,
    coach: (row.coach as string | null) ?? null,
    confirmed: Boolean(row.confirmed),
    sourceUrl: (row.source_url as string | null) ?? null,
    updatedAt: new Date(row.updated_at).toISOString(),
    players: playerRows
      .filter((player) => String(player.team_name) === String(row.team_name))
      .map((player) => ({
        playerName: String(player.player_name),
        providerPlayerId: (player.provider_player_id as string | null) ?? null,
        shirtNumber: player.shirt_number == null ? null : Number(player.shirt_number),
        position: (player.position as string | null) ?? null,
        role: player.role as TeamLineupDto["players"][number]["role"],
        grid: (player.grid as string | null) ?? null,
        pitchX: player.pitch_x == null ? null : Number(player.pitch_x),
        pitchY: player.pitch_y == null ? null : Number(player.pitch_y),
      })),
  }));
}

export async function availabilityForMatch(matchId: string): Promise<PlayerAvailabilityDto[]> {
  if (!process.env.DATABASE_URL) return [];
  await ensureLiveDataTables();
  const { rows } = await getPool().query(
    `select id, match_id, team_code, team_name, provider_player_id, player_name, status,
       note, reason, source_url, updated_at
     from player_availability
     where match_id = $1 or match_id is null
     order by team_name, player_name`,
    [matchId],
  );
  return rows.map((row) => ({
    id: String(row.id),
    matchId: (row.match_id as string | null) ?? null,
    teamCode: (row.team_code as string | null) ?? null,
    teamName: String(row.team_name),
    playerName: String(row.player_name),
    providerPlayerId: (row.provider_player_id as string | null) ?? null,
    status: row.status,
    note: (row.note as string | null) ?? null,
    reason: (row.reason as string | null) ?? null,
    sourceUrl: (row.source_url as string | null) ?? null,
    updatedAt: new Date(row.updated_at).toISOString(),
  }));
}

export function syncContentHash(value: unknown): string {
  return stableHash(withoutVolatileSyncFields(value));
}

function withoutVolatileSyncFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutVolatileSyncFields);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !["sourceFetchedAt", "updatedAt"].includes(key))
      .map(([key, item]) => [key, withoutVolatileSyncFields(item)]),
  );
}
