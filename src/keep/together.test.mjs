import test from 'node:test';
import assert from 'node:assert/strict';
import { differLine, matchCard, matchDeal, pairs, sync, toItems, weekAwards, whyDigits } from './together.mjs';

const text = (seg) => seg.map((s) => (typeof s === 'string' ? s : s.em)).join('');
const it = (t, k) => ({ t, k });

test('items round-trip through whys digits, and match deals are stable', () => {
  const items = [it('Game night', 'company'), it('A slow coffee', 'delight')];
  assert.equal(whyDigits(items), '30');
  assert.deepEqual(toItems(['Game night', 'A slow coffee'], '30'), items);
  assert.deepEqual(matchDeal(42), matchDeal(42));
  assert.equal(matchDeal(42).length, 21);
});

test('sync and the differ line', () => {
  const a = [it('Game night', 'company'), it('Practice guitar', 'skill')];
  const b = [it('Game night', 'company'), it('The perfect espresso', 'taste')];
  assert.equal(sync(a, b), 50);
  assert.equal(sync(a, a), 100);
  const lines = differLine(a, b, 'Maya').map(text);
  assert.deepEqual(lines, ['You both went for company.', 'Only Maya kept the perfect espresso. Ask about it.']);
});

test('a match card from the server view, and pairs over time', () => {
  const v = { mine: { kept: ['Game night', 'Practice guitar'], whys: '34', speed: 0.5, correct: 2 }, other: { name: 'Maya', kept: ['Game night', 'The perfect espresso'], whys: '35', speed: 0.4, correct: 3 } };
  const c = matchCard(v);
  assert.deepEqual([c.same, c.sync, c.iRead, c.theyRead, c.quicker], [1, 50, 2, 3, 'them']);
  const waiting = matchCard({ mine: v.mine, other: null });
  assert.equal(waiting.both, false);
  const p = pairs([v, v, { mine: v.mine, other: { name: 'Sam', speed: 0.3 } }]);
  assert.equal(p.length, 1);
  assert.deepEqual([p[0].who, p[0].matches, p[0].sync, p[0].iRead, p[0].iReadOf, p[0].meet], ['Maya', 2, 50, 4, 6, 'company']);
});

test('people are grouped by who they are, not their name, with the latest match to play again from', () => {
  const mine = { kept: ['Game night'], whys: '3' };
  const sam = (id, pid) => ({ id, mine, other: { name: 'Sam', pid, kept: ['Game night'], whys: '3' } });
  const p = pairs([sam('NEW1', 'p1'), sam('OLD1', 'p1'), sam('X', 'p2')]);
  assert.equal(p.length, 2);
  assert.deepEqual(p.map((x) => [x.pid, x.who, x.last, x.matches]), [['p1', 'Sam', 'NEW1', 2], ['p2', 'Sam', 'X', 1]]);
});

test('weekly awards for a circle', () => {
  const members = [{ mid: 'a', name: 'Mom' }, { mid: 'b', name: 'Lila' }, { mid: 'c', name: 'Grandpa' }];
  const plays = [
    { mid: 'a', day: 1, kept: ['Game night', 'A slow coffee'], whys: '30' },
    { mid: 'b', day: 1, kept: ['Game night', 'Sleeping in'], whys: '30' },
    { mid: 'c', day: 1, kept: ['The symphony', 'A rooftop at night'], whys: '51' },
  ];
  const rows = Object.fromEntries(weekAwards(members, plays, [{ by: 'a', of: 'b', day: 1, correct: 2 }, { by: 'b', of: 'a', day: 1, correct: 1 }]));
  assert.equal(rows['Closest pair'], 'Mom & Lila · 75%');
  assert.equal(rows['Best reader'], 'Mom · 2 of 3');
  assert.equal(rows['Most surprising'], 'Grandpa');
  assert.ok(rows['Circle why']);
});

test('star names and circle names come only from the lists', async () => {
  const { STAR_NAMES, isStarName, anotherStar, anotherCircle, isCircleName } = await import('./names.mjs');
  assert.equal(new Set(STAR_NAMES).size, STAR_NAMES.length);
  assert.ok(isStarName('Vega') && !isStarName('Maya') && !isStarName(''));
  const n = anotherStar('Vega');
  assert.ok(isStarName(n) && n !== 'Vega');
  const c = anotherCircle('The Quiet Harbor');
  assert.ok(isCircleName(c) && c !== 'The Quiet Harbor' && !isCircleName('Smith family'));
});
