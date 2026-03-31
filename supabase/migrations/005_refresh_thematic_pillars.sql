-- Refresh thematic pillar taxonomy for current product language.
-- Safe to run multiple times.

do $$
declare
  worship_id uuid;
  deliverance_id uuid;
  healing_id uuid;
  supernatural_id uuid;
  supernatural_healing_id uuid;
begin
  select id into worship_id from pillars where slug = 'worship' limit 1;
  select id into deliverance_id from pillars where slug = 'deliverance' limit 1;

  if worship_id is not null and deliverance_id is null then
    update pillars
    set
      name = 'Deliverance',
      slug = 'deliverance',
      description = 'Sermons on spiritual warfare, freedom in Christ, and deliverance from oppression.',
      icon = null,
      color = '#9A5C9A'
    where id = worship_id;
  elsif worship_id is not null and deliverance_id is not null then
    insert into sermon_pillars (sermon_id, pillar_id, source, confidence_score)
    select sp.sermon_id, deliverance_id, sp.source, sp.confidence_score
    from sermon_pillars sp
    where sp.pillar_id = worship_id
    on conflict (sermon_id, pillar_id) do update
    set
      source = excluded.source,
      confidence_score = greatest(
        coalesce(sermon_pillars.confidence_score, 0),
        coalesce(excluded.confidence_score, 0)
      );

    delete from pillars where id = worship_id;
  end if;

  select id into healing_id from pillars where slug = 'healing' limit 1;
  select id into supernatural_id from pillars where slug = 'supernatural' limit 1;
  select id into supernatural_healing_id from pillars where slug = 'supernatural-healing' limit 1;

  if supernatural_healing_id is null then
    if supernatural_id is not null then
      update pillars
      set
        name = 'Supernatural & Healing',
        slug = 'supernatural-healing',
        description = 'Sermons on miracles, divine healing, signs, wonders, and the power of God.',
        icon = null,
        color = '#4B6FA3'
      where id = supernatural_id;

      supernatural_healing_id := supernatural_id;
    elsif healing_id is not null then
      update pillars
      set
        name = 'Supernatural & Healing',
        slug = 'supernatural-healing',
        description = 'Sermons on miracles, divine healing, signs, wonders, and the power of God.',
        icon = null,
        color = '#4B6FA3'
      where id = healing_id;

      supernatural_healing_id := healing_id;
    end if;
  end if;

  if supernatural_healing_id is not null and healing_id is not null and healing_id <> supernatural_healing_id then
    insert into sermon_pillars (sermon_id, pillar_id, source, confidence_score)
    select sp.sermon_id, supernatural_healing_id, sp.source, sp.confidence_score
    from sermon_pillars sp
    where sp.pillar_id = healing_id
    on conflict (sermon_id, pillar_id) do update
    set
      source = excluded.source,
      confidence_score = greatest(
        coalesce(sermon_pillars.confidence_score, 0),
        coalesce(excluded.confidence_score, 0)
      );

    delete from pillars where id = healing_id;
  end if;

  if supernatural_healing_id is not null and supernatural_id is not null and supernatural_id <> supernatural_healing_id then
    insert into sermon_pillars (sermon_id, pillar_id, source, confidence_score)
    select sp.sermon_id, supernatural_healing_id, sp.source, sp.confidence_score
    from sermon_pillars sp
    where sp.pillar_id = supernatural_id
    on conflict (sermon_id, pillar_id) do update
    set
      source = excluded.source,
      confidence_score = greatest(
        coalesce(sermon_pillars.confidence_score, 0),
        coalesce(excluded.confidence_score, 0)
      );

    delete from pillars where id = supernatural_id;
  end if;
end $$;

insert into pillars (name, slug, description, icon, color)
values
  ('Faith',          'faith',        'Sermons on trust in God, belief, and spiritual confidence.',                     null, '#356B8C'),
  ('Supernatural & Healing', 'supernatural-healing', 'Sermons on miracles, divine healing, signs, wonders, and the power of God.', null, '#4B6FA3'),
  ('Finance',        'finance',      'Sermons on stewardship, generosity, debt freedom, and financial wisdom.',       null, '#8B6F2A'),
  ('Prayer',         'prayer',       'Sermons on prayer, intercession, and communion with God.',                      null, '#6C5BA7'),
  ('Family',         'family',       'Sermons on marriage, parenting, and Christ-centered homes.',                    null, '#B1704C'),
  ('Grace',          'grace',        'Sermons on mercy, forgiveness, and the grace of God.',                          null, '#C47B7B'),
  ('Discipleship',   'discipleship', 'Sermons on following Jesus and growing in spiritual maturity.',                 null, '#5E6B7A'),
  ('Deliverance',    'deliverance',  'Sermons on spiritual warfare, freedom in Christ, and deliverance from oppression.', null, '#9A5C9A'),
  ('Holy Spirit',    'holy-spirit',  'Sermons on the person, gifts, and work of the Holy Spirit.',                    null, '#A1533E'),
  ('Sex & Identity', 'sex-identity', 'Sermons on biblical sexuality, identity in Christ, purity, and personhood.',    null, '#7C6B49'),
  ('End Times',      'end-times',    'Sermons on biblical eschatology, readiness, and the return of Christ.',         null, '#6A5B5B')
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  color = excluded.color;
