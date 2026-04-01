-- Besorah Phase 8 — Fix unique indexes for YouTube upsert ON CONFLICT usage.
-- Postgres ON CONFLICT(column) cannot infer partial unique indexes.
-- Ensure full unique indexes exist so upserts on youtube_video_id / external_episode_id work.

-- Remove accidental duplicates first (keep most recently updated row).
with ranked as (
  select
    id,
    row_number() over (
      partition by youtube_video_id
      order by updated_at desc nulls last, created_at desc nulls last, id desc
    ) as rn
  from sermons
  where youtube_video_id is not null
)
delete from sermons s
using ranked r
where s.id = r.id
  and r.rn > 1;

with ranked as (
  select
    id,
    row_number() over (
      partition by external_episode_id
      order by updated_at desc nulls last, created_at desc nulls last, id desc
    ) as rn
  from sermons
  where external_episode_id is not null
)
delete from sermons s
using ranked r
where s.id = r.id
  and r.rn > 1;

drop index if exists idx_sermons_youtube_video_id;
drop index if exists idx_sermons_external_episode_id;

create unique index if not exists idx_sermons_youtube_video_id
  on sermons(youtube_video_id);

create unique index if not exists idx_sermons_external_episode_id
  on sermons(external_episode_id);
