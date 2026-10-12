// Kept: the codex of what you've done and a plot of how your reaching has changed over time. Pure.
import { WHYS, WHY } from './content.mjs';

const name = (k) => WHY[k].name.toLowerCase();
const byIndex = (a, b) => WHY[a].index - WHY[b].index;
export const didIt = (it) => it.done || it.didIt;
const doneAt = (it) => it.doneAt ?? it.at;
const monthKey = (t) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
export const monthLabel = (key, now = Date.now()) => {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString(undefined, new Date(now).getFullYear() === y ? { month: 'long' } : { month: 'long', year: 'numeric' });
};

function topWhy(keys) {
  if (!keys.length) return null;
  const c = {};
  for (const k of keys) c[k] = (c[k] || 0) + 1;
  return Object.keys(c).sort((a, b) => c[b] - c[a] || byIndex(a, b))[0];
}

// Running totals. They only ever go up.
export function totals({ rounds = [], list = [] }) {
  const did = list.filter(didIt);
  const people = new Set(did.flatMap((it) => it.with ?? []));
  const firsts = [...rounds.map((r) => r.at), ...list.map((it) => it.at)].filter(Boolean);
  return {
    caught: rounds.reduce((n, r) => n + (r.kept?.length ?? 0), 0),
    done: did.length,
    glad: did.filter((it) => it.glad === true).length,
    people: people.size,
    since: firsts.length ? Math.min(...firsts) : null,
  };
}

// Every moment you did, placed in time (0 = start of the range, 1 = now) and by why.
export function timeline(list, now = Date.now(), weeks = null) {
  const did = list.filter(didIt);
  if (!did.length) return { points: [], from: now, to: now };
  const from = weeks ? now - weeks * 7 * 864e5 : Math.min(...did.map(doneAt));
  const span = Math.max(now - from, 864e5);
  return {
    from,
    to: now,
    points: did.filter((it) => doneAt(it) >= from).map((it) => ({ t: it.t, k: it.k, glad: it.glad === true, x: (doneAt(it) - from) / span })),
  };
}

// Your why mix month by month, from what you kept in drops. Needs two months to say anything.
export function monthlyMix(rounds) {
  const months = {};
  for (const r of rounds) {
    if (!r.kept?.length) continue;
    const key = monthKey(r.at);
    months[key] ||= Object.fromEntries(WHYS.map((w) => [w.key, 0]));
    for (const k of r.kept) months[key][k]++;
  }
  return Object.keys(months).sort().map((key) => ({ key, mix: months[key] }));
}

// First rounds against your latest ones, in one plain sentence.
export const CHANGE_ROUNDS = 5;
export function change(rounds) {
  const played = rounds.filter((r) => r.kept?.length);
  if (played.length < CHANGE_ROUNDS * 2) return null;
  const then = played.slice(0, CHANGE_ROUNDS).flatMap((r) => r.kept);
  const now = played.slice(-CHANGE_ROUNDS).flatMap((r) => r.kept);
  const a = topWhy(then), b = topWhy(now);
  const line = a === b
    ? ['From your first rounds to now, it’s been ', { em: name(a) }, '.']
    : ['When you started, you reached for ', { em: name(a) }, '. Lately it’s ', { em: name(b) }, '.'];
  return { then: then.slice(0, 5), now: now.slice(-5), line };
}

// The distillation: glad every time, what your thumb keeps catching, who's in the good moments.
export function holdsUp({ rounds = [], list = [] }) {
  const byT = {};
  for (const it of list.filter(didIt)) {
    const e = (byT[it.t] ||= { t: it.t, k: it.k, asked: 0, glad: 0 });
    if (it.glad != null) { e.asked++; if (it.glad) e.glad++; }
  }
  // Prefer moments you were glad about more than once; until there are some, single gladness counts.
  const allGlad = Object.values(byT).filter((e) => e.asked >= 1 && e.glad === e.asked).sort((a, b) => b.glad - a.glad || byIndex(a.k, b.k));
  const repeat = allGlad.filter((e) => e.asked >= 2);
  const always = (repeat.length ? repeat : allGlad).slice(0, 4);
  const everyTime = repeat.length > 0;

  const caught = {};
  for (const r of rounds) for (const m of r.items ?? []) (caught[m.t] ||= { t: m.t, k: m.k, n: 0 }).n++;
  const catching = Object.values(caught).filter((c) => c.n >= 3).sort((a, b) => b.n - a.n).slice(0, 4);

  const people = {};
  for (const it of list.filter((x) => didIt(x) && x.glad !== false)) for (const n of it.with ?? []) people[n] = (people[n] || 0) + 1;
  const company = Object.entries(people).sort((a, b) => b[1] - a[1]).slice(0, 8);

  return { always, everyTime, catching, company };
}

// Everything you did, newest first, grouped by month.
export function codex(list) {
  const did = list.filter(didIt).sort((a, b) => doneAt(b) - doneAt(a));
  const groups = [];
  for (const it of did) {
    const key = monthKey(doneAt(it));
    if (groups[groups.length - 1]?.key !== key) groups.push({ key, items: [] });
    groups[groups.length - 1].items.push(it);
  }
  return groups;
}
