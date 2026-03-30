-- Lock down writes from anon/authenticated clients and expose only public read data.
-- Admin writes/reads are handled by server routes using the service-role key.

alter table if exists pillars enable row level security;
alter table if exists sermons enable row level security;
alter table if exists sermon_pillars enable row level security;
alter table if exists spotify_shows enable row level security;
alter table if exists ingestion_runs enable row level security;
alter table if exists admin_review_log enable row level security;
alter table if exists spotify_oauth_tokens enable row level security;

drop policy if exists public_read_pillars on pillars;
create policy public_read_pillars
on pillars for select
to anon, authenticated
using (true);

drop policy if exists public_read_spotify_shows on spotify_shows;
create policy public_read_spotify_shows
on spotify_shows for select
to anon, authenticated
using (true);

drop policy if exists public_read_approved_sermons on sermons;
create policy public_read_approved_sermons
on sermons for select
to anon, authenticated
using (review_status = 'approved');

drop policy if exists public_read_sermon_pillars_for_approved_sermons on sermon_pillars;
create policy public_read_sermon_pillars_for_approved_sermons
on sermon_pillars for select
to anon, authenticated
using (
  exists (
    select 1
    from sermons s
    where s.id = sermon_pillars.sermon_id
      and s.review_status = 'approved'
  )
);

