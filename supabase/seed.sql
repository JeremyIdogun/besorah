-- Euangelion — Pillar seed data

INSERT INTO pillars (name, slug, description, icon, color) VALUES
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
ON CONFLICT (slug) DO NOTHING;
