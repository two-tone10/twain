import { SLOTS, TILES, TILE, TAGS, ROLES, PERSPECTIVES, OTHER_SEAT } from './content.mjs';

export const ROUNDS = SLOTS.length;
export const GOALS_PER_SIDE = 3;
const SIDE_GOALS = 2;
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
export const flip = (side) => (side === 'delight' ? 'growth' : 'delight');
export const sideOf = (persp) => ROLES[persp].side;
const persOf = (side) => PERSPECTIVES.find((p) => ROLES[p].side === side);
// A tile that reads purely as one side: tagged for it, invisible to the other.
const pureFor = (id, side) => TILE[id][key(side)].length > 0 && TILE[id][key(flip(side))].length === 0;
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
    case 'tile': return `Get ${TILE[goal.tile].name.toLowerCase()} on the day`;
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
    case 'tile': return board.includes(goal.tile);
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

function pickGoals(all, n) {
  const picked = [];
  const usedTags = new Set();
  const usedKinds = new Set();
  for (const pass of [0, 1, 2]) {
    for (const g of all) {
      if (picked.length === n || picked.includes(g)) continue;
      const freshTag = !g.tag || !usedTags.has(g.tag);
      const freshKind = !usedKinds.has(g.kind);
      if ((pass === 0 && freshTag && freshKind) || (pass === 1 && freshTag) || pass === 2) {
        picked.push(g);
        if (g.tag) usedTags.add(g.tag);
        usedKinds.add(g.kind);
      }
    }
  }
  return picked;
}

const withText = (g) => ({ ...g, text: goalText(g) });
const maskGoal = (tile, side) => withText({ side, kind: 'tile', tile, mask: true });

function drawDay(rand) {
  const deck = shuffle(TILES, rand);
  const both = deck.filter((t) => t.d.length && t.g.length).slice(0, 2);
  const rest = deck.filter((t) => !both.includes(t));
  const target = shuffle([...both, ...rest.slice(0, SLOTS.length - both.length)], rand).map((t) => t.id);
  const decoys = rest.slice(SLOTS.length - both.length, SLOTS.length - both.length + POOL_SIZE - target.length).map((t) => t.id);
  return { target, decoys };
}

const dayWorks = (target) =>
  ['delight', 'growth'].every((side) => candidateGoals(side, target).length >= SIDE_GOALS && target.some((id) => pureFor(id, side)));

// True if the empty slots can still be filled from the pool so every goal is met.
export function feasible(goals, board, pool) {
  const empty = board.map((id, i) => (id ? -1 : i)).filter((i) => i >= 0);
  const fill = (k, b, left) => {
    if (k === empty.length) return goals.every((g) => goalMet(g, b));
    for (let i = 0; i < left.length; i++) {
      b[empty[k]] = left[i];
      if (fill(k + 1, b, [...left.slice(0, i), ...left.slice(i + 1)])) return true;
    }
    b[empty[k]] = null;
    return false;
  };
  return fill(0, board.slice(), pool);
}

// The rounds of a Saturday. Each step names who acts: F = the round's lead, O = the other, both = at once.
export const ROUND_KIND = ['offer', 'veto', 'turn', 'blind', 'last'];
export const ROUND_NAME = { offer: 'Offer', veto: 'Veto', turn: 'The Turn', blind: 'Blind', last: 'Last call' };
const STEPS = {
  offer: { offer: 'F', take: 'O' },
  veto: { show: 'F', strike: 'O', place: 'F' },
  turn: { turn: 'both', offer: 'F', take: 'O' },
  blind: { blind: 'both' },
  last: { cut: 'O', fill: 'F' },
};
// How many pool tiles a step asks for.
export const PICK_COUNT = { offer: 2, show: 3, blind: 1, cut: 1, fill: 1 };

export const kindOf = (state) => ROUND_KIND[state.round - 1];
const firstStep = (round) => Object.keys(STEPS[ROUND_KIND[round - 1]])[0];
const who = (state, step = state.step) => STEPS[kindOf(state)][step];
const lead = (state) => state.first;
const follow = (state) => OTHER_SEAT[state.first];
const actsAlone = (state, seat, step) => state.step === step && seat === (who(state, step) === 'F' ? lead(state) : follow(state));

// A game is one Saturday: secret picks, five rounds of different tasks with a turn in the middle,
// then each player reads the other: final side, whether they switched, and their Mask.
export function newGame(seed, extra = {}) {
  const rand = rng(seed);
  let day = drawDay(rand);
  while (!dayWorks(day.target)) day = drawDay(rand);
  return {
    seed,
    phase: 'pick',
    picks: { a: null, b: null },
    now: { a: null, b: null },
    switched: { a: null, b: null },
    goals: { a: [], b: [] },
    masks: { a: null, b: null },
    firstMasks: { a: null, b: null },
    target: day.target,
    pool: shuffle([...day.target, ...day.decoys], rand),
    board: SLOTS.map(() => null),
    round: 1,
    step: firstStep(1),
    first: rand() < 0.5 ? 'a' : 'b',
    offer: [],
    struck: null,
    cut: null,
    blind: { a: null, b: null },
    history: [],
    said: [],
    guesses: { a: null, b: null },
    guestId: null,
    game: 1,
    ...extra,
  };
}

