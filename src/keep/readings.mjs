// The longer readings: what you said against what you grab, reach · do · glad, one why's history,
// guessing in a duel, and the evening nudge. Pure, like insight.mjs.
import { WHYS, WHY } from './content.mjs';
import { activeList, dayKey, lc } from './insight.mjs';

const em = (t) => ({ em: t });
const name = (k) => WHY[k].name.toLowerCase();
const byIndex = (a, b) => WHY[a].index - WHY[b].index;
const median = (xs) => { const s = xs.slice().sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

// Whys by how often they appear; ties go to the quicker grabs, then to sky order.
function ranked(items) {
  const c = {}, d = {};
  for (const m of items) { c[m.k] = (c[m.k] || 0) + 1; d[m.k] = (d[m.k] || 0) + (m.dwell ?? 0); }
  return Object.keys(c).sort((a, b) => c[b] - c[a] || d[a] / c[a] - d[b] / c[b] || byIndex(a, b));
}

// Grabs from the faster half of everything you've caught in a drop: your gut, roughly.
export function fastGrabs(rounds) {
  const all = rounds.flatMap((r) => r.items || []).filter((m) => typeof m.dwell === 'number');
  if (!all.length) return [];
  const cut = median(all.map((m) => m.dwell));
  return all.filter((m) => m.dwell <= cut);
}

const done = (list) => list.filter((it) => it.done || it.didIt);

/* ---------- said vs grabbed ---------- */

export const SAID_ROUNDS = 5;

export function saidVsGrabbed(said, rounds) {
  if (!said || said.length !== 2) return null;
  const played = rounds.filter((r) => r.items?.length).length;
  if (played < SAID_ROUNDS) return { said, left: SAID_ROUNDS - played };
  const grabbed = ranked(fastGrabs(rounds)).slice(0, 2);
  const agree = said.filter((k) => grabbed.includes(k));
  const other = grabbed.filter((k) => !said.includes(k));
  const head = ['You said ', em(name(said[0])), ' and ', em(name(said[1])), '. '];
  let line;
  if (agree.length === 2) line = [...head, 'Your thumb agreed on both.'];
  else if (agree.length === 1) line = [...head, 'Your thumb agreed on ', em(name(agree[0])), other[0] ? ', and went just as fast for ' : '.', ...(other[0] ? [em(name(other[0])), '.'] : [])];
  else line = [...head, 'Your thumb went for ', em(name(grabbed[0])), ...(grabbed[1] ? [' and ', em(name(grabbed[1]))] : []), ' first.'];
  return { said, grabbed, agree, line, left: 0 };
}

/* ---------- reach · do · glad ---------- */

const uniq = (items, n = 6) => { const seen = new Set(); return items.filter((m) => !seen.has(m.t) && seen.add(m.t)).slice(-n); };

// One moment of why `k` you haven't got on your list or done. Steady within a day.
export function offerFor(k, pool, list, now = Date.now()) {
  const taken = new Set(list.map((it) => it.t));
  const free = (pool[k] || []).filter((t) => !taken.has(t));
  if (!free.length) return null;
  const day = Math.floor(now / 864e5);
  return { t: free[day % free.length], k };
}

export function triad({ rounds = [], list = [], pool = {}, now = Date.now() }) {
  const fast = fastGrabs(rounds);
  const did = done(list);
  const glad = did.filter((it) => it.glad === true);
  const reach = fast.length >= 5 ? ranked(fast)[0] : null;
  const doing = did.length >= 2 ? ranked(did)[0] : null;
  const gladK = glad.length >= 2 ? ranked(glad)[0] : null;

  let line = null, offer = null;
  if (reach && doing && reach !== doing) {
    line = ['You reach for ', em(name(reach)), ' fastest, but it rarely makes it into your days.'];
    offer = offerFor(reach, pool, list, now);
  } else if (doing && gladK && doing !== gladK) {
    line = ['You do ', em(name(doing)), ' most. You’re gladdest after ', em(name(gladK)), '.'];
    offer = offerFor(gladK, pool, list, now);
  } else if (reach && !doing) {
    line = ['You reach for ', em(name(reach)), ' fastest. Try one this week and see if you’re glad.'];
    offer = offerFor(reach, pool, list, now);
  } else if (reach && reach === doing && (!gladK || gladK === reach)) {
    line = gladK ? ['Reach, do, glad: it’s ', em(name(reach)), ' all three times.'] : ['What you reach for is what you do: ', em(name(reach)), '.'];
  }
  return {
    reach: reach && { k: reach, items: uniq(fast) },
    do: doing && { k: doing, items: uniq(did) },
    glad: gladK && { k: gladK, items: uniq(glad) },
    line,
    offer,
  };
}

/* ---------- one why ---------- */

export function whyStats(k, { rounds = [], holds = [], list = [] }) {
  const grabs = rounds.flatMap((r) => r.items || []).filter((m) => m.k === k);
  const firsts = rounds.filter((r) => r.items?.length && r.items.reduce((a, b) => (b.dwell < a.dwell ? b : a)).k === k).length;
  const held = holds.flatMap((h) => h.held || []).filter((m) => m.k === k).length;
  const did = done(list).filter((it) => it.k === k);
  const asked = did.filter((it) => it.glad != null);
  const glad = asked.filter((it) => it.glad).length;

  let line = null;
  if (asked.length >= 2 && glad === asked.length) line = 'When you do these, you’re glad every time. Keep a little more of it on your list?';
  else if (grabs.length >= 3 && !did.length) line = 'You catch these often but haven’t brought one into a day yet.';
  else if (did.length >= 2 && did.length >= grabs.length) line = 'You do these more often than you grab them. They might matter more than your gut says.';
  else if (!grabs.length && !held && !did.length) line = 'You haven’t kept one of these yet. That’s fine. Not every pull has to be yours.';

  return { grabbed: grabs.length, firsts, held, done: did.length, glad, asked: asked.length, mine: uniq(grabs.concat(did), 5), line };
}

/* ---------- duel: read each other ---------- */

// The why a basket holds most of. Ties all count as right.
export function topWhys(basket) {
  if (!basket.length) return [];
  const c = {};
  for (const m of basket) c[m.k] = (c[m.k] || 0) + 1;
  const max = Math.max(...Object.values(c));
  return Object.keys(c).filter((k) => c[k] === max).sort(byIndex);
}

export function guessLine(guesser, other, guess, basket) {
  const top = topWhys(basket);
  const n = basket.filter((m) => m.k === top[0]).length;
  if (top.includes(guess)) return { right: true, line: [`${guesser} knew. `, `${other} kept ${n} `, em(name(guess)), n === 1 ? ' moment.' : ' moments.'] };
  return { right: false, line: [`${guesser} guessed ${name(guess)}. `, `${other} went for `, em(top.map(name).join(' and ')), '. Worth asking about.'] };
}

/* ---------- tonight's star ---------- */

export const EVENING_HOUR = 18;

// The next 6pm that's at least a minute away.
export function nextEvening(now = Date.now(), hour = EVENING_HOUR) {
  const d = new Date(now);
  d.setHours(hour, 0, 0, 0);
  if (d.getTime() < now + 60e3) d.setDate(d.getDate() + 1);
  return d.getTime();
}

// Tonight's plan if there is one, else the newest open moment that isn't "someday". Nothing means no nudge.
export function eveningPick(list, now = Date.now()) {
  const open = activeList(list, now).filter((it) => !it.done && it.didIt == null && it.when !== 'someday');
  if (!open.length) return null;
  const tonight = open.filter((it) => it.when === 'tonight' && dayKey(it.at) === dayKey(now));
  const it = (tonight.length ? tonight : open).reduce((a, b) => (b.at > a.at ? b : a));
  return { ...it, body: `Tonight’s star: ${lc(it.t)}.` };
}

export { WHYS, dayKey };
