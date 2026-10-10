import { SLOTS, TILES, TILE, TAGS, ROLES, PERSPECTIVES, OTHER_SEAT } from './content.mjs';

export const ROUNDS = SLOTS.length;
export const GOALS_PER_SIDE = 3;
export const OFFER_SIZE = 2;
const POOL_SIZE = 10;
const LAST = SLOTS.length - 1;

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(list, rand) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const key = (side) => (side === 'delight' ? 'd' : 'g');
const tagsOf = (id, side) => (id ? TILE[id][key(side)] : []);
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const WORD = ['', 'One', 'Two', 'Three', 'Four'];
const TIMES = ['', 'once', 'twice', 'three times'];

export function goalText(goal) {
  const noun = goal.tag ? TAGS[goal.side][goal.tag] : null;
  switch (goal.kind) {
    case 'count': return `${cap(noun)}, ${TIMES[goal.n]}`;
    case 'early': return `${cap(noun)}, early`;
    case 'late': return `${cap(noun)}, late`;
    case 'end': return `End on ${noun}`;
    case 'start': return `Start with ${noun}`;
    case 'variety': return `${WORD[goal.n]} kinds of ${goal.side}`;
    default: return '';
  }
}

export function goalMet(goal, board) {
  const has = (i) => tagsOf(board[i], goal.side).includes(goal.tag);
  const idx = SLOTS.map((_, i) => i);
  switch (goal.kind) {
    case 'count': return idx.filter(has).length >= goal.n;
    case 'early': return [0, 1].some(has);
    case 'late': return [LAST - 1, LAST].some(has);
    case 'end': return has(LAST);
    case 'start': return has(0);
    case 'variety': return new Set(board.flatMap((id) => tagsOf(id, goal.side))).size >= goal.n;
    default: return false;
  }
}

function candidateGoals(side, target) {
  const out = [];
  for (const tag of Object.keys(TAGS[side])) {
    const at = target.map((id, i) => (tagsOf(id, side).includes(tag) ? i : -1)).filter((i) => i >= 0);
    if (!at.length) continue;
    if (at.length >= 2) out.push({ side, kind: 'count', tag, n: Math.min(at.length, 3) });
    if (at.some((i) => i <= 1)) out.push({ side, kind: 'early', tag });
    if (at.some((i) => i >= LAST - 1)) out.push({ side, kind: 'late', tag });
    if (at.includes(LAST)) out.push({ side, kind: 'end', tag });
    if (at.includes(0)) out.push({ side, kind: 'start', tag });
  }
  const kinds = new Set(target.flatMap((id) => tagsOf(id, side))).size;
  if (kinds >= 3) out.push({ side, kind: 'variety', n: Math.min(kinds, 4) });
  return out;
}

function pickGoals(side, target, rand) {
  const picked = [];
  const usedTags = new Set();
  const usedKinds = new Set();
  const all = shuffle(candidateGoals(side, target), rand);
  for (const pass of [0, 1, 2]) {
    for (const g of all) {
      if (picked.length === GOALS_PER_SIDE || picked.includes(g)) continue;
      const freshTag = !g.tag || !usedTags.has(g.tag);
      const freshKind = !usedKinds.has(g.kind);
      if ((pass === 0 && freshTag && freshKind) || (pass === 1 && freshTag) || pass === 2) {
        picked.push(g);
        if (g.tag) usedTags.add(g.tag);
        usedKinds.add(g.kind);
      }
    }
  }
  return picked.map((g) => ({ ...g, text: goalText(g) }));
}

function drawDay(rand) {
  const deck = shuffle(TILES, rand);
  const both = deck.filter((t) => t.d.length && t.g.length).slice(0, 2);
  const rest = deck.filter((t) => !both.includes(t));
  const target = shuffle([...both, ...rest.slice(0, SLOTS.length - both.length)], rand).map((t) => t.id);
  const decoys = rest.slice(SLOTS.length - both.length, SLOTS.length - both.length + POOL_SIZE - target.length).map((t) => t.id);
  return { target, decoys };
}

const enoughGoals = (target) =>
  PERSPECTIVES.every((p) => candidateGoals(ROLES[p].side, target).length >= GOALS_PER_SIDE);

