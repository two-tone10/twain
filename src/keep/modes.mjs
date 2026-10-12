// Pure rules for Drift, the slow drop, the list check-in and the sky readings.
// Same conventions as insight.mjs: no React, no storage, readings come back as segments.
import { WHY, WHYS } from './content.mjs';
import { dayKey, headline, lc } from './insight.mjs';

const em = (t) => ({ em: lc(t) });
const whyName = (k) => WHY[k].name.toLowerCase();

/* ---------- Drift: what you protect ---------- */

export const DRIFT = { count: 10, roundMs: 40000, fadeMs: 4200, refillMs: 500, firstFade: 1200, gapStart: 2600, gapEnd: 1100 };

// When each star starts to fade, in order. The gaps shrink as the round goes on.
export function fadeStarts(n = DRIFT.count) {
  const out = [];
  let t = DRIFT.firstFade;
  for (let i = 0; i < n; i++) {
    out.push(t);
    t += DRIFT.gapStart + (DRIFT.gapEnd - DRIFT.gapStart) * (i / Math.max(1, n - 1));
  }
  return out;
}

// stars: [{ t, k, holdMs, touches, goneAt (ms or null) }]
export function driftReading(stars) {
  const held = stars.filter((s) => s.goneAt == null);
  const lost = stars.filter((s) => s.goneAt != null).sort((a, b) => a.goneAt - b.goneAt);
  const lines = [];
  const longest = stars.reduce((a, b) => (b.holdMs > a.holdMs ? b : a), stars[0]);
  if (longest && longest.holdMs > 0) lines.push(['You held on to ', em(longest.t), ' the longest.']);
  const most = stars.reduce((a, b) => (b.touches > a.touches ? b : a), stars[0]);
  if (most && most.touches >= 3 && most !== longest) lines.push(['Your thumb kept going back to ', em(most.t), '.']);
  const firstLost = lost.find((s) => s.touches === 0) || lost[0];
  if (firstLost) lines.push([firstLost.touches ? 'The first one you lost was ' : 'You let ', em(firstLost.t), firstLost.touches ? '.' : ' go first, without a touch.']);
  return { head: held.length ? headline(held) : 'Everything drifted away.', held, lines: lines.slice(0, 3) };
}

/* ---------- the slow drop: one drop across a day ---------- */

export const SLOW = { perWhy: 2, spanMs: 12 * 3600e3, fallMs: 3 * 3600e3 };

export function slowSchedule(start, deck, { spanMs = SLOW.spanMs, fallMs = SLOW.fallMs, rng = Math.random } = {}) {
  const gap = spanMs / deck.length;
  return {
    start,
    end: start + spanMs + fallMs,
    items: deck.map((m, i) => {
      const spawnAt = Math.round(start + i * gap + (i ? (rng() - 0.5) * gap * 0.6 : 0));
      return { ...m, spawnAt, endAt: spawnAt + fallMs, x: 0.15 + rng() * 0.7 };
    }),
    kept: [],
  };
}

// Where everything is at `now`. f is how far a falling star has come, 0 to 1.
export function slowSnapshot(s, now, basket = 5) {
  const keptT = new Set(s.kept.map((m) => m.t));
  const live = [], missed = [], upcoming = [];
  for (const m of s.items) {
    if (keptT.has(m.t)) continue;
    if (now < m.spawnAt) upcoming.push(m);
    else if (now < m.endAt) live.push({ ...m, f: (now - m.spawnAt) / (m.endAt - m.spawnAt) });
    else missed.push(m);
  }
  const full = s.kept.length >= basket;
  return { live, missed, next: upcoming[0] || null, done: full || (!live.length && !upcoming.length), full };
}

export function keepSlow(s, t, now) {
  const m = s.items.find((x) => x.t === t);
  if (!m || s.kept.some((x) => x.t === t)) return s;
  return { ...s, kept: [...s.kept, { t: m.t, k: m.k, dwell: (now - m.spawnAt) / (m.endAt - m.spawnAt), tapped: now, born: m.spawnAt }] };
}

// The finished slow drop in the shape the solo results screen reads.
export function slowOutcome(s, now) {
  const keptT = new Set(s.kept.map((m) => m.t));
  const gone = s.items.filter((m) => !keptT.has(m.t) && m.spawnAt <= now).map((m) => ({ t: m.t, k: m.k, born: m.spawnAt, left: Math.min(m.endAt, now) }));
  return { kept: s.kept, gone, swaps: [] };
}

