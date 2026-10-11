import test from 'node:test';
import assert from 'node:assert/strict';
import { deal } from './insight.mjs';
import { poolFor, WHYS } from './content.mjs';
import { LIBRARY } from './library.mjs';
import { eveningPick, guessLine, nextEvening, offerFor, saidVsGrabbed, topWhys, triad, whyStats } from './readings.mjs';

const round = (pairs) => ({ items: pairs.map(([k, dwell], i) => ({ t: `${k}${i}${dwell}`, k, dwell })) });
const text = (seg) => seg.map((s) => (typeof s === 'string' ? s : s.em)).join('');

test('every deck has every why, and deals stay even', () => {
  for (const d of ['everyday', 'campus', 'city', 'kids', 'later']) {
    const p = poolFor(d, 4);
    for (const w of WHYS) assert.ok(p[w.key].length >= 4, `${d} ${w.key}`);
    const hand = deal(4, Math.random, d);
    assert.equal(hand.length, 28);
    for (const w of WHYS) assert.equal(hand.filter((m) => m.k === w.key).length, 4);
  }
  const campus = new Set(LIBRARY.filter((m) => m.d === 'campus').map((m) => m.t));
  assert.ok(deal(3, Math.random, 'campus').every((m) => campus.has(m.t)));
});

test('said vs grabbed waits for five rounds, then compares', () => {
  const r = round([['company', 0.1], ['novelty', 0.15], ['skill', 0.9], ['taste', 0.8]]);
  assert.equal(saidVsGrabbed(['skill', 'company'], [r, r]).left, 3);
  const out = saidVsGrabbed(['skill', 'company'], [r, r, r, r, r]);
  assert.deepEqual(out.grabbed, ['company', 'novelty']);
  assert.deepEqual(out.agree, ['company']);
  assert.match(text(out.line), /agreed on company, and went just as fast for novelty/);
  assert.match(text(saidVsGrabbed(['skill', 'taste'], [r, r, r, r, r]).line), /went for company and novelty first/);
});

test('triad names the gap and offers a moment that would close it', () => {
  const rounds = [round([['novelty', 0.1], ['novelty', 0.12], ['delight', 0.2], ['direction', 0.9]]), round([['novelty', 0.1], ['company', 0.15], ['skill', 0.8], ['taste', 0.7]])];
  const list = [
    { t: 'Write the first page', k: 'direction', done: true, at: 1 },
    { t: 'Mentor someone', k: 'direction', didIt: true, glad: false, at: 2 },
    { t: 'Volunteer Saturday', k: 'direction', done: true, at: 5 },
    { t: 'Practice guitar', k: 'skill', didIt: true, glad: true, at: 3 },
    { t: 'Bake the bread again', k: 'skill', done: true, glad: true, at: 4 },
  ];
  const r = triad({ rounds, list, pool: poolFor('everyday') });
  assert.equal(r.reach.k, 'novelty');
  assert.equal(r.do.k, 'direction');
  assert.equal(r.glad.k, 'skill');
  assert.match(text(r.line), /reach for novelty fastest/);
  assert.equal(r.offer.k, 'novelty');
  assert.equal(triad({ rounds: [], list: [] }).line, null);
});

test('offer skips what is already on the list', () => {
  const pool = { skill: ['A', 'B'] };
  assert.equal(offerFor('skill', pool, [{ t: 'A' }], 0).t, 'B');
  assert.equal(offerFor('skill', pool, [{ t: 'A' }, { t: 'B' }]), null);
});

test('one why: counts and a line', () => {
  const s = whyStats('company', {
    rounds: [round([['company', 0.1], ['skill', 0.5]]), round([['skill', 0.1], ['company', 0.4]])],
    holds: [{ held: [{ k: 'company' }] }],
    list: [{ t: 'x', k: 'company', didIt: true, glad: true }, { t: 'y', k: 'company', done: true, glad: true }],
  });
  assert.deepEqual([s.grabbed, s.firsts, s.held, s.done, s.glad, s.asked], [2, 1, 1, 2, 2, 2]);
  assert.match(s.line, /glad every time/);
});

test('duel guesses count ties as right', () => {
  const b = [{ k: 'taste' }, { k: 'taste' }, { k: 'skill' }, { k: 'skill' }, { k: 'company' }];
  assert.deepEqual(topWhys(b), ['skill', 'taste']);
  assert.equal(guessLine('Ana', 'Sam', 'taste', b).right, true);
  assert.equal(guessLine('Ana', 'Sam', 'company', b).right, false);
  assert.deepEqual(topWhys([]), []);
});

test('evening nudge: next 6pm and the newest open moment', () => {
  const noon = new Date(2026, 9, 11, 12).getTime();
  assert.equal(new Date(nextEvening(noon)).getHours(), 18);
  assert.equal(new Date(nextEvening(noon)).getDate(), 11);
  assert.equal(new Date(nextEvening(new Date(2026, 9, 11, 19).getTime())).getDate(), 12);
  const list = [{ t: 'Call your brother', k: 'company', at: noon - 1000 }, { t: 'Old', k: 'skill', at: noon - 2000 }, { t: 'Done', k: 'skill', at: noon, done: true }];
  assert.equal(eveningPick(list, noon).body, 'Tonight’s star: call your brother.');
  assert.equal(eveningPick([], noon), null);
});
