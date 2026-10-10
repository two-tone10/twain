import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, reduce, score, goalMet, due, feasible, seenTiles, kindOf, ROUND_KIND, ROUNDS, GOALS_PER_SIDE, PICK_COUNT } from './engine.mjs';
import { TILE, SLOTS } from './content.mjs';

const pickBoth = (s, a, b) => reduce(reduce(s, 'a', { type: 'pick', perspective: a }), 'b', { type: 'pick', perspective: b });

// Plays whatever step is due with the first legal move. `turns` says who switches at the Turn.
function step(s, turns = { a: false, b: false }) {
  const [seat] = due(s);
  switch (s.step) {
    case 'offer': case 'show': return reduce(s, seat, { type: s.step, tiles: s.pool.slice(0, PICK_COUNT[s.step]) });
    case 'take': case 'strike': return reduce(s, seat, { type: s.step, tile: s.offer[0] });
    case 'place': return reduce(s, seat, { type: 'place', tile: s.offer.find((t) => t !== s.struck) });
    case 'turn': return reduce(s, seat, { type: 'turn', switch: turns[seat] });
    case 'blind': return reduce(s, seat, { type: 'blind', tile: s.pool[seat === 'a' ? 0 : 1] });
    case 'cut': case 'fill': return reduce(s, seat, { type: s.step, tile: s.pool[0] });
    default: throw new Error(s.step);
  }
}
function playAll(s, turns) {
  for (let i = 0; i < 40 && s.phase === 'play'; i++) {
    const next = step(s, turns);
    assert.notEqual(next, s, `stuck at round ${s.round} ${s.step}`);
    s = next;
  }
  return s;
}

test('five rounds, each a different task, with the Turn in the middle', () => {
  assert.equal(SLOTS.length, 5);
  assert.equal(ROUNDS, 5);
  assert.deepEqual(ROUND_KIND, ['offer', 'veto', 'turn', 'blind', 'last']);
});

test('picks are secret and locked; each player gets two side goals and one Mask from the other side', () => {
  let s = newGame(1);
  assert.deepEqual(due(s), ['a', 'b']);
  s = reduce(s, 'a', { type: 'pick', perspective: 'savorer' });
  assert.equal(reduce(s, 'a', { type: 'pick', perspective: 'steward' }).picks.a, 'savorer');
  s = reduce(s, 'b', { type: 'pick', perspective: 'savorer' });
  assert.equal(s.phase, 'play');
  for (const seat of ['a', 'b']) {
    const g = s.goals[seat];
    assert.equal(g.length, GOALS_PER_SIDE);
    assert.deepEqual(g.map((x) => x.side), ['delight', 'delight', 'growth']);
    assert.equal(g[2].kind, 'tile');
    assert.equal(g[2].tile, s.masks[seat]);
    assert.equal(TILE[s.masks[seat]].d.length, 0, 'a Mask reads purely as the other side');
  }
});

test('every deal is reachable for any pair of picks', () => {
  for (let seed = 1; seed <= 300; seed++) {
    for (const [a, b] of [['savorer', 'steward'], ['savorer', 'savorer'], ['steward', 'steward']]) {
      const s = pickBoth(newGame(seed), a, b);
      assert.ok(feasible([...s.goals.a, ...s.goals.b], s.board, s.pool), `seed ${seed} ${a}/${b}`);
    }
  }
});

test('only the right seat can act, and each step takes the right number of tiles', () => {
  let s = pickBoth(newGame(11), 'savorer', 'steward');
  const lead = s.first;
  const other = lead === 'a' ? 'b' : 'a';
  assert.equal(kindOf(s), 'offer');
  assert.deepEqual(due(s), [lead]);
  assert.equal(reduce(s, other, { type: 'offer', tiles: s.pool.slice(0, 2) }), s);
  assert.equal(reduce(s, lead, { type: 'offer', tiles: s.pool.slice(0, 3) }), s);
  s = reduce(s, lead, { type: 'offer', tiles: s.pool.slice(0, 2) });
  assert.equal(reduce(s, lead, { type: 'take', tile: s.offer[0] }), s);
  const [took, left] = s.offer;
  s = reduce(s, other, { type: 'take', tile: took });
  assert.equal(s.board[0], took);
  assert.ok(s.pool.includes(left));

  assert.equal(kindOf(s), 'veto');
  assert.equal(reduce(s, lead, { type: 'show', tiles: s.pool.slice(0, 2) }), s, 'veto shows three');
  s = reduce(s, lead, { type: 'show', tiles: s.pool.slice(0, 3) });
  s = reduce(s, other, { type: 'strike', tile: s.offer[0] });
  assert.equal(reduce(s, lead, { type: 'place', tile: s.struck }), s, 'cannot place the struck tile');
  s = reduce(s, lead, { type: 'place', tile: s.offer[1] });
  assert.equal(s.history[1].struck, s.history[1].shown[0]);

  assert.equal(s.step, 'turn');
  assert.deepEqual(due(s), ['a', 'b']);
});

