import test from 'node:test';
import assert from 'node:assert/strict';
import { DRIFT, fadeStarts, driftReading, slowSchedule, slowSnapshot, keepSlow, slowOutcome, fmtLeft, dueCheckIns, skyReadings, reminderTimes } from './modes.mjs';

const flat = (line) => line.map((s) => (typeof s === 'string' ? s : s.em)).join('');
const H = 3600e3;

test('drift fades start in order and speed up', () => {
  const f = fadeStarts();
  assert.equal(f.length, DRIFT.count);
  assert.equal(f[0], DRIFT.firstFade);
  for (let i = 2; i < f.length; i++) assert.ok(f[i] - f[i - 1] < f[i - 1] - f[i - 2] + 1e-9);
  assert.ok(f[f.length - 1] < DRIFT.roundMs);
});

test('drift reading names what you held, went back to, and let go', () => {
  const r = driftReading([
    { t: 'Call your brother', k: 'company', holdMs: 9000, touches: 2, goneAt: null },
    { t: 'Practice guitar', k: 'skill', holdMs: 4000, touches: 5, goneAt: null },
    { t: 'Sleeping in', k: 'delight', holdMs: 0, touches: 0, goneAt: 5000 },
    { t: 'The tasting menu', k: 'taste', holdMs: 300, touches: 1, goneAt: 3000 },
  ]);
  assert.equal(r.held.length, 2);
  assert.deepEqual(r.lines.map(flat), [
    'You held on to call your brother the longest.',
    'Your thumb kept going back to practice guitar.',
    'You let sleeping in go first, without a touch.',
  ]);
  assert.equal(driftReading([{ t: 'A', k: 'skill', holdMs: 0, touches: 0, goneAt: 10 }]).head, 'Everything drifted away.');
});

test('the slow drop spreads a day of stars and tracks them by the clock', () => {
  const deck = [{ t: 'A', k: 'skill' }, { t: 'B', k: 'taste' }, { t: 'C', k: 'company' }, { t: 'D', k: 'delight' }];
  const s = slowSchedule(0, deck, { spanMs: 4 * H, fallMs: 2 * H, rng: () => 0.5 });
  assert.deepEqual(s.items.map((m) => m.spawnAt), [0, H, 2 * H, 3 * H]);
  let snap = slowSnapshot(s, 1.5 * H);
  assert.deepEqual(snap.live.map((m) => m.t), ['A', 'B']);
  assert.equal(snap.live[0].f, 0.75);
  assert.equal(snap.next.t, 'C');
  const s2 = keepSlow(s, 'A', 1.5 * H);
  assert.equal(s2.kept[0].dwell, 0.75);
  assert.equal(keepSlow(s2, 'A', 1.6 * H), s2, 'keeping twice is a no-op');
  snap = slowSnapshot(s2, 3.5 * H);
  assert.deepEqual(snap.missed.map((m) => m.t), ['B']);
  assert.equal(slowSnapshot(s2, 6 * H).done, true);
  const out = slowOutcome(s2, 6 * H);
  assert.deepEqual(out.gone.map((m) => m.t), ['B', 'C', 'D']);
  assert.equal(slowSnapshot({ ...s, kept: [1, 2, 3, 4, 5].map((n) => ({ t: `x${n}` })) }, 0).full, true);
});

test('time left reads like a person would say it', () => {
  assert.equal(fmtLeft(0), 'now');
  assert.equal(fmtLeft(20 * 1000), '1m');
  assert.equal(fmtLeft(42 * 60000), '42m');
  assert.equal(fmtLeft(80 * 60000), '1h 20m');
  assert.equal(fmtLeft(2 * H), '2h');
});

test('check-ins ask once, about earlier days only', () => {
  const now = new Date(2026, 9, 11, 12).getTime();
  const yday = new Date(2026, 9, 10, 9).getTime();
  const list = [
    { id: 1, at: yday, done: false },
    { id: 2, at: yday, done: true },
    { id: 3, at: yday, done: false, didIt: false },
    { id: 4, at: now - 1000, done: false },
  ];
  assert.deepEqual(dueCheckIns(list, now).map((x) => x.id), [1]);
});

test('sky readings find the gap between grab, hold and do', () => {
  const items = (k, dwell, t = k) => ({ t, k, dwell });
  const rounds = [
    { items: [items('novelty', 0.1, 'A city you’ve never seen'), items('novelty', 0.2, 'Getting a little lost'), items('company', 0.6, 'Call your brother')] },
    { items: [items('novelty', 0.15, 'A city you’ve never seen'), items('company', 0.7, 'Game night'), items('skill', 0.5, 'Practice guitar')] },
  ];
  const holds = [{ held: [{ k: 'company' }, { k: 'company' }, { k: 'skill' }] }];
  const list = [{ t: 'Call your brother', k: 'company', done: true }, { t: 'Game night', k: 'company', didIt: true }];
  const r = skyReadings({ rounds, holds, list });
  assert.equal(r.grab.why, 'novelty');
  assert.equal(flat(r.grab.line), 'You grab novelty fastest. Quickest of all: a city you’ve never seen.');
  assert.equal(r.hold.why, 'company');
  assert.equal(r.live.why, 'company');
  assert.equal(flat(r.gap), 'You reach for novelty in seconds. The moments you actually do are company.');
  assert.equal(flat(r.nudge), 'You keep catching a city you’ve never seen. It hasn’t happened yet. Maybe make room for it this week?');
  const empty = skyReadings({});
  assert.equal(empty.grab, null);
  assert.equal(empty.gap, null);
});

test('reminders come before a star falls past, spaced out, and skip what you kept', () => {
  const deck = 'ABCDEFGH'.split('').map((t) => ({ t, k: 'skill' }));
  const s = slowSchedule(0, deck, { spanMs: 8 * H, fallMs: 3 * H, rng: () => 0.5 });
  const r = reminderTimes(s, 0);
  assert.deepEqual(r.map((x) => x.t), ['A', 'C', 'E', 'G']);
  assert.equal(r[0].at, 2.5 * H);
  assert.deepEqual(reminderTimes(keepSlow(s, 'A', H), 0).map((x) => x.t), ['B', 'D', 'F', 'H']);
  assert.deepEqual(reminderTimes(s, 7 * H).map((x) => x.t), ['F', 'H']);
});
