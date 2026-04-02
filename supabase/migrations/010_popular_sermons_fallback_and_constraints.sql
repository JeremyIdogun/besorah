-- Besorah Phase 10 — Harden sermon popularity tracking and fallback behavior.

-- Constrain accepted analytics event types.
-- Use NOT VALID so existing historical rows do not block deploys.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sermon_views_view_type_check'
      and conrelid = 'sermon_views'::regclass
  ) then
    alter table sermon_views
      add constraint sermon_views_view_type_check
      check (view_type in ('page_view', 'cta_click'))
      not valid;
  end if;
end
$$;

-- Returns top approved sermons by CTA clicks.
-- If there are no CTA clicks at all, falls back to page views.
create or replace function get_popular_sermons(lim int default 3)
returns setof sermons
language sql
stable
security definer
set search_path = public
as $$
  with has_clicks as (
    select exists (
      select 1
      from sermon_views
      where view_type = 'cta_click'
    ) as value
  ),
  counts as (
    select
      sermon_id,
      count(*) filter (where view_type = 'cta_click') as cta_clicks,
      count(*) filter (where view_type = 'page_view') as page_views
    from sermon_views
    group by sermon_id
  )
  select s.*
  from sermons s
  join counts c on c.sermon_id = s.id
  cross join has_clicks h
  where s.review_status = 'approved'
    and (
      (h.value and c.cta_clicks > 0)
      or
      ((not h.value) and c.page_views > 0)
    )
  order by
    case when h.value then c.cta_clicks else c.page_views end desc,
    s.updated_at desc nulls last,
    s.created_at desc nulls last
  limit greatest(coalesce(lim, 3), 0);
$$;

grant execute on function get_popular_sermons(int) to anon, authenticated;
