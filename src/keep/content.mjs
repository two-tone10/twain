import { LIBRARY } from './library.mjs';

// The seven whys. Order matters: each why owns a strip of sky, left to right.
export const WHYS = [
  { key: 'delight', about: 'Moments that simply feel good. No reason needed.', name: 'Delight', color: '#ef8f9f', line: 'You kept what simply feels good.' },
  { key: 'setting', about: 'Moments where the place is the point.', name: 'Setting', color: '#d9b26a', line: 'You kept the places.' },
  { key: 'novelty', about: 'Moments that are new to you.', name: 'Novelty', color: '#6fd0d8', line: 'You kept what was new.' },
  { key: 'company', about: 'Moments that matter because of who’s there.', name: 'Company', color: '#f3b98a', line: 'You kept the moments with people in them.' },
  { key: 'skill', about: 'Moments where you get a little better at something.', name: 'Skill', color: '#a7c48a', line: 'You kept what you’re getting better at.' },
  { key: 'taste', about: 'Moments you seek out because they’re really good.', name: 'Taste', color: '#b79be0', line: 'You kept what you know is really good.' },
  { key: 'direction', about: 'Moments that are part of where your life is heading.', name: 'Direction', color: '#7fb2f0', line: 'You kept what’s part of where your life is heading.' },
];

export const WHY = Object.fromEntries(WHYS.map((w, i) => [w.key, { ...w, index: i }]));

// Moments live in library.mjs, which the library portal generates. Each deck has every why.
export const DECKS = [
  { key: 'everyday', name: 'Everyday', who: 'A bit of everything' },
  { key: 'campus', name: 'Campus', who: 'College and the years just after' },
  { key: 'city', name: 'New city', who: 'Just moved somewhere' },
  { key: 'kids', name: 'With kids', who: 'Parents, any age of kid' },
  { key: 'later', name: 'Next chapter', who: 'Retired, or nearly' },
  { key: 'young', name: 'Young', who: 'Kids, about 7 to 13' },
];
export const DECK = Object.fromEntries(DECKS.map((d) => [d.key, d]));

// Texts by why for one deck. A deck that's short on a why borrows from Everyday so rounds stay even.
export function poolFor(deck = 'everyday', min = 4) {
  const by = Object.fromEntries(WHYS.map((w) => [w.key, []]));
  for (const m of LIBRARY) if (m.d === deck) by[m.k].push(m.t);
  if (deck !== 'everyday') {
    for (const m of LIBRARY) if (m.d === 'everyday' && by[m.k].length < min && !by[m.k].includes(m.t)) by[m.k].push(m.t);
  }
  return by;
}
export const POOL = poolFor('everyday');

export const BASKET = 5;
export const ROUND_MS = 45000;
export const CUT_MS = 6000;
export const SOLO_PER_WHY = 3; // 21 moments a round
export const DUEL_PER_WHY = 4; // 28 moments a duel
