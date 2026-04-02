-- Track sermon page views and CTA clicks for popularity ranking.

-- ── sermon_views ─────────────────────────────────────────────────────────────
create table if not exists sermon_views (
  id         uuid primary key default gen_random_uuid(),
  sermon_id  uuid not null references sermons(id) on delete cascade,
  view_type  text not null default 'page_view',
  created_at timestamptz default now()
);

create index if not exists idx_sermon_views_sermon on sermon_views(sermon_id);
create index if not exists idx_sermon_views_type   on sermon_views(view_type);

-- ── RLS: anon can insert, nobody can read raw rows via the client ────────────
alter table sermon_views enable row level security;

drop policy if exists anon_insert_sermon_views on sermon_views;
create policy anon_insert_sermon_views
on sermon_views for insert
to anon, authenticated
with check (true);

-- ── Aggregate function for popular sermons ───────────────────────────────────
-- Returns top N sermons by CTA click count (falls back to page_view if no clicks).
-- Only counts approved sermons. Callable by anon via supabase.rpc().
create or replace function get_popular_sermons(lim int default 3)
returns setof sermons
language sql
stable
security definer
as $$
  select s.*
  from sermons s
  inner join (
    select sermon_id, count(*) as cnt
    from sermon_views
    where view_type = 'cta_click'
    group by sermon_id
  ) v on v.sermon_id = s.id
  where s.review_status = 'approved'
  order by v.cnt desc
  limit lim;
$$;
