import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_NAMES, dailyDeal, dayNumber, decodeChallenge, emojiLine, encodeChallenge, overlap, shareText, signFor, skyLine, skyName, speedOf } from './fun.mjs';

const m = (t, k) => ({ t, k });

test('skies get names', () => {
  assert.equal(skyName([m('a', 'company'), m('b', 'company'), m('c', 'novelty')]), 'The Restless Hearth');
  assert.equal(skyName([m('a', 'skill')]), 'The Steady Forge');
  assert.equal(skyName([]), null);
  assert.equal(skyLine([m('a', 'company'), m('b', 'novelty'), m('c', 'company')]), 'Mostly company. A little novelty.');
  assert.equal(ALL_NAMES, 49);
});

test('your sign waits for five rounds, then reads your fastest grabs', () => {
  const r = { items: [{ k: 'novelty', dwell: 0.1 }, { k: 'novelty', dwell: 0.2 }, { k: 'skill', dwell: 0.9 }, { k: 'taste', dwell: 0.8 }] };
  assert.equal(signFor([r, r]).left, 3);
  const s = signFor([r, r, r, r, r]);
  assert.equal(s.name, 'The Comet');
});

test('the daily deals the same stars to everyone, and a new set each day', () => {
  assert.deepEqual(dailyDeal(47), dailyDeal(47));
  assert.notDeepEqual(dailyDeal(47).map((x) => x.t), dailyDeal(48).map((x) => x.t));
  assert.equal(dailyDeal(47).length, 21);
  assert.equal(dayNumber(new Date(2026, 9, 1, 15).getTime()), 1);
  assert.equal(dayNumber(new Date(2026, 9, 12, 1).getTime()), 12);
});

test('challenges round-trip through a link', () => {
  const deck = dailyDeal(12);
  const kept = [deck[3], deck[7], deck[15]];
  const q = Object.fromEntries(new URLSearchParams(encodeChallenge(12, 'Maya J', kept, 0.4)));
  const c = decodeChallenge(q);
  assert.equal(c.name, 'Maya J');
  assert.equal(c.speed, 0.4);
  assert.equal(q.w.length, 3);
  assert.deepEqual(c.kept.map((x) => x.t), kept.map((x) => x.t));
  assert.equal(overlap(kept, [deck[3], deck[1]]), 1);
  assert.equal(decodeChallenge({ d: 'x' }), null);
  assert.equal(emojiLine([m('a', 'company'), m('b', 'novelty')]), '🧡🩵');
  assert.equal(speedOf([{ born: 0, tapped: 400 }, { born: 0, tapped: 600 }]), 0.5);
  assert.match(shareText({ day: 12, kept, speed: 0.41, who: 'Maya' }), /^Keep #12 ✦ The .+\n.+0\.41s\nCatch the same stars: https:\/\/lipurposefe\.com\/keep\/play\?d=12&n=Maya&k=3\.7\.15&w=\d{3}&s=0\.41$/);
});
