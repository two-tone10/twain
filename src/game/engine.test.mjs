import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, reduce, score, goalMet, due, offerer, chooser, solvable, ROUNDS, GOALS_PER_SIDE } from './engine.mjs';
import { TILE, SLOTS } from './content.mjs';

const pickBoth = (s, a, b) => reduce(reduce(s, 'a', { type: 'pick', perspective: a }), 'b', { type: 'pick', perspective: b });

function playRounds(s, n = ROUNDS) {
  for (let i = 0; i < n; i++) {
    s = reduce(s, offerer(s), { type: 'offer', tiles: s.pool.slice(0, 2) });
    s = reduce(s, chooser(s), { type: 'take', tile: s.offer[0] });
  }
  return s;
}

test('a game is five parts of one Saturday', () => {
  assert.equal(SLOTS.length, 5);
  assert.equal(ROUNDS, 5);
});

test('picks are secret until both are in, and both can pick the same side', () => {
  let s = newGame(1);
  assert.equal(s.phase, 'pick');
  assert.deepEqual(due(s), ['a', 'b']);
  s = reduce(s, 'a', { type: 'pick', perspective: 'savorer' });
  assert.equal(s.phase, 'pick');
  assert.deepEqual(due(s), ['b']);
  assert.equal(reduce(s, 'a', { type: 'pick', perspective: 'steward' }).picks.a, 'savorer', 'pick is locked');
  s = reduce(s, 'b', { type: 'pick', perspective: 'savorer' });
  assert.equal(s.phase, 'play');
  assert.equal(s.goals.a.length, GOALS_PER_SIDE);
  assert.equal(s.goals.b.length, GOALS_PER_SIDE);
  for (const g of [...s.goals.a, ...s.goals.b]) assert.equal(g.side, 'delight');
});

test('every game gives three goals for any pair of picks, and a full day is reachable', () => {
  for (let seed = 1; seed <= 400; seed++) {
    for (const [a, b] of [['savorer', 'steward'], ['savorer', 'savorer'], ['steward', 'steward']]) {
      const s = pickBoth(newGame(seed), a, b);
      assert.equal(s.goals.a.length, 3, `seed ${seed}`);
      assert.equal(s.goals.b.length, 3, `seed ${seed}`);
      assert.equal(new Set(s.pool).size, 10);
    }
  }
  for (let seed = 1; seed <= 15; seed++) assert.ok(solvable(pickBoth(newGame(seed), 'savorer', 'steward')), `seed ${seed}`);
});

test('offerer and taker alternate each round, and only they can act', () => {
  let s = pickBoth(newGame(11), 'savorer', 'steward');
  const first = offerer(s);
  const second = chooser(s);
  assert.equal(reduce(s, second, { type: 'offer', tiles: s.pool.slice(0, 2) }), s, 'not the offerer');
  assert.equal(reduce(s, first, { type: 'offer', tiles: s.pool.slice(0, 1) }), s, 'must offer two');
  s = reduce(s, first, { type: 'offer', tiles: s.pool.slice(0, 2) });
  assert.equal(s.step, 'choose');
  assert.equal(reduce(s, first, { type: 'take', tile: s.offer[0] }), s, 'offerer cannot take');
  assert.equal(reduce(s, second, { type: 'take', tile: s.pool[5] }), s, 'must take an offered tile');
  const [took, left] = s.offer;
  s = reduce(s, second, { type: 'take', tile: took });
  assert.equal(s.board[0], took);
  assert.ok(!s.pool.includes(took));
  assert.ok(s.pool.includes(left), 'the passed-over tile goes back');
  assert.equal(s.round, 2);
  assert.equal(offerer(s), second);
  assert.equal(s.history[0].took, took);
});

test('after round five both players guess, then the day is revealed', () => {
  let s = playRounds(pickBoth(newGame(5), 'steward', 'savorer'));
  assert.equal(s.phase, 'guess');
  assert.ok(s.board.every(Boolean));
  assert.equal(s.history.length, 5);
  s = reduce(s, 'a', { type: 'guess', perspective: 'savorer' });
  assert.equal(s.phase, 'guess');
  s = reduce(s, 'b', { type: 'guess', perspective: 'savorer' });
  assert.equal(s.phase, 'reveal');
  const r = score(s);
  assert.equal(r.reads.a, true);
  assert.equal(r.reads.b, false);
  assert.equal(r.value, Math.min(r.a, r.b));
});

test('play again starts a fresh pick with the same partner', () => {
  let s = playRounds(pickBoth(newGame(42, { guestId: 'g' }), 'savorer', 'steward'));
  s = reduce(reduce(s, 'a', { type: 'guess', perspective: 'steward' }), 'b', { type: 'guess', perspective: 'savorer' });
  s = reduce(s, 'b', { type: 'again' });
  assert.equal(s.phase, 'pick');
  assert.equal(s.game, 2);
  assert.equal(s.guestId, 'g');
  assert.deepEqual(s.picks, { a: null, b: null });
});

test('goal predicates', () => {
  const board = ['coffee', 'bread', 'call', 'dinner', 'sunset'];
  assert.ok(goalMet({ side: 'delight', kind: 'start', tag: 'warm' }, board));
  assert.ok(goalMet({ side: 'delight', kind: 'end', tag: 'beauty' }, board));
  assert.ok(goalMet({ side: 'growth', kind: 'count', tag: 'care', n: 3 }, board));
  assert.ok(!goalMet({ side: 'growth', kind: 'early', tag: 'roots' }, board));
  assert.ok(TILE.bread.d.length && TILE.bread.g.length);
});
