-- Besorah Phase 12 — Ensure Popular Sermons can always fill requested slots.
-- Rank sermons with engagement first, then backfill with recent approved sermons.

create or replace function get_popular_sermons(lim int default 3)
returns setof sermons
language sql
stable
security definer
set search_path = public
as $$
  with counts as (
    select
      sermon_id,
      count(*) filter (where view_type = 'cta_click') as cta_clicks,
      count(*) filter (where view_type = 'page_view') as page_views
    from sermon_views
    group by sermon_id
  ),
  ranked as (
    select
      s.id,
      case
        when coalesce(c.cta_clicks, 0) > 0 or coalesce(c.page_views, 0) > 0 then 0
        else 1
      end as fallback_bucket,
      coalesce(c.cta_clicks, 0) as cta_clicks,
      coalesce(c.page_views, 0) as page_views,
      s.updated_at,
      s.created_at
    from sermons s
    left join counts c on c.sermon_id = s.id
    where s.review_status = 'approved'
  )
  select s.*
  from ranked r
  join sermons s on s.id = r.id
  order by
    r.fallback_bucket asc,
    r.cta_clicks desc,
    r.page_views desc,
    r.updated_at desc nulls last,
    r.created_at desc nulls last
  limit greatest(coalesce(lim, 3), 0);
$$;

grant execute on function get_popular_sermons(int) to anon, authenticated;