// A game is one Saturday: both players secretly pick a perspective, play
// five offer/take rounds (one per part of the day), then guess each other's pick.
export function newGame(seed, extra = {}) {
  const rand = rng(seed);
  let day = drawDay(rand);
  while (!enoughGoals(day.target)) day = drawDay(rand);
  return {
    seed,
    phase: 'pick',
    picks: { a: null, b: null },
    goals: { a: [], b: [] },
    target: day.target,
    pool: shuffle([...day.target, ...day.decoys], rand),
    board: SLOTS.map(() => null),
    round: 1,
    step: 'offer',
    first: rand() < 0.5 ? 'a' : 'b',
    offer: [],
    history: [],
    said: [],
    guesses: { a: null, b: null },
    guestId: null,
    game: 1,
    ...extra,
  };
}

export const offerer = (state) => (state.round % 2 === 1 ? state.first : OTHER_SEAT[state.first]);
export const chooser = (state) => OTHER_SEAT[offerer(state)];

// Seats whose move it is right now.
export function due(state) {
  switch (state.phase) {
    case 'pick': return ['a', 'b'].filter((s) => !state.picks[s]);
    case 'play': return [state.step === 'offer' ? offerer(state) : chooser(state)];
    case 'guess': return ['a', 'b'].filter((s) => !state.guesses[s]);
    default: return [];
  }
}

function goalsFor(state, seat) {
  const salt = seat === 'a' ? 0x9e3779b9 : 0x85ebca6b;
  return pickGoals(ROLES[state.picks[seat]].side, state.target, rng((state.seed ^ salt) >>> 0));
}

export function score(state) {
  const met = (seat) => state.goals[seat].filter((g) => goalMet(g, state.board)).length;
  const a = met('a');
  const b = met('b');
  const value = Math.min(a, b);
  const reads = {
    a: state.guesses.a != null && state.guesses.a === state.picks.b,
    b: state.guesses.b != null && state.guesses.b === state.picks.a,
  };
  return { a, b, value, win: value >= 2, full: value === GOALS_PER_SIDE, reads };
}

export function reduce(state, seat, action) {
  if (!state || (seat !== 'a' && seat !== 'b')) return state;
  switch (action.type) {
    case 'again': {
      if (state.phase !== 'reveal') return state;
      const seed = (Math.imul(state.seed, 2654435761) + 1) >>> 0;
      return newGame(seed, { guestId: state.guestId, game: state.game + 1 });
    }
    case 'pick': {
      if (state.phase !== 'pick' || state.picks[seat] || !ROLES[action.perspective]) return state;
      const next = { ...state, picks: { ...state.picks, [seat]: action.perspective } };
      if (!next.picks.a || !next.picks.b) return next;
      return { ...next, phase: 'play', goals: { a: goalsFor(next, 'a'), b: goalsFor(next, 'b') } };
    }
    case 'offer': {
      if (state.phase !== 'play' || state.step !== 'offer' || seat !== offerer(state)) return state;
      const tiles = Array.isArray(action.tiles) ? action.tiles : [];
      if (tiles.length !== OFFER_SIZE || new Set(tiles).size !== OFFER_SIZE) return state;
      if (!tiles.every((t) => state.pool.includes(t))) return state;
      return { ...state, step: 'choose', offer: tiles };
    }
    case 'take': {
      if (state.phase !== 'play' || state.step !== 'choose' || seat !== chooser(state)) return state;
      if (!state.offer.includes(action.tile)) return state;
      const board = state.board.slice();
      board[state.round - 1] = action.tile;
      const history = [...state.history, { round: state.round, offerer: offerer(state), offer: state.offer, took: action.tile }];
      const done = state.round >= ROUNDS;
      return {
        ...state,
        board,
        history,
        pool: state.pool.filter((id) => id !== action.tile),
        offer: [],
        step: 'offer',
        round: done ? state.round : state.round + 1,
        phase: done ? 'guess' : 'play',
      };
    }
    case 'say': {
      if (state.phase !== 'play') return state;
      const text = String(action.text || '').slice(0, 60);
      if (!text) return state;
      return { ...state, said: [...state.said, { seat, text, n: state.said.length }].slice(-6) };
    }
    case 'guess': {
      if (state.phase !== 'guess' || state.guesses[seat] || !ROLES[action.perspective]) return state;
      const guesses = { ...state.guesses, [seat]: action.perspective };
      return { ...state, guesses, phase: guesses.a && guesses.b ? 'reveal' : 'guess' };
    }
    default:
      return state;
  }
}

// True if some way of filling the day from the pool meets every goal for both seats.
export function solvable(state) {
  const tiles = [...state.pool, ...state.board.filter(Boolean)];
  const perm = (left, picked) => {
    if (picked.length === SLOTS.length) return score({ ...state, board: picked }).full;
    return left.some((id, i) => perm([...left.slice(0, i), ...left.slice(i + 1)], [...picked, id]));
  };
  return perm(tiles, []);
}
