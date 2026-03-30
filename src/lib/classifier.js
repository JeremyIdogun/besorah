/**
 * Rules-based pillar tag suggestion engine.
 * Inputs: sermon title, description, show title, publisher/church.
 * Outputs: array of { pillar_slug, confidence_score, source: 'rule' }
 */

const RULES = [
  {
    slug: 'faith',
    keywords: [
      'faith', 'trust god', 'trust in god', 'believe', 'belief', 'walk by faith',
      'confidence in god', 'faithful', 'hope in god',
    ],
  },
  {
    slug: 'holy-spirit',
    keywords: [
      'holy spirit', 'spirit-filled', 'pentecost', 'comforter', 'ruach',
      'holy ghost', 'baptism of the spirit', 'filled with the spirit',
      'spirit of god', 'anointing', 'outpouring',
    ],
  },
  {
    slug: 'finance',
    keywords: [
      'finance', 'financial', 'money', 'wealth', 'prosperity', 'stewardship',
      'budget', 'debt', 'giving', 'tithe', 'tithing', 'provision',
    ],
  },
  {
    slug: 'healing',
    keywords: [
      'healing', 'restoration', 'made whole', 'divine healing', 'healed',
      'wholeness', 'restored', 'health', 'sickness', 'disease', 'miracle healing',
    ],
  },
  {
    slug: 'prayer',
    keywords: [
      'prayer', 'intercession', 'supplication', 'praying', 'pray', 'fasting',
      'communion with god', 'petition', 'warfare prayer', 'night of prayer',
    ],
  },
  {
    slug: 'sex-identity',
    keywords: [
      'sex', 'sexual', 'sexuality', 'identity', 'gender', 'purity',
      'temptation', 'lust', 'marriage bed', 'same-sex', 'orientation',
      'identity in christ', 'manhood', 'womanhood', 'modesty',
    ],
  },
  {
    slug: 'grace',
    keywords: [
      'grace', 'mercy', 'unmerited favour', 'unmerited favor', 'forgiveness',
      'redemption', 'justification', 'mercy of god', 'grace of god', 'favoured',
    ],
  },
  {
    slug: 'supernatural',
    keywords: [
      'miracles', 'signs and wonders', 'power of god', 'supernatural', 'miracle',
      'wonder', 'sign', 'the miraculous', 'healings and miracles', 'mighty works',
    ],
  },
  {
    slug: 'discipleship',
    keywords: [
      'discipleship', 'follow jesus', 'growing in faith', 'disciple', 'following christ',
      'christian living', 'spiritual growth', 'sanctification', 'obedience', 'walk with god',
    ],
  },
  {
    slug: 'family',
    keywords: [
      'family', 'marriage', 'parenting', 'husband', 'wife', 'children', 'household',
      'father', 'mother', 'home', 'relationship', 'godly home', 'biblical family',
    ],
  },
  {
    slug: 'end-times',
    keywords: [
      'return of christ', 'last days', 'eschatology', 'end times', 'rapture',
      'second coming', 'apocalypse', 'tribulation', 'millennium', 'revelation',
      'end of the age', 'parousia',
    ],
  },
  {
    slug: 'worship',
    keywords: [
      'worship', 'praise', 'adoration', 'glorify', 'exaltation', 'thanksgiving',
      'psalms', 'hymns', 'spiritual songs', 'heart of worship', 'worshipper',
    ],
  },
];

/**
 * Score a text against a pillar's keyword list.
 * Returns a value between 0 and 1.
 */
function scoreText(text, keywords) {
  const lower = text.toLowerCase();
  let hits = 0;
  for (const kw of keywords) {
    if (lower.includes(kw)) hits++;
  }
  return Math.min(hits / 2, 1); // cap at 1.0; 2 hits = full confidence
}

/**
 * Suggest up to 3 pillars for a sermon.
 * @param {object} params
 * @param {string} params.title
 * @param {string} params.description
 * @param {string} params.showTitle
 * @param {string} params.publisher
 * @returns {{ pillar_slug: string, confidence_score: number, source: string }[]}
 */
export function suggestPillars({ title = '', description = '', showTitle = '', publisher = '' }) {
  const combined = [title, description, showTitle, publisher].join(' ');

  const scored = RULES.map((rule) => ({
    pillar_slug: rule.slug,
    confidence_score: parseFloat(scoreText(combined, rule.keywords).toFixed(4)),
    source: 'rule',
  })).filter((r) => r.confidence_score > 0);

  scored.sort((a, b) => b.confidence_score - a.confidence_score);

  return scored.slice(0, 3);
}
