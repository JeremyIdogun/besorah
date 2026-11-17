-- Store read time on save so the blog index and related-post cards can skip
-- fetching full article bodies. The API computes this with estimateReadTime
-- (src/lib/readTime.js) on create/update; the backfill below is a close SQL
-- approximation for rows that already exist.

alter table posts add column if not exists read_time_minutes integer;

update posts
set read_time_minutes = greatest(
  1,
  round(
    coalesce(
      array_length(
        regexp_split_to_array(
          trim(regexp_replace(body, '[#>*_`~-]', ' ', 'g')),
          '\s+'
        ),
        1
      ),
      0
    ) / 200.0
  )::integer
)
where content_type = 'article'
  and body is not null
  and read_time_minutes is null;