// Seats whose move it is right now.
export function due(state) {
  switch (state.phase) {
    case 'pick': return ['a', 'b'].filter((s) => !state.picks[s]);
    case 'play': {
      if (state.step === 'turn') return ['a', 'b'].filter((s) => state.switched[s] == null);
      if (state.step === 'blind') return ['a', 'b'].filter((s) => !state.blind[s]);
      return [who(state) === 'F' ? lead(state) : follow(state)];
    }
    case 'guess': return ['a', 'b'].filter((s) => !state.guesses[s]);
    default: return [];
  }
}

const SALT = { a: 0x9e3779b9, b: 0x85ebca6b };

function dealGoals(state, seat) {
  const rand = rng((state.seed ^ SALT[seat]) >>> 0);
  const side = sideOf(state.picks[seat]);
  const goals = pickGoals(shuffle(candidateGoals(side, state.target), rand), SIDE_GOALS).map(withText);
  const masks = shuffle(state.target.filter((id) => pureFor(id, flip(side))), rand);
  return { goals: [...goals, maskGoal(masks[0], flip(side))], mask: masks[0] };
}

function allGoals(side) {
  const out = [];
  for (const tag of Object.keys(TAGS[side])) {
    out.push({ side, kind: 'count', tag, n: 2 }, { side, kind: 'early', tag }, { side, kind: 'late', tag });
    out.push({ side, kind: 'start', tag }, { side, kind: 'end', tag });
  }
  out.push({ side, kind: 'variety', n: 3 });
  return out;
}

// Switching at the Turn: two fresh goals for the new side, and a new Mask from the side you left.
function switchGoals(state, seat) {
  const rand = rng((state.seed ^ SALT[seat] ^ 0x51ed27) >>> 0);
  const side = flip(sideOf(state.now[seat]));
  const { board, pool } = state;
  const open = shuffle(allGoals(side), rand).filter((g) => feasible([g], board, pool));
  const fresh = open.filter((g) => !goalMet(g, board));
  const masks = [
    ...shuffle(pool.filter((id) => pureFor(id, flip(side))), rand),
    ...shuffle(pool.filter((id) => TILE[id][key(flip(side))].length && !pureFor(id, flip(side))), rand),
  ];
  const apart = (x, y) => (x.tag || x.kind) !== (y.tag || y.kind);
  for (const cands of [fresh, open]) {
    for (const m of masks) {
      const mg = maskGoal(m, flip(side));
      for (let i = 0; i < cands.length; i++) {
        for (let j = i + 1; j < cands.length; j++) {
          const set = [withText(cands[i]), withText(cands[j]), mg];
          if (apart(cands[i], cands[j]) && feasible(set, board, pool)) return { goals: set, mask: m };
        }
      }
    }
  }
  const m = masks[0] || pool[0];
  return { goals: [...pickGoals(open, SIDE_GOALS).map(withText), maskGoal(m, flip(side))], mask: m };
}

// Every tile that showed up in a clue: the choices a Mask could hide among.
export function seenTiles(state) {
  const out = [];
  const add = (id) => id && !out.includes(id) && out.push(id);
  for (const h of state.history) {
    (h.offer || h.shown || []).forEach(add);
    if (h.picks) Object.values(h.picks).forEach(add);
    add(h.cut);
    add(h.took);
  }
  return out;
}

const maskAnswer = (state, seat) => (seenTiles(state).includes(state.masks[seat]) ? state.masks[seat] : 'none');

export function score(state) {
  const met = (seat) => state.goals[seat].filter((g) => goalMet(g, state.board)).length;
  const a = met('a');
  const b = met('b');
  const value = Math.min(a, b);
  const read = (seat) => {
    const g = state.guesses[seat];
    const p = OTHER_SEAT[seat];
    if (!g) return { side: false, switched: false, mask: false, n: 0 };
    const r = { side: g.side === state.now[p], switched: g.switched === state.switched[p], mask: g.mask === maskAnswer(state, p) };
    return { ...r, n: Number(r.side) + Number(r.switched) + Number(r.mask) };
  };
  return { a, b, value, win: value >= 2, full: value === GOALS_PER_SIDE, reads: { a: read('a'), b: read('b') } };
}

