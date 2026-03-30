-- Ensure thematic pillars exist for homepage + admin classification workflows.
-- Safe to run multiple times.

alter table if exists pillars enable row level security;

drop policy if exists public_read_pillars on pillars;
create policy public_read_pillars
on pillars for select
to anon, authenticated
using (true);

-- Replace old "prophecy" taxonomy with "sex-identity" while preserving tagged rows.
do $$
declare
  prophecy_id uuid;
  sex_identity_id uuid;
begin
  select id into prophecy_id from pillars where slug = 'prophecy' limit 1;
  select id into sex_identity_id from pillars where slug = 'sex-identity' limit 1;

  if prophecy_id is not null and sex_identity_id is null then
    update pillars
    set
      name = 'Sex & Identity',
      slug = 'sex-identity',
      description = 'Sermons on biblical sexuality, identity in Christ, purity, and personhood.',
      icon = null,
      color = '#7C6B49'
    where id = prophecy_id;
  elsif prophecy_id is not null and sex_identity_id is not null then
    insert into sermon_pillars (sermon_id, pillar_id, source, confidence_score)
    select sp.sermon_id, sex_identity_id, sp.source, sp.confidence_score
    from sermon_pillars sp
    where sp.pillar_id = prophecy_id
    on conflict (sermon_id, pillar_id) do update
    set
      source = excluded.source,
      confidence_score = greatest(
        coalesce(sermon_pillars.confidence_score, 0),
        coalesce(excluded.confidence_score, 0)
      );

    delete from pillars where id = prophecy_id;
  end if;
end $$;

insert into pillars (name, slug, description, icon, color)
values
  ('Faith',          'faith',        'Sermons on trust in God, belief, and spiritual confidence.',                     null, '#356B8C'),
  ('Healing',        'healing',      'Sermons on physical, emotional, and spiritual restoration.',                     null, '#4D9B65'),
  ('Finance',        'finance',      'Sermons on stewardship, generosity, debt freedom, and financial wisdom.',       null, '#8B6F2A'),
  ('Prayer',         'prayer',       'Sermons on prayer, intercession, and communion with God.',                      null, '#6C5BA7'),
  ('Family',         'family',       'Sermons on marriage, parenting, and Christ-centered homes.',                    null, '#B1704C'),
  ('Grace',          'grace',        'Sermons on mercy, forgiveness, and the grace of God.',                          null, '#C47B7B'),
  ('Discipleship',   'discipleship', 'Sermons on following Jesus and growing in spiritual maturity.',                 null, '#5E6B7A'),
  ('Worship',        'worship',      'Sermons on praise, adoration, and the heart of worship.',                       null, '#9A5C9A'),
  ('Holy Spirit',    'holy-spirit',  'Sermons on the person, gifts, and work of the Holy Spirit.',                    null, '#A1533E'),
  ('Sex & Identity', 'sex-identity', 'Sermons on biblical sexuality, identity in Christ, purity, and personhood.',    null, '#7C6B49'),
  ('End Times',      'end-times',    'Sermons on biblical eschatology, readiness, and the return of Christ.',         null, '#6A5B5B'),
  ('Supernatural',   'supernatural', 'Sermons on miracles, signs, wonders, and the power of God.',                    null, '#4B6FA3')
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  color = excluded.color;
