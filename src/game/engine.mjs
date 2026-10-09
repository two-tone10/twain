import { SLOTS, TILES, TILE, TAGS, OTHER } from './content.mjs';

export const MOVES = 10;
export const GOALS_PER_SIDE = 3;
const POOL_SIZE = 12;

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
    case 'early': return [0, 1, 2].some(has);
    case 'late': return [3, 4, 5].some(has);
    case 'end': return has(5);
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
    if (at.some((i) => i <= 2)) out.push({ side, kind: 'early', tag });
    if (at.some((i) => i >= 3)) out.push({ side, kind: 'late', tag });
    if (at.includes(5)) out.push({ side, kind: 'end', tag });
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
  const chosen = shuffle([...both, ...rest.slice(0, 4)], rand).map((t) => t.id);
  const decoys = rest.slice(4, 4 + POOL_SIZE - chosen.length).map((t) => t.id);
  const goals = { savorer: pickGoals('delight', chosen, rand), steward: pickGoals('growth', chosen, rand) };
  return { chosen, decoys, goals };
}

export function makeRound(seed, savorerStarts = true) {
  const rand = rng(seed);
  let day = drawDay(rand);
  while (day.goals.savorer.length < GOALS_PER_SIDE || day.goals.steward.length < GOALS_PER_SIDE) {
    day = drawDay(rand);
  }
  return {
    seed,
    pool: shuffle([...day.chosen, ...day.decoys], rand),
    board: SLOTS.map(() => null),
    movesLeft: MOVES,
    turn: savorerStarts ? 'savorer' : 'steward',
    marks: {},
    said: [],
    ready: { savorer: false, steward: false },
    phase: 'play',
    goals: day.goals,
  };
}

export function newGame(seed) {
  return { round: 1, ...makeRound(seed, true), hostRole: seed % 2 ? 'savorer' : 'steward', guestId: null };
}

export function score(state) {
  const delight = state.goals.savorer.filter((g) => goalMet(g, state.board)).length;
  const growth = state.goals.steward.filter((g) => goalMet(g, state.board)).length;
  const value = Math.min(delight, growth);
  return { delight, growth, value, win: value >= 2, full: value === GOALS_PER_SIDE };
}

export function boardFull(state) {
  return state.board.every(Boolean);
}

export function canFinish(state) {
  return boardFull(state) || state.movesLeft === 0;
}

const unready = { savorer: false, steward: false };

export function reduce(state, role, action) {
  if (!state || !role) return state;
  if (action.type === 'next') {
    if (state.phase !== 'reveal') return state;
    const seed = (Math.imul(state.seed, 2654435761) + 1) >>> 0;
    const round = state.round + 1;
    return {
      ...state,
      ...makeRound(seed, round % 2 === 1),
      round,
      hostRole: OTHER[state.hostRole],
    };
  }
  if (state.phase !== 'play') return state;
  switch (action.type) {
    case 'place': {
      const { tile, slot } = action;
      if (state.turn !== role || state.movesLeft <= 0) return state;
      if (!state.pool.includes(tile) || slot < 0 || slot >= SLOTS.length) return state;
      const board = state.board.slice();
      const bumped = board[slot];
      board[slot] = tile;
      const pool = state.pool.filter((id) => id !== tile);
      if (bumped) pool.push(bumped);
      return { ...state, board, pool, movesLeft: state.movesLeft - 1, turn: OTHER[role], ready: unready };
    }
    case 'pass':
      if (state.turn !== role) return state;
      return { ...state, turn: OTHER[role] };
    case 'mark': {
      const cur = state.marks[action.tile] || {};
      return { ...state, marks: { ...state.marks, [action.tile]: { ...cur, [role]: !cur[role] } } };
    }
    case 'say': {
      const text = String(action.text || '').slice(0, 60);
      if (!text) return state;
      return { ...state, said: [...state.said, { role, text, n: state.said.length }].slice(-6) };
    }
    case 'ready': {
      if (!canFinish(state)) return state;
      const ready = action.both
        ? { savorer: true, steward: true }
        : { ...state.ready, [role]: !state.ready[role] };
      const phase = ready.savorer && ready.steward ? 'reveal' : 'play';
      return { ...state, ready, phase };
    }
    default:
      return state;
  }
}

export function solvable(state) {
  const pool = [...state.pool, ...state.board.filter(Boolean)];
  const perm = (left, picked) => {
    if (picked.length === SLOTS.length) {
      const s = score({ ...state, board: picked });
      return s.full;
    }
    return left.some((id, i) => perm([...left.slice(0, i), ...left.slice(i + 1)], [...picked, id]));
  };
  return perm(pool, []);
}
