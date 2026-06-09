-- The Daily Walrus — app schema (Supabase Postgres)
-- LƯU Ý: Walrus là nguồn chân lý cho memory. Các bảng này là index/cache/structured app data.

create extension if not exists "uuid-ossp";

-- Người dùng (danh tính = địa chỉ Sui)
create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  sui_address text unique not null,
  memwal_account_id text,
  display_name text,
  favorite_team text,
  total_points bigint not null default 0,
  streak bigint not null default 0,
  best_streak bigint not null default 0,
  graded bigint not null default 0,
  correct bigint not null default 0,
  last_scored_at timestamptz,
  created_at timestamptz not null default now()
);
alter table users add column if not exists total_points bigint not null default 0;
alter table users add column if not exists streak bigint not null default 0;
alter table users add column if not exists best_streak bigint not null default 0;
alter table users add column if not exists graded bigint not null default 0;
alter table users add column if not exists correct bigint not null default 0;
alter table users add column if not exists last_scored_at timestamptz;

-- Cache lịch/kết quả World Cup 2026
create table if not exists fixtures (
  match_id text primary key,
  stage text,
  group_name text,
  home text not null,
  away text not null,
  home_team_code text,
  away_team_code text,
  venue text,
  city text,
  kickoff timestamptz,
  status text not null default 'scheduled', -- scheduled | live | finished
  home_score int,
  away_score int,
  chain_registered boolean not null default false,
  source_url text,
  updated_at timestamptz not null default now()
);
alter table fixtures add column if not exists group_name text;
alter table fixtures add column if not exists home_team_code text;
alter table fixtures add column if not exists away_team_code text;
alter table fixtures add column if not exists venue text;
alter table fixtures add column if not exists city text;
alter table fixtures add column if not exists chain_registered boolean not null default false;
alter table fixtures add column if not exists source_url text;
create index if not exists fixtures_kickoff_idx on fixtures(kickoff);
create index if not exists fixtures_group_idx on fixtures(group_name, kickoff);

-- WC2026 national team profiles. The actual profile JSON can be stored on Walrus;
-- this table keeps the searchable/indexed copy plus blob pointer.
create table if not exists team_profiles (
  team_code text primary key,
  name text not null,
  group_name text,
  confederation text,
  coach text,
  coach_nationality text,
  flag_emoji text,
  source_url text,
  squad_source_url text,
  walrus_blob_id text,
  walrus_object_id text,
  walrus_status text not null default 'not_published',
  profile_hash text,
  updated_at timestamptz not null default now()
);
create index if not exists team_profiles_group_idx on team_profiles(group_name, name);

create table if not exists team_players (
  team_code text not null references team_profiles(team_code) on delete cascade,
  shirt_number int not null,
  position text not null,
  player_name text not null,
  first_names text,
  last_names text,
  shirt_name text,
  date_of_birth text,
  club text,
  height_cm int,
  source_raw text,
  updated_at timestamptz not null default now(),
  primary key (team_code, shirt_number)
);
create index if not exists team_players_name_idx on team_players(player_name);

-- Sổ dự đoán (được chấm điểm)
create table if not exists predictions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  match_id text not null references fixtures(match_id),
  kind text not null,                      -- winner | scoreline | tournament
  payload jsonb not null,
  chain_prediction_id text,
  tx_digest text,
  chain_status text not null default 'submitted',
  created_at timestamptz not null default now(),
  locked_at timestamptz,
  result text not null default 'pending',  -- pending | correct | wrong
  scored_at timestamptz,
  oracle_status text not null default 'pending', -- pending | reserved | recorded | failed | skipped
  oracle_points bigint,
  oracle_correct boolean,
  oracle_tx_digest text,
  oracle_error text,
  oracle_scored_at timestamptz
);
alter table predictions add column if not exists chain_prediction_id text;
alter table predictions add column if not exists tx_digest text;
alter table predictions add column if not exists chain_status text not null default 'submitted';
alter table predictions add column if not exists oracle_status text not null default 'pending';
alter table predictions add column if not exists oracle_points bigint;
alter table predictions add column if not exists oracle_correct boolean;
alter table predictions add column if not exists oracle_tx_digest text;
alter table predictions add column if not exists oracle_error text;
alter table predictions add column if not exists oracle_scored_at timestamptz;
create index if not exists predictions_user_idx on predictions(user_id);
create index if not exists predictions_match_idx on predictions(match_id);
create index if not exists predictions_oracle_pending_idx on predictions(match_id, oracle_status)
  where oracle_status in ('pending', 'failed');
create unique index if not exists predictions_chain_prediction_id_uidx on predictions(chain_prediction_id);

