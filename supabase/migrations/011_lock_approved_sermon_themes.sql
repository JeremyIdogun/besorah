-- Besorah Phase 11 — Keep approved sermon themes stable.

-- If an approved sermon has at least one manual pillar assignment,
-- remove non-manual rows so admin-approved themes are authoritative.
delete from sermon_pillars sp
using sermons s
where sp.sermon_id = s.id
  and s.review_status = 'approved'
  and sp.source <> 'manual'
  and exists (
    select 1
    from sermon_pillars m
    where m.sermon_id = sp.sermon_id
      and m.source = 'manual'
  );
