// Pure rules and readings for Keep. No React, no storage, so it runs under `node --test`.
// Lines come back as segments: plain strings, or { em } for the emphasized moment names.
import { WHYS, WHY, BASKET, poolFor } from './content.mjs';

export function shuffle(a, rng = Math.random) {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}

// Same number from every why, so no round leans one way before you touch it.
// `own` mixes in your own stars; the daily drop and matches leave it off so every phone deals the same.
export function deal(perWhy, rng = Math.random, deck = 'everyday', own = false) {
  const pool = poolFor(deck, perWhy, own);
  return shuffle(WHYS.flatMap((w) => shuffle(pool[w.key], rng).slice(0, perWhy).map((t) => ({ t, k: w.key }))), rng);
}

export const lc = (t) => t[0].toLowerCase() + t.slice(1);
const em = (t) => ({ em: lc(t) });
const whyName = (k) => WHY[k].name.toLowerCase();

function counts(items) {
  const c = {};
  for (const m of items) c[m.k] = (c[m.k] || 0) + 1;
  return Object.entries(c).sort((a, b) => b[1] - a[1] || WHY[a[0]].index - WHY[b[0]].index);
}

export function headline(kept) {
  if (!kept.length) return 'You let everything fall.';
  const top = counts(kept);
  if (top[0][1] >= 3) return WHY[top[0][0]].line;
  if (top.length >= 2 && top[0][1] === 2 && top[1][1] === 2) return `You kept ${whyName(top[0][0])} and ${whyName(top[1][0])}, two of each.`;
  if (top.length === kept.length && kept.length > 2) return `${kept.length} keeps, ${kept.length} different whys.`;
  return `You leaned toward ${whyName(top[0][0])}.`;
}

// Instinct against deliberation: the fastest grab and the slowest.
export function cutPair(kept) {
  if (kept.length < 2) return null;
  const by = kept.slice().sort((a, b) => a.dwell - b.dwell);
  return [by[0], by[by.length - 1]];
}

export function soloLines({ kept, gone, swaps = [], pair = null, keeper = null }) {
  const lines = [];
  if (pair) {
    lines.push(keeper
      ? ['In the final cut you kept ', em(keeper.t), ' over ', em(pair.find((m) => m !== keeper).t), '.']
      : ['In the final cut you couldn’t choose between ', em(pair[0].t), ' and ', em(pair[1].t), '.']);
  }
  if (swaps.length) { const s = swaps[swaps.length - 1]; lines.push(['You threw back ', em(s.out.t), ' for ', em(s.inn.t), '.']); }
  if (kept.length > 1) {
    const slow = kept.reduce((a, b) => (b.dwell > a.dwell ? b : a));
    const rival = gone
      .filter((g) => !g.thrown && g.born < slow.tapped && (g.left ?? Infinity) > slow.born)
      .sort((a, b) => Math.abs(a.born - slow.born) - Math.abs(b.born - slow.born))[0];
    if (rival) lines.push(['You hesitated longest over ', em(slow.t), ', and let ', em(rival.t), ' fall.']);
  }
  if (kept.length && lines.length < 3) {
    const fast = kept.reduce((a, b) => (b.dwell < a.dwell ? b : a));
    if (fast.dwell < 0.25) lines.push(['You grabbed ', em(fast.t), ' almost the moment it appeared.']);
  }
  return lines.slice(0, 3);
}

export function tally(rounds) {
  const c = {};
  for (const r of rounds) for (const k of r.kept) c[k] = (c[k] || 0) + 1;
  return Object.entries(c).sort((a, b) => b[1] - a[1] || WHY[a[0]].index - WHY[b[0]].index);
}

export function duelSummary(names, baskets, fights) {
  const wins = [0, 1].map((p) => fights.filter((f) => f.winner === p).length);
  let head;
  if (!baskets[0].length && !baskets[1].length) head = ['Every star ', { em: 'got away.' }];
  else if (!fights.length) head = ['No fights. ', { em: 'You wanted different things.' }];
  else if (wins[0] === wins[1]) head = ['Fights split ', { em: `${wins[0]}–${wins[1]}` }, '.'];
  else { const w = wins[0] > wins[1] ? 0 : 1; head = [`${names[w]} won `, { em: `${wins[w]} of ${fights.length}` }, ' fights.']; }
  const lines = fights.slice(0, 2).map((f) => [`${names[f.winner]} beat ${names[1 - f.winner]} to `, em(f.m.t), '.']);
  const ks = baskets.map((b) => new Set(b.map((m) => m.k)));
  const shared = WHYS.map((w) => w.key).filter((k) => ks[0].has(k) && ks[1].has(k));
  if (shared.length) lines.push([`You both kept ${shared.map(whyName).join(' and ')}.`]);
  const neither = WHYS.map((w) => w.key).filter((k) => !ks[0].has(k) && !ks[1].has(k));
  if (neither.length && lines.length < 3 && baskets.every((b) => b.length)) lines.push([`Neither of you kept a single ${whyName(neither[0])} moment.`]);
  return { head, lines, wins };
}

// Where a kept moment sits in your sky, as fractions of the sky's box.
// Each why owns a vertical strip; the moment's text picks a steady spot inside it.
export function skyPoint(m) {
  const h = [...m.t].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const i = WHY[m.k].index;
  return { x: (i + 0.5 + ((h % 29) - 14) / 40) / WHYS.length, y: 0.18 + ((h >>> 5) % 61) / 100 };
}

// Nudges points apart vertically so labels in the same strip don't collide.
export function spread(points, minDy = 0.24) {
  const out = points.map((p) => ({ ...p }));
  for (let i = 0; i < out.length; i++) {
    for (let j = 0; j < i; j++) {
      if (Math.abs(out[i].x - out[j].x) < 0.12 && Math.abs(out[i].y - out[j].y) < minDy) {
        out[i].y = out[j].y + (out[i].y >= out[j].y ? minDy : -minDy);
        if (out[i].y > 0.85) out[i].y = out[j].y - minDy;
        if (out[i].y < 0.1) out[i].y = 0.1;
      }
    }
  }
  return out;
}

export const dayKey = (t = Date.now()) => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
export const WEEK_MS = 7 * 864e5;
// How long a list item stays: a week by default, a month for "someday", and always a couple of days past its check-in.
export const untilFor = (it) => (it.when === 'someday' ? it.at + 30 * 864e5 : Math.max(it.at + WEEK_MS, (it.askAt ?? 0) + 2 * 864e5));
export const activeList = (items, now = Date.now()) => items.filter((it) => untilFor(it) > now);

export { BASKET };
