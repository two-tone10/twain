import test from 'node:test';
import assert from 'node:assert/strict';
import { askAtFor, checkInAsk, followUp, planMeta, rememberPeople, widgetPick, withLabel } from './plans.mjs';
import { activeList } from './insight.mjs';
import { dueCheckIns } from './modes.mjs';

const d = (...a) => new Date(...a).getTime();
const text = (seg) => seg.map((s) => (typeof s === 'string' ? s : s.em)).join('');

test('check-in times follow the plan', () => {
  const wed = d(2026, 9, 14, 12); // a Wednesday
  assert.equal(new Date(askAtFor('tonight', wed)).getDate(), 15);
  assert.equal(new Date(askAtFor('tonight', wed)).getHours(), 9);
  const wk = new Date(askAtFor('weekend', wed));
  assert.deepEqual([wk.getDay(), wk.getDate(), wk.getHours()], [0, 18, 18]);
  assert.equal(new Date(askAtFor('week', wed)).getDate(), 18); // four days off: this Sunday
  assert.equal(new Date(askAtFor('week', d(2026, 9, 16, 12))).getDate(), 25); // Friday: next Sunday
  assert.equal(new Date(askAtFor('weekend', d(2026, 9, 18, 19))).getDate(), 19); // Sunday night: next morning
  assert.equal(askAtFor('someday', wed), null);
});

test('labels read naturally', () => {
  assert.equal(withLabel(['Jen']), 'Jen');
  assert.equal(withLabel(['Jen', 'Mark', 'Sam']), 'Jen, Mark & Sam');
  const now = d(2026, 9, 14, 12);
  assert.equal(planMeta({ when: 'weekend', with: ['Jen', 'Mark'], at: now }, now), 'This weekend · with Jen & Mark');
  assert.equal(planMeta({ at: now }, now), '');
  assert.match(followUp('weekend'), /Sunday evening/);
  assert.equal(text(checkInAsk({ t: 'Dinner with old friends', when: 'weekend', with: ['Jen'], at: now }, now)), 'You planned dinner with old friends, with Jen, this weekend. Did it happen?');
  assert.match(text(checkInAsk({ t: 'Game night', at: now - 864e5 }, now)), /^Yesterday you picked game night/);
  assert.deepEqual(rememberPeople(['Mom', 'Jen', 'Dad'], ['Jen', 'Sam']), ['Jen', 'Sam', 'Mom', 'Dad']);
});

test('plans are asked about on time, someday never', () => {
  const now = d(2026, 9, 14, 12);
  const list = [
    { id: 1, t: 'a', at: now, when: 'weekend', askAt: askAtFor('weekend', now) },
    { id: 2, t: 'b', at: now, when: 'someday', askAt: null },
    { id: 3, t: 'c', at: now - 864e5 },
  ];
  assert.deepEqual(dueCheckIns(list, now).map((x) => x.id), [3]);
  assert.deepEqual(dueCheckIns(list, d(2026, 9, 18, 19)).map((x) => x.id), [1, 3]);
  assert.deepEqual(activeList(list, now + 20 * 864e5).map((x) => x.id), [2]);
});

test('the widget shows tonight first, then the next plan, then the newest moment', () => {
  const now = d(2026, 9, 14, 12);
  const base = [
    { t: 'Old', k: 'skill', at: now - 3600e3 },
    { t: 'Weekend dinner', k: 'company', at: now - 7200e3, when: 'weekend', with: ['Jen'], askAt: askAtFor('weekend', now) },
    { t: 'Someday trip', k: 'novelty', at: now, when: 'someday', askAt: null },
  ];
  assert.deepEqual(widgetPick(base, now), { t: 'Weekend dinner', k: 'company', when: 'THIS WEEKEND', sub: 'with Jen' });
  const withTonight = [...base, { t: 'Call your brother', k: 'company', at: now, when: 'tonight', with: [], askAt: askAtFor('tonight', now) }];
  assert.equal(widgetPick(withTonight, now).t, 'Call your brother');
  assert.equal(widgetPick([base[0]], now).when, 'ON YOUR LIST');
  assert.equal(widgetPick([], now), null);
});
