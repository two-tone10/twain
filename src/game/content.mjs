export const SLOTS = ['Morning', 'Midday', 'Afternoon', 'Evening', 'Night'];

export const ROLES = {
  savorer: {
    name: 'The Savorer',
    side: 'delight',
    line: 'You live for warmth, taste, play, rest and beauty.',
    nudge: 'Make today feel good.',
  },
  steward: {
    name: 'The Steward',
    side: 'growth',
    line: 'You tend what lasts: craft, care, learning, roots, an aim.',
    nudge: 'Make today grow something.',
  },
};

export const PERSPECTIVES = ['savorer', 'steward'];

export const OTHER_SEAT = { a: 'b', b: 'a' };

export const TAGS = {
  delight: {
    warm: 'something warm',
    taste: 'something tasty',
    play: 'some play',
    rest: 'some rest',
    beauty: 'something beautiful',
  },
  growth: {
    craft: 'making something',
    care: 'caring for someone',
    learn: 'learning something',
    roots: 'something rooted',
    aim: 'a step toward an aim',
  },
};

export const TAG_LABEL = {
  warm: 'Warm', taste: 'Taste', play: 'Play', rest: 'Rest', beauty: 'Beauty',
  craft: 'Craft', care: 'Care', learn: 'Learn', roots: 'Roots', aim: 'Aim',
};

// d = delight tags (seen by the Savorer), g = growth tags (seen by the Steward).
export const TILES = [
  { id: 'coffee', emoji: '☕', name: 'Slow coffee', d: ['warm', 'taste'], g: [] },
  { id: 'bread', emoji: '🍞', name: 'Bake bread for a friend', d: ['warm', 'taste'], g: ['craft', 'care'] },
  { id: 'nap', emoji: '😴', name: 'Long nap', d: ['rest'], g: [] },
  { id: 'swim', emoji: '🏊', name: 'Lake swim', d: ['play', 'beauty'], g: [] },
  { id: 'garden', emoji: '🌱', name: 'Plant the garden', d: [], g: ['roots', 'aim'] },
  { id: 'guitar', emoji: '🎸', name: 'Guitar practice', d: ['play'], g: ['craft', 'learn'] },
  { id: 'market', emoji: '🧺', name: 'Farmers market', d: ['taste', 'beauty'], g: ['roots'] },
  { id: 'call', emoji: '📞', name: 'Call grandma', d: [], g: ['care', 'roots'] },
  { id: 'movie', emoji: '🎬', name: 'Movie matinee', d: ['rest', 'play'], g: [] },
  { id: 'pantry', emoji: '🥫', name: 'Food pantry shift', d: [], g: ['care', 'aim'] },
  { id: 'bike', emoji: '🔧', name: 'Fix the bike', d: [], g: ['craft', 'learn'] },
  { id: 'novel', emoji: '📖', name: 'Read in the sun', d: ['rest', 'warm'], g: ['learn'] },
  { id: 'dinner', emoji: '🍝', name: 'Cook dinner for friends', d: ['taste', 'warm'], g: ['care'] },
  { id: 'sunset', emoji: '🌅', name: 'Watch the sunset', d: ['beauty', 'rest'], g: [] },
  { id: 'pottery', emoji: '🏺', name: 'Pottery class', d: ['play'], g: ['craft'] },
  { id: 'hike', emoji: '🥾', name: 'Trail hike', d: ['beauty'], g: ['aim'] },
  { id: 'plan', emoji: '🗒️', name: 'Plan the month', d: [], g: ['aim'] },
  { id: 'arcade', emoji: '🕹️', name: 'Arcade night', d: ['play'], g: [] },
  { id: 'bath', emoji: '🛁', name: 'Hot bath', d: ['warm', 'rest'], g: [] },
  { id: 'tutor', emoji: '✏️', name: 'Tutor a neighbor kid', d: [], g: ['care', 'learn'] },
  { id: 'icecream', emoji: '🍦', name: 'Ice cream walk', d: ['taste', 'play'], g: [] },
  { id: 'fence', emoji: '🪵', name: 'Mend the fence', d: [], g: ['craft', 'roots'] },
  { id: 'dance', emoji: '💃', name: 'Go dancing', d: ['play', 'beauty'], g: [] },
  { id: 'letter', emoji: '✉️', name: 'Write a letter', d: [], g: ['care', 'craft'] },
  { id: 'stars', emoji: '🔭', name: 'Stargazing', d: ['beauty'], g: ['learn'] },
  { id: 'jam', emoji: '🍓', name: 'Make jam', d: ['taste'], g: ['craft', 'roots'] },
];

export const TILE = Object.fromEntries(TILES.map((t) => [t.id, t]));

// Neutral on purpose: nothing here should give away which side you picked.
export const PHRASES = ['Love that one', 'Not for me', 'Either works', 'Your call', 'Trust me', 'Hmm'];