// Gentle nudges before a star falls past: half an hour ahead, never closer than two hours apart.
export function reminderTimes(s, now, { leadMs = 30 * 60e3, minGapMs = 2 * 3600e3 } = {}) {
  const keptT = new Set(s.kept.map((m) => m.t));
  const out = [];
  for (const m of [...s.items].sort((a, b) => a.endAt - b.endAt)) {
    const at = m.endAt - leadMs;
    if (keptT.has(m.t) || at <= now || at < m.spawnAt) continue;
    if (out.length && at - out[out.length - 1].at < minGapMs) continue;
    out.push({ at, t: m.t });
  }
  return s.kept.length >= 5 ? [] : out;
}

export function fmtLeft(ms) {
  if (ms <= 0) return 'now';
  const m = Math.round(ms / 60000);
  if (m < 60) return `${Math.max(1, m)}m`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

/* ---------- the list: did you get to it? ---------- */

// Unticked items that haven't been asked about yet: a plan once its check-in time comes
// ("someday" never asks), anything else from the next day on.
export const dueCheckIns = (list, now = Date.now()) => list.filter((it) => !it.done && it.didIt == null
  && (it.when ? it.askAt != null && now >= it.askAt : dayKey(it.at) !== dayKey(now)));

/* ---------- your sky: grab, hold, do ---------- */

const top = (keys) => {
  if (!keys.length) return null;
  const c = {};
  for (const k of keys) c[k] = (c[k] || 0) + 1;
  return Object.entries(c).sort((a, b) => b[1] - a[1] || WHY[a[0]].index - WHY[b[0]].index)[0][0];
};
const median = (xs) => { const s = xs.slice().sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

export function skyReadings({ rounds = [], holds = [], list = [] }) {
  const grabs = rounds.flatMap((r) => r.items || []);
  let grab = null, fastest = null;
  if (grabs.length >= 6) {
    const by = {};
    for (const g of grabs) (by[g.k] ||= []).push(g.dwell);
    const ranked = Object.entries(by).filter(([, d]) => d.length >= 2).sort((a, b) => median(a[1]) - median(b[1]));
    grab = ranked[0]?.[0] ?? top(grabs.map((g) => g.k));
    fastest = grabs.reduce((a, b) => (b.dwell < a.dwell ? b : a));
  }
  const heldAll = holds.flatMap((h) => h.held || []);
  const hold = heldAll.length >= 3 ? top(heldAll.map((m) => m.k)) : null;
  const did = list.filter((it) => it.done || it.didIt);
  const live = did.length >= 2 ? top(did.map((m) => m.k)) : null;

  let gap = null;
  if (grab && live && grab !== live) gap = [`You reach for ${whyName(grab)} in seconds. The moments you actually do are ${whyName(live)}.`];
  else if (grab && hold && grab !== hold) gap = [`You grab ${whyName(grab)}, but you hold on to ${whyName(hold)}.`];
  else if (grab && live && hold && grab === live && live === hold) gap = [`Grab, hold, do: it’s ${whyName(grab)} every time.`];

  // A moment you keep catching that hasn't happened yet.
  const caught = {};
  for (const g of grabs) caught[g.t] = (caught[g.t] || 0) + 1;
  const doneT = new Set(did.map((m) => m.t));
  const waiting = Object.entries(caught).filter(([t, n]) => n >= 2 && !doneT.has(t)).sort((a, b) => b[1] - a[1])[0];
  const nudge = waiting ? ['You keep catching ', em(waiting[0]), '. It hasn’t happened yet. Maybe make room for it this week?'] : null;

  return {
    grab: grab && { why: grab, line: [`You grab ${whyName(grab)} fastest`, ...(fastest ? ['. Quickest of all: ', em(fastest.t), '.'] : ['.'])] },
    hold: hold && { why: hold, line: [`You hold on to ${whyName(hold)}.`] },
    live: live && { why: live, line: [`The moments you actually do are ${whyName(live)}.`] },
    gap,
    nudge,
    counts: { grabs: grabs.length, holds: heldAll.length, done: did.length },
  };
}

export { WHYS };