function place(state, tile, entry) {
  const board = state.board.slice();
  board[state.round - 1] = tile;
  const done = state.round >= ROUNDS;
  const round = done ? state.round : state.round + 1;
  return {
    ...state,
    board,
    pool: state.pool.filter((id) => id !== tile),
    history: [...state.history, { round: state.round, kind: kindOf(state), ...entry, took: tile }],
    offer: [],
    struck: null,
    cut: null,
    blind: { a: null, b: null },
    round,
    step: done ? state.step : firstStep(round),
    phase: done ? 'guess' : 'play',
  };
}

const tilesOk = (state, tiles, n) =>
  Array.isArray(tiles) && tiles.length === n && new Set(tiles).size === n && tiles.every((t) => state.pool.includes(t));

export function reduce(state, seat, action) {
  if (!state || (seat !== 'a' && seat !== 'b')) return state;
  const playing = state.phase === 'play';
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
      const a = dealGoals(next, 'a');
      const b = dealGoals(next, 'b');
      return {
        ...next,
        phase: 'play',
        now: { ...next.picks },
        goals: { a: a.goals, b: b.goals },
        masks: { a: a.mask, b: b.mask },
        firstMasks: { a: a.mask, b: b.mask },
      };
    }
    case 'offer': {
      if (!playing || !actsAlone(state, seat, 'offer') || !tilesOk(state, action.tiles, PICK_COUNT.offer)) return state;
      return { ...state, step: 'take', offer: action.tiles };
    }
    case 'take': {
      if (!playing || !actsAlone(state, seat, 'take') || !state.offer.includes(action.tile)) return state;
      return place(state, action.tile, { by: OTHER_SEAT[seat], to: seat, offer: state.offer });
    }
    case 'show': {
      if (!playing || !actsAlone(state, seat, 'show') || !tilesOk(state, action.tiles, PICK_COUNT.show)) return state;
      return { ...state, step: 'strike', offer: action.tiles };
    }
    case 'strike': {
      if (!playing || !actsAlone(state, seat, 'strike') || !state.offer.includes(action.tile)) return state;
      return { ...state, step: 'place', struck: action.tile };
    }
    case 'place': {
      if (!playing || !actsAlone(state, seat, 'place')) return state;
      if (!state.offer.includes(action.tile) || action.tile === state.struck) return state;
      return place(state, action.tile, { by: seat, striker: OTHER_SEAT[seat], shown: state.offer, struck: state.struck });
    }
    case 'turn': {
      if (!playing || state.step !== 'turn' || state.switched[seat] != null || typeof action.switch !== 'boolean') return state;
      const next = { ...state, switched: { ...state.switched, [seat]: action.switch } };
      if (next.switched.a == null || next.switched.b == null) return next;
      const now = { ...next.now };
      const goals = { ...next.goals };
      const masks = { ...next.masks };
      for (const s of ['a', 'b']) {
        if (!next.switched[s]) continue;
        const dealt = switchGoals(next, s);
        now[s] = persOf(flip(sideOf(next.now[s])));
        goals[s] = dealt.goals;
        masks[s] = dealt.mask;
      }
      return { ...next, now, goals, masks, step: 'offer' };
    }
    case 'blind': {
      if (!playing || state.step !== 'blind' || state.blind[seat] || !state.pool.includes(action.tile)) return state;
      const blind = { ...state.blind, [seat]: action.tile };
      if (!blind.a || !blind.b) return { ...state, blind };
      const sync = blind.a === blind.b;
      const tile = sync ? blind.a : rng((state.seed + 7919) >>> 0)() < 0.5 ? blind.a : blind.b;
      return place(state, tile, { picks: blind, sync });
    }
    case 'cut': {
      if (!playing || !actsAlone(state, seat, 'cut') || !state.pool.includes(action.tile)) return state;
      return { ...state, step: 'fill', cut: action.tile, pool: state.pool.filter((id) => id !== action.tile) };
    }
    case 'fill': {
      if (!playing || !actsAlone(state, seat, 'fill') || !state.pool.includes(action.tile)) return state;
      return place(state, action.tile, { by: seat, cutter: OTHER_SEAT[seat], cut: state.cut });
    }
    case 'say': {
      if (!playing) return state;
      const text = String(action.text || '').slice(0, 60);
      if (!text) return state;
      return { ...state, said: [...state.said, { seat, text, n: state.said.length }].slice(-6) };
    }
    case 'guess': {
      if (state.phase !== 'guess' || state.guesses[seat]) return state;
      const { side, switched, mask } = action;
      if (!ROLES[side] || typeof switched !== 'boolean' || (mask !== 'none' && !seenTiles(state).includes(mask))) return state;
      const guesses = { ...state.guesses, [seat]: { side, switched, mask } };
      return { ...state, guesses, phase: guesses.a && guesses.b ? 'reveal' : 'guess' };
    }
    default:
      return state;
  }
}

export const leadSeat = lead;
export const followSeat = follow;
