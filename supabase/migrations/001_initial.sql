-- Besorah Phase 1 — Initial schema

create extension if not exists "pgcrypto";

-- ── pillars ───────────────────────────────────────────────────────────────────
create table if not exists pillars (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  slug        text not null unique,
  description text,
  icon        text,
  color       text,
  created_at  timestamptz default now()
);

-- ── spotify_shows ─────────────────────────────────────────────────────────────
create table if not exists spotify_shows (
  id               uuid primary key default gen_random_uuid(),
  spotify_show_id  text not null unique,
  title            text not null,
  publisher        text,
  description      text,
  image_url        text,
  external_url     text,
  status           text not null default 'active',
  last_synced_at   timestamptz,
  created_at       timestamptz default now()
);

-- ── sermons ───────────────────────────────────────────────────────────────────
create table if not exists sermons (
  id                    uuid primary key default gen_random_uuid(),
  spotify_episode_id    text not null unique,
  spotify_show_id       text,
  title                 text not null,
  preacher              text,
  church                text,
  date_preached         date,
  description           text,
  platform              text not null default 'spotify',
  external_url          text not null,
  embed_url             text,
  image_url             text,
  classification_status text not null default 'pending',
  review_status         text not null default 'unreviewed',
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- ── sermon_pillars ────────────────────────────────────────────────────────────
create table if not exists sermon_pillars (
  sermon_id        uuid not null references sermons(id) on delete cascade,
  pillar_id        uuid not null references pillars(id) on delete cascade,
  source           text not null default 'manual',
  confidence_score numeric(5,4),
  primary key (sermon_id, pillar_id)
);

-- ── ingestion_runs ────────────────────────────────────────────────────────────
create table if not exists ingestion_runs (
  id               uuid primary key default gen_random_uuid(),
  spotify_show_id  text,
  status           text not null,
  started_at       timestamptz default now(),
  completed_at     timestamptz,
  summary_json     jsonb,
  error_json       jsonb
);

-- ── admin_review_log ──────────────────────────────────────────────────────────
create table if not exists admin_review_log (
  id          uuid primary key default gen_random_uuid(),
  sermon_id   uuid not null references sermons(id) on delete cascade,
  action      text not null,
  notes       text,
  reviewed_at timestamptz default now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
create index if not exists idx_sermons_review_status on sermons(review_status);
create index if not exists idx_sermons_spotify_show  on sermons(spotify_show_id);
create index if not exists idx_sermon_pillars_pillar  on sermon_pillars(pillar_id);
create index if not exists idx_ingestion_show         on ingestion_runs(spotify_show_id);

-- ── Full-text search index ────────────────────────────────────────────────────
create index if not exists idx_sermons_fts on sermons
  using gin(to_tsvector('english', coalesce(title,'') || ' ' || coalesce(preacher,'') || ' ' || coalesce(church,'') || ' ' || coalesce(description,'')));

-- ── updated_at trigger ────────────────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger sermons_updated_at
  before update on sermons
  for each row execute procedure update_updated_at();
