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
  created_at timestamptz not null default now()
);

-- Cache lịch/kết quả World Cup 2026
create table if not exists fixtures (
  match_id text primary key,
  stage text,
  home text not null,
  away text not null,
  kickoff timestamptz,
  status text not null default 'scheduled', -- scheduled | live | finished
  home_score int,
  away_score int,
  updated_at timestamptz not null default now()
);

-- Sổ dự đoán (được chấm điểm)
create table if not exists predictions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  match_id text not null references fixtures(match_id),
  kind text not null,                      -- winner | scoreline | tournament
  payload jsonb not null,
  created_at timestamptz not null default now(),
  locked_at timestamptz,
  result text not null default 'pending',  -- pending | correct | wrong
  scored_at timestamptz
);
create index if not exists predictions_user_idx on predictions(user_id);
create index if not exists predictions_match_idx on predictions(match_id);

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

-- Leaderboard độ chính xác dự đoán
create or replace view leaderboard as
select
  u.id as user_id,
  u.display_name,
  u.sui_address,
  count(p.*) filter (where p.result <> 'pending') as graded,
  count(p.*) filter (where p.result = 'correct') as correct,
  round(
    100.0 * count(p.*) filter (where p.result = 'correct')
    / nullif(count(p.*) filter (where p.result <> 'pending'), 0),
    1
  ) as accuracy
from users u
left join predictions p on p.user_id = u.id
group by u.id;
