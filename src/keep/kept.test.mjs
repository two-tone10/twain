import test from 'node:test';
import assert from 'node:assert/strict';
import { change, codex, holdsUp, monthlyMix, timeline, totals } from './kept.mjs';

const d = (m, day) => new Date(2026, m, day, 12).getTime();
const round = (at, kept) => ({ at, kept, items: kept.map((k, i) => ({ t: `${k}-${i}`, k, dwell: 0.3 })) });
const text = (seg) => seg.map((s) => (typeof s === 'string' ? s : s.em)).join('');

const list = [
  { t: 'Dinner with old friends', k: 'company', at: d(8, 1), doneAt: d(8, 2), didIt: true, glad: true, with: ['Jen', 'Mark'] },
  { t: 'Dinner with old friends', k: 'company', at: d(9, 1), doneAt: d(9, 3), done: true, glad: true, with: ['Jen'] },
  { t: 'Practice guitar', k: 'skill', at: d(9, 5), doneAt: d(9, 6), done: true },
  { t: 'Mentor someone', k: 'direction', at: d(9, 6), doneAt: d(9, 7), didIt: true, glad: false, with: ['Sam'] },
  { t: 'Not done', k: 'taste', at: d(9, 7), didIt: false },
];

test('totals only count what happened', () => {
  const t = totals({ rounds: [round(d(7, 20), ['novelty', 'skill'])], list });
  assert.deepEqual([t.caught, t.done, t.glad, t.people], [2, 4, 2, 3]);
  assert.equal(t.since, d(7, 20));
});

test('timeline places done moments in time', () => {
  const tl = timeline(list, d(9, 10));
  assert.equal(tl.points.length, 4);
  assert.equal(tl.points[0].x, 0);
  assert.ok(tl.points.every((p) => p.x >= 0 && p.x <= 1));
  assert.equal(timeline(list, d(9, 10), 1).points.length, 3);
  assert.deepEqual(timeline([], 5).points, []);
});

test('monthly mix and change over time', () => {
  const rounds = [
    ...Array.from({ length: 5 }, (_, i) => round(d(7, 1 + i), ['novelty', 'novelty', 'skill'])),
    ...Array.from({ length: 5 }, (_, i) => round(d(9, 1 + i), ['company', 'company', 'skill'])),
  ];
  const mix = monthlyMix(rounds);
  assert.deepEqual(mix.map((m) => m.key), ['2026-08', '2026-10']);
  assert.equal(mix[0].mix.novelty, 10);
  assert.equal(text(change(rounds).line), 'When you started, you reached for novelty. Lately it’s company.');
  assert.equal(change(rounds.slice(0, 9)), null);
});

test('holds up, and the codex by month', () => {
  const rounds = [1, 2, 3].map((i) => ({ at: i, kept: ['novelty'], items: [{ t: 'A city', k: 'novelty' }] }));
  const h = holdsUp({ rounds, list });
  assert.deepEqual(h.always.map((x) => [x.t, x.glad]), [['Dinner with old friends', 2]]);
  assert.deepEqual(h.catching.map((x) => [x.t, x.n]), [['A city', 3]]);
  assert.deepEqual(h.company, [['Jen', 2], ['Mark', 1]]);
  const c = codex(list);
  assert.deepEqual(c.map((g) => [g.key, g.items.length]), [['2026-10', 3], ['2026-09', 1]]);
  assert.equal(c[0].items[0].t, 'Mentor someone');
});
