// The game layer: named skies, your sign, speed and combos, the daily drop, and friend challenges. Pure.
import { isStarName } from './names.mjs';
import { WHYS, WHY } from './content.mjs';
import { deal } from './insight.mjs';

/* ---------- names ---------- */

// Every why has a noun (the sign) and an adjective. A sky is named "The <adj of 2nd> <noun of 1st>".
export const SIGNS = {
  delight: { noun: 'Spark', adj: 'Bright', line: 'What feels good, first.' },
  setting: { noun: 'Harbor', adj: 'Quiet', line: 'The place is the point.' },
  novelty: { noun: 'Comet', adj: 'Restless', line: 'New things first.' },
  company: { noun: 'Hearth', adj: 'Warm', line: 'People first.' },
  skill: { noun: 'Forge', adj: 'Steady', line: 'Getting better, first.' },
  taste: { noun: 'Prism', adj: 'Fine', line: 'Only the good stuff.' },
  direction: { noun: 'Compass', adj: 'True', line: 'Where it’s all heading.' },
};
export const ALL_NAMES = WHYS.length * WHYS.length;

function ranked(items) {
  const c = {};
  for (const m of items) c[m.k] = (c[m.k] || 0) + 1;
  return Object.keys(c).sort((a, b) => c[b] - c[a] || WHY[a].index - WHY[b].index);
}

export function skyName(kept) {
  if (!kept.length) return null;
  const [a, b] = ranked(kept);
  return `The ${SIGNS[b ?? a].adj} ${SIGNS[a].noun}`;
}

// "Mostly company. A little novelty."
export function skyLine(kept) {
  const [a, b] = ranked(kept);
  if (!a) return '';
  return b ? `Mostly ${WHY[a].name.toLowerCase()}. A little ${WHY[b].name.toLowerCase()}.` : `All ${WHY[a].name.toLowerCase()}.`;
}

/* ---------- your sign ---------- */

export const SIGN_ROUNDS = 5;
// Your sign is the why you grab fastest across your drops: the faster half of every catch.
export function signFor(rounds) {
  const played = rounds.filter((r) => r.items?.length);
  if (played.length < SIGN_ROUNDS) return { left: SIGN_ROUNDS - played.length };
  const all = played.flatMap((r) => r.items).filter((m) => typeof m.dwell === 'number');
  const cut = all.map((m) => m.dwell).sort((x, y) => x - y)[Math.floor(all.length / 2)];
  const k = ranked(all.filter((m) => m.dwell <= cut))[0];
  return { k, name: `The ${SIGNS[k].noun}`, line: SIGNS[k].line, left: 0 };
}

/* ---------- speed and combos ---------- */

export const COMBO_MS = 1300;
// Average seconds from a star appearing to your tap.
export const speedOf = (kept) => (kept.length ? kept.reduce((s, m) => s + (m.tapped - m.born), 0) / kept.length / 1000 : null);
export const fmtSpeed = (s) => (s == null ? '—' : `${s.toFixed(2)}s`);

/* ---------- the daily drop ---------- */

const EPOCH = new Date(2026, 9, 1).getTime();
export const dayNumber = (now = Date.now()) => {
  const d = new Date(now);
  return Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - EPOCH) / 864e5) + 1;
};

// A tiny seeded generator so the same day deals the same stars on every phone.
export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const dailyRng = (day) => seeded(day * 2654435761);
// Positions and the comet for a given day's field, so a friend's replay falls the same way.
export const fieldRng = (day) => seeded(day * 7919 + 3);
// The daily always uses the Everyday deck so everyone catches from the same sky.
export const dailyDeal = (day, perWhy = 3) => deal(perWhy, dailyRng(day), 'everyday');

const EMOJI = { delight: '🩷', setting: '💛', novelty: '🩵', company: '🧡', skill: '💚', taste: '💜', direction: '💙' };
export const emojiLine = (kept) => kept.map((m) => EMOJI[m.k]).join('');

/* ---------- friend challenges ---------- */

// A challenge names the day, who played, which of that day's stars they kept (positions in the deal),
// their speed, and their whys as digits (so the web page can draw the sky without the library).
export function encodeChallenge(day, name, kept, speed = null, deck = dailyDeal(day)) {
  const pos = kept.map((m) => deck.findIndex((d) => d.t === m.t)).filter((i) => i >= 0);
  const w = kept.map((m) => WHY[m.k].index).join('');
  return `d=${day}&n=${encodeURIComponent(name || 'A friend')}&k=${pos.join('.')}&w=${w}${speed != null ? `&s=${speed.toFixed(2)}` : ''}`;
}
export function decodeChallenge({ d, n, k, s }) {
  const day = parseInt(d, 10);
  if (!day) return null;
  const deck = dailyDeal(day);
  const kept = String(k ?? '').split('.').filter(Boolean).map(Number).filter((i) => Number.isInteger(i) && deck[i]).map((i) => deck[i]);
  const speed = parseFloat(s);
  return { day, name: isStarName(n) ? n : 'A friend', kept, speed: Number.isFinite(speed) ? speed : null };
}
export const overlap = (a, b) => a.filter((m) => b.some((x) => x.t === m.t)).length;

export const PLAY_URL = 'https://lipurposefe.com/keep/play';
export function shareText({ day, kept, speed, who }) {
  return [`Keep #${day} ✦ ${skyName(kept)}`, `${emojiLine(kept)}  ${fmtSpeed(speed)}`, `Catch the same stars: ${PLAY_URL}?${encodeChallenge(day, who, kept, speed)}`].join('\n');
}

// After the daily: how your five compare with everyone's. Rare is a compliment.
export function rarity(kept, stats) {
  if (!stats?.length || !kept.length) return null;
  const pct = Object.fromEntries(stats.map((x) => [x.t, Number(x.kept_pct)]));
  const mine = kept.filter((m) => pct[m.t] != null).map((m) => ({ t: m.t, pct: pct[m.t] }));
  if (!mine.length) return null;
  const lo = mine.reduce((a, b) => (b.pct < a.pct ? b : a));
  const hi = mine.reduce((a, b) => (b.pct > a.pct ? b : a));
  const lines = [];
  if (hi.t !== lo.t) lines.push([`${Math.round(hi.pct)}% of players kept `, { em: hi.t.toLowerCase() }, ' too.']);
  lines.push(lo.pct <= 15
    ? ['Only ', { em: `${Math.round(lo.pct)}%` }, ' kept ', { em: lo.t.toLowerCase() }, '. You’re one of the few.']
    : [`${Math.round(lo.pct)}% kept `, { em: lo.t.toLowerCase() }, '.']);
  return { lines, players: stats[0]?.players ?? null };
}
