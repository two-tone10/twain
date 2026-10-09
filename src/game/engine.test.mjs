import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRound, newGame, reduce, score, goalMet, MOVES } from './engine.mjs';
import { TILE, SLOTS } from './content.mjs';

test('every round has three goals per persona and a guaranteed full day', () => {
  for (let seed = 1; seed <= 2000; seed++) {
    const r = makeRound(seed);
    assert.equal(r.goals.savorer.length, 3, `seed ${seed}`);
    assert.equal(r.goals.steward.length, 3, `seed ${seed}`);
    assert.equal(r.pool.length, 12);
    assert.equal(new Set(r.pool).size, 12);
    for (const g of [...r.goals.savorer, ...r.goals.steward]) assert.ok(g.text.length > 0);
  }
});

test('goals of each persona read only that persona’s tags', () => {
  const r = makeRound(7);
  for (const g of r.goals.savorer) assert.equal(g.side, 'delight');
  for (const g of r.goals.steward) assert.equal(g.side, 'growth');
});

test('score is the lower side, so neither persona can carry the round', () => {
  const s = makeRound(3);
  const fake = { ...s, goals: { savorer: s.goals.savorer, steward: s.goals.steward } };
  const res = score(fake);
  assert.equal(res.value, Math.min(res.delight, res.growth));
  assert.equal(res.win, res.value >= 2);
});

test('turns alternate, moves are spent, bumped tiles return to the pool', () => {
  let s = makeRound(11, true);
  const [a, b] = s.pool;
  assert.equal(reduce(s, 'steward', { type: 'place', tile: a, slot: 0 }), s, 'not your turn');
  s = reduce(s, 'savorer', { type: 'place', tile: a, slot: 0 });
  assert.equal(s.turn, 'steward');
  assert.equal(s.movesLeft, MOVES - 1);
  s = reduce(s, 'steward', { type: 'place', tile: b, slot: 0 });
  assert.equal(s.board[0], b);
  assert.ok(s.pool.includes(a));
});

test('reveal needs both players ready and a full board', () => {
  let s = makeRound(5, true);
  assert.equal(reduce(s, 'savorer', { type: 'ready' }).ready.savorer, false);
  for (let i = 0; i < SLOTS.length; i++) {
    s = reduce(s, s.turn, { type: 'place', tile: s.pool[0], slot: i });
  }
  s = reduce(s, 'savorer', { type: 'ready' });
  assert.equal(s.phase, 'play');
  s = reduce(s, 'steward', { type: 'ready' });
  assert.equal(s.phase, 'reveal');
});

test('placing a tile clears both ready flags', () => {
  let s = makeRound(9, true);
  for (let i = 0; i < SLOTS.length; i++) s = reduce(s, s.turn, { type: 'place', tile: s.pool[0], slot: i });
  s = reduce(s, 'savorer', { type: 'ready' });
  s = reduce(s, s.turn, { type: 'place', tile: s.pool[0], slot: 2 });
  assert.deepEqual(s.ready, { savorer: false, steward: false });
});

test('next round swaps roles', () => {
  let s = newGame(42);
  const host = s.hostRole;
  for (let i = 0; i < SLOTS.length; i++) s = reduce(s, s.turn, { type: 'place', tile: s.pool[0], slot: i });
  s = reduce(s, 'savorer', { type: 'ready', both: true });
  s = reduce(s, 'savorer', { type: 'next' });
  assert.equal(s.round, 2);
  assert.notEqual(s.hostRole, host);
  assert.equal(s.phase, 'play');
});

test('goal predicates', () => {
  const board = ['coffee', 'nap', 'bread', 'call', 'dinner', 'sunset'];
  assert.ok(goalMet({ side: 'delight', kind: 'start', tag: 'warm' }, board));
  assert.ok(goalMet({ side: 'delight', kind: 'end', tag: 'beauty' }, board));
  assert.ok(goalMet({ side: 'growth', kind: 'count', tag: 'care', n: 3 }, board));
  assert.ok(!goalMet({ side: 'growth', kind: 'early', tag: 'roots' }, board));
  assert.ok(TILE.bread.d.length && TILE.bread.g.length);
});

test('hidden target is always reachable: a full day exists in every pool', async () => {
  const { solvable } = await import('./engine.mjs');
  for (let seed = 1; seed <= 25; seed++) assert.ok(solvable(makeRound(seed)), `seed ${seed}`);
});
