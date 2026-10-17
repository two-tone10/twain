import test from 'node:test';
import assert from 'node:assert/strict';
import { deal, headline, cutPair, soloLines, tally, duelSummary, skyPoint, spread, activeList, WEEK_MS } from './insight.mjs';
import { WHYS, SOLO_PER_WHY } from './content.mjs';

const m = (t, k, extra = {}) => ({ t, k, ...extra });
const flat = (line) => line.map((s) => (typeof s === 'string' ? s : s.em)).join('');

test('deal gives every why the same share', () => {
  const d = deal(SOLO_PER_WHY);
  assert.equal(d.length, WHYS.length * SOLO_PER_WHY);
  for (const w of WHYS) assert.equal(d.filter((x) => x.k === w.key).length, SOLO_PER_WHY);
  assert.equal(new Set(d.map((x) => x.t)).size, d.length);
});

test('headline reads the basket without ranking any why', () => {
  assert.equal(headline([]), 'You let everything fall.');
  assert.equal(headline([m('a', 'company'), m('b', 'company'), m('c', 'company'), m('d', 'skill')]), 'You kept the moments with people in them.');
  assert.equal(headline([m('a', 'taste'), m('b', 'company'), m('c', 'taste'), m('d', 'company'), m('e', 'skill')]), 'You kept company and taste, two of each.');
  assert.equal(headline([m('a', 'taste'), m('b', 'company'), m('c', 'skill')]), '3 keeps, 3 different pulls.');
  assert.equal(headline([m('a', 'taste'), m('b', 'taste')]), 'You leaned toward taste.');
});

test('final cut pairs the fastest grab with the slowest', () => {
  const kept = [m('A', 'delight', { dwell: 0.5 }), m('B', 'skill', { dwell: 0.1 }), m('C', 'taste', { dwell: 0.9 })];
  assert.deepEqual(cutPair(kept).map((x) => x.t), ['B', 'C']);
  assert.equal(cutPair(kept.slice(0, 1)), null);
});

test('solo lines name the cut, the swap and the hesitation', () => {
  const slow = m('Practice guitar', 'skill', { dwell: 0.8, born: 1000, tapped: 4000 });
  const fast = m('Call your brother', 'company', { dwell: 0.1, born: 2000, tapped: 2300 });
  const rival = m('The tasting menu', 'taste', { born: 1500, left: 6000 });
  const thrown = m('Sleeping in', 'delight', { born: 900, left: 3000, thrown: true });
  const lines = soloLines({ kept: [slow, fast], gone: [rival, thrown], swaps: [{ out: thrown, inn: fast }], pair: [fast, slow], keeper: slow }).map(flat);
  assert.deepEqual(lines, [
    'In the final cut you kept practice guitar over call your brother.',
    'You threw back sleeping in for call your brother.',
    'You hesitated longest over practice guitar, and let the tasting menu fall.',
  ]);
  const timeout = soloLines({ kept: [slow, fast], gone: [], pair: [fast, slow], keeper: null }).map(flat);
  assert.equal(timeout[0], 'In the final cut you couldn’t choose between call your brother and practice guitar.');
  assert.equal(timeout[1], 'You grabbed call your brother almost the moment it appeared.');
});

test('tally counts keeps across rounds', () => {
  assert.deepEqual(tally([{ kept: ['skill', 'company'] }, { kept: ['company'] }]), [['company', 2], ['skill', 1]]);
});

test('duel summary is about fights and overlap, never about which whys won', () => {
  const names = ['Anthony', 'Maya'];
  const none = duelSummary(names, [[m('a', 'skill')], [m('b', 'taste')]], []);
  assert.equal(flat(none.head), 'No fights. You wanted different things.');
  const empty = duelSummary(names, [[], []], []);
  assert.equal(flat(empty.head), 'Every star got away.');
  assert.equal(empty.lines.length, 0);
  const one = duelSummary(names, [[m('a', 'skill'), m('Call your brother', 'company')], [m('b', 'skill')]], [{ m: m('Call your brother', 'company'), winner: 0 }]);
  assert.equal(flat(one.head), 'Anthony won 1 of 1 fights.');
  assert.equal(flat(one.lines[0]), 'Anthony beat Maya to call your brother.');
  assert.equal(flat(one.lines[1]), 'You both kept skill.');
});

test('sky points stay in their why strip and inside the box', () => {
  for (const w of WHYS) {
    const p = skyPoint(m('A record, start to finish', w.key));
    const i = WHYS.indexOf(w);
    assert.ok(p.x > i / 7 - 0.06 && p.x < (i + 1) / 7 + 0.06, `${w.key} x ${p.x}`);
    assert.ok(p.y >= 0.18 && p.y <= 0.79);
  }
  const s = spread([{ x: 0.5, y: 0.5 }, { x: 0.52, y: 0.55 }]);
  assert.ok(Math.abs(s[0].y - s[1].y) >= 0.24 - 1e-9);
});

test('the list keeps a week', () => {
  const now = Date.now();
  assert.deepEqual(activeList([{ at: now - WEEK_MS - 1 }, { at: now - 1000 }], now).length, 1);
});