test('switching at the Turn flips your side, deals new goals and a new Mask, and stays hidden from clues', () => {
  for (let seed = 1; seed <= 60; seed++) {
    let s = pickBoth(newGame(seed), 'savorer', 'steward');
    while (s.step !== 'turn') s = step(s);
    s = reduce(s, 'a', { type: 'turn', switch: true });
    assert.equal(s.now.a, 'savorer', 'nothing changes until both decide');
    s = reduce(s, 'b', { type: 'turn', switch: false });
    assert.equal(s.now.a, 'steward');
    assert.equal(s.now.b, 'steward');
    assert.deepEqual(s.goals.a.map((g) => g.side), ['growth', 'growth', 'delight']);
    assert.equal(TILE[s.masks.a].g.length, 0, `seed ${seed}: new Mask is from the side you left`);
    assert.ok(s.pool.includes(s.masks.a));
    assert.ok(feasible(s.goals.a, s.board, s.pool), `seed ${seed}: new goals reachable`);
    assert.equal(s.step, 'offer');
    assert.ok(!JSON.stringify(s.history).includes('switch'));
  }
});

test('blind round places a match, or one of the two picks', () => {
  let s = pickBoth(newGame(5), 'steward', 'steward');
  while (s.step !== 'blind') s = step(s);
  const t = s.pool[2];
  const m = reduce(reduce(s, 'a', { type: 'blind', tile: t }), 'b', { type: 'blind', tile: t });
  assert.equal(m.board[3], t);
  assert.equal(m.history[3].sync, true);
  const x = reduce(reduce(s, 'a', { type: 'blind', tile: s.pool[0] }), 'b', { type: 'blind', tile: s.pool[1] });
  assert.ok([s.pool[0], s.pool[1]].includes(x.board[3]));
  assert.equal(x.history[3].sync, false);
});

test('last call cuts a tile for good before Night is filled, then both read each other', () => {
  let s = playAll(pickBoth(newGame(9), 'savorer', 'steward'), { a: true, b: false });
  assert.equal(s.phase, 'guess');
  assert.ok(s.board.every(Boolean));
  const last = s.history[4];
  assert.ok(last.cut && !s.pool.includes(last.cut) && !s.board.includes(last.cut));

  assert.equal(reduce(s, 'a', { type: 'guess', side: 'steward', switched: false, mask: 'nope' }), s, 'mask must be a seen tile or none');
  const bMask = seenTiles(s).includes(s.masks.b) ? s.masks.b : 'none';
  s = reduce(s, 'a', { type: 'guess', side: s.now.b, switched: false, mask: bMask });
  assert.equal(s.phase, 'guess');
  assert.deepEqual(due(s), ['b']);
  s = reduce(s, 'b', { type: 'guess', side: 'savorer', switched: false, mask: 'none' });
  assert.equal(s.phase, 'reveal');
  const r = score(s);
  assert.deepEqual(r.reads.a, { side: true, switched: true, mask: true, n: 3 });
  assert.equal(r.reads.b.side, false, 'a switched to steward');
  assert.equal(r.reads.b.switched, false);
  const again = reduce(s, 'b', { type: 'again' });
  assert.equal(again.phase, 'pick');
  assert.equal(again.game, 2);
  assert.deepEqual(again.switched, { a: null, b: null });
});

test('goal predicates read the board', () => {
  const board = ['coffee', 'guitar', 'garden', 'dinner', 'sunset'];
  assert.ok(goalMet({ side: 'delight', kind: 'start', tag: 'warm' }, board));
  assert.ok(goalMet({ side: 'delight', kind: 'end', tag: 'beauty' }, board));
  assert.ok(goalMet({ side: 'growth', kind: 'early', tag: 'craft' }, board));
  assert.ok(goalMet({ side: 'growth', kind: 'tile', tile: 'garden' }, board));
  assert.ok(!goalMet({ side: 'growth', kind: 'tile', tile: 'call' }, board));
});