-- Oracle score run ledger. Keeps DB reservation separate from on-chain scoreboard events.
create table if not exists score_runs (
  id uuid primary key default uuid_generate_v4(),
  match_id text references fixtures(match_id),
  mode text not null default 'dry_run',     -- dry_run | execute
  status text not null default 'planned',   -- planned | reserved | recorded | failed
  prediction_ids jsonb not null default '[]'::jsonb,
  entries_count int not null default 0,
  total_points bigint not null default 0,
  tx_digest text,
  settle_tx_digest text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists score_runs_match_idx on score_runs(match_id, created_at desc);

-- Off-chain match voting. Votes are signed-session scoped; predictions stay on-chain.
create table if not exists match_votes (
  id uuid primary key default uuid_generate_v4(),
  match_id text not null references fixtures(match_id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  kind text not null check (kind in ('match_mvp', 'worst_player')),
  target_hash bigint not null,
  target_label text not null,
  output_object_id text,
  output_tx_digest text,
  output_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(match_id, user_id, kind)
);
alter table match_votes add column if not exists output_object_id text;
alter table match_votes add column if not exists output_tx_digest text;
alter table match_votes add column if not exists output_hash text;
create index if not exists match_votes_match_kind_idx on match_votes(match_id, kind, target_hash);

-- Durable event cursors and score event ledger for idempotent chain indexing.
create table if not exists indexer_cursor (
  name text primary key,
  cursor jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists scoring_events (
  event_id text primary key,
  owner_address text not null,
  points bigint not null,
  correct boolean not null,
  streak bigint not null,
  total_points bigint not null,
  scored_ms bigint,
  tx_digest text,
  event_seq text,
  created_at timestamptz not null default now()
);
create index if not exists scoring_events_owner_idx on scoring_events(owner_address);

-- Con trỏ tới blob/đối tượng trên Walrus (để verify on-chain)
create table if not exists walrus_index (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  kind text not null,                      -- profile | predictions | memory
  blob_id text not null,
  object_id text,
  epoch int,
  hash text,
  updated_at timestamptz not null default now()
);
create index if not exists walrus_index_user_idx on walrus_index(user_id);

-- Global app memories such as the tournament schedule. The canonical memory is
-- MemWal/Walrus; this row only tracks sync status and prevents duplicate writes.
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
);
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
do $$
begin
  alter table global_memory_syncs drop constraint if exists global_memory_syncs_pkey;
  alter table global_memory_syncs add constraint global_memory_syncs_pkey primary key (namespace, memory_kind);
exception
  when duplicate_table then null;
end $$;
create index if not exists global_memory_syncs_updated_idx on global_memory_syncs(updated_at desc);

-- User-owned Sui objects that anchor app outputs. Raw payloads live on Walrus when
-- publisher is configured; otherwise the object still stores a deterministic hash.
create table if not exists sui_output_records (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  output_kind text not null,                -- chat | roast | match_vote | notebook_query | profile_pointer
  resource_type text not null,
  resource_id text not null,
  sui_object_id text,
  tx_digest text not null,
  blob_id text,
  content_hash text not null,
  walrus_status text not null default 'not_configured',
  created_at timestamptz not null default now()
);
create unique index if not exists sui_output_records_tx_uidx on sui_output_records(tx_digest);
create index if not exists sui_output_records_user_idx on sui_output_records(user_id, created_at desc);
create index if not exists sui_output_records_resource_idx on sui_output_records(resource_type, resource_id);

-- Gil roast wall. Text/card first; image URL is optional stretch.
create table if not exists roasts (
  id uuid primary key default uuid_generate_v4(),
  target_type text not null check (target_type in ('team', 'player')),
  target_id text not null,
  target_name text not null,
  team_code text,
  player_number int,
  roast_text text not null,
  card_title text,
  image_url text,
  source_context jsonb not null default '{}'::jsonb,
  resource_id text,
  output_object_id text,
  output_tx_digest text,
  output_hash text,
  walrus_blob_id text,
  walrus_status text not null default 'not_configured',
  created_at timestamptz not null default now()
);
alter table roasts add column if not exists output_object_id text;
alter table roasts add column if not exists output_tx_digest text;
alter table roasts add column if not exists output_hash text;
alter table roasts add column if not exists walrus_blob_id text;
alter table roasts add column if not exists walrus_status text not null default 'not_configured';
create index if not exists roasts_created_idx on roasts(created_at desc);
create index if not exists roasts_target_idx on roasts(target_type, target_id, created_at desc);

drop view if exists leaderboard;

-- Leaderboard from on-chain scoring mirror.
create or replace view leaderboard as
select
  u.id as user_id,
  u.display_name,
  u.sui_address,
  u.total_points,
  u.streak,
  u.best_streak,
  greatest(u.graded, count(se.event_id)) as graded,
  greatest(u.correct, count(se.event_id) filter (where se.correct)) as correct,
  round(
    100.0 * greatest(u.correct, count(se.event_id) filter (where se.correct))
    / nullif(greatest(u.graded, count(se.event_id)::bigint), 0),
    1
  ) as accuracy
from users u
left join scoring_events se on se.owner_address = u.sui_address
group by u.id;
