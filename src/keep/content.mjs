// The seven whys. Order matters: each why owns a strip of sky, left to right.
export const WHYS = [
  { key: 'delight', name: 'Delight', color: '#ef8f9f', line: 'You kept what simply feels good.' },
  { key: 'setting', name: 'Setting', color: '#d9b26a', line: 'You kept the places.' },
  { key: 'novelty', name: 'Novelty', color: '#6fd0d8', line: 'You kept what was new.' },
  { key: 'company', name: 'Company', color: '#f3b98a', line: 'You kept the moments with people in them.' },
  { key: 'skill', name: 'Skill', color: '#a7c48a', line: 'You kept what you’re getting better at.' },
  { key: 'taste', name: 'Taste', color: '#b79be0', line: 'You kept what you know is really good.' },
  { key: 'direction', name: 'Direction', color: '#7fb2f0', line: 'You kept what’s part of where your life is heading.' },
];

export const WHY = Object.fromEntries(WHYS.map((w, i) => [w.key, { ...w, index: i }]));

export const POOL = {
  delight: ['A slow coffee', 'Sleeping in', 'A hot shower after cold', 'Ice cream on a walk', 'A nap in the sun', 'Your favorite song, loud'],
  setting: ['A table by the window', 'The beach at dusk', 'Your old neighborhood', 'A cabin with no signal', 'The corner bookstore', 'A rooftop at night'],
  novelty: ['A city you’ve never seen', 'A dish you can’t pronounce', 'A trail you’ve never tried', 'A class in something new', 'A random museum', 'Getting a little lost'],
  company: ['Call your brother', 'Dinner with old friends', 'A long walk with your partner', 'Game night', 'Coffee with your mom', 'Your kid’s game'],
  skill: ['Practice guitar', 'Bake the bread again', 'Fix the bike yourself', 'Chess, one more game', 'Run your best mile', 'Learn the hard chord'],
  taste: ['The perfect espresso', 'A record, start to finish', 'The tasting menu', 'A great used book', 'The good olive oil', 'A film you’ve rewatched'],
  direction: ['Work on the big project', 'Mentor someone', 'Volunteer Saturday', 'Write the first page', 'Save for the plan', 'Show up for the cause'],
};

export const BASKET = 5;
export const ROUND_MS = 45000;
export const CUT_MS = 6000;
export const SOLO_PER_WHY = 3; // 21 moments a round
export const DUEL_PER_WHY = 4; // 28 moments a duel
