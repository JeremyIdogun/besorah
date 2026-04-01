-- Besorah Phase 7 — YouTube ingestion support (unlisted playlist MVP)

-- Allow non-Spotify sermons and add cross-platform identifiers.
alter table if exists sermons
  alter column spotify_episode_id drop not null;

alter table if exists sermons
  add column if not exists external_episode_id text,
  add column if not exists youtube_video_id text;

-- Backfill existing Spotify rows to unified external IDs.
update sermons
set external_episode_id = 'spotify:' || spotify_episode_id
where external_episode_id is null
  and spotify_episode_id is not null;

create unique index if not exists idx_sermons_external_episode_id
  on sermons(external_episode_id)
  where external_episode_id is not null;

create unique index if not exists idx_sermons_youtube_video_id
  on sermons(youtube_video_id)
  where youtube_video_id is not null;

-- Track imported YouTube playlists.
create table if not exists youtube_playlists (
  id                  uuid primary key default gen_random_uuid(),
  youtube_playlist_id text not null unique,
  title               text not null,
  channel_title       text,
  description         text,
  image_url           text,
  external_url        text,
  status              text not null default 'active',
  last_synced_at      timestamptz,
  created_at          timestamptz default now()
);

create index if not exists idx_youtube_playlists_status
  on youtube_playlists(status);

-- Lock down table for client access; writes happen through server routes.
alter table if exists youtube_playlists enable row level security;
