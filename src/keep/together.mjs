// Match and Circles: scoring and summaries for skies played on different phones. Pure.
// Points only ever come from reading each other (guessing someone's picks). Sync and speed are for fun.
import { WHYS, WHY } from './content.mjs';
import { deal } from './insight.mjs';
import { seeded } from './fun.mjs';

const name = (k) => WHY[k].name.toLowerCase();

// The server stores kept moments as texts plus their whys as digits ("303" = company, setting, company).
export const toItems = (kept = [], whys = '') => kept.map((t, i) => ({ t, k: WHYS[Number(whys[i])]?.key ?? 'delight' }));
export const whyDigits = (items) => items.map((m) => WHY[m.k].index).join('');

export const newSeed = (rng = Math.random) => Math.floor(rng() * 2 ** 31);
export const matchDeal = (seed, deck = 'everyday') => deal(3, seeded(seed), deck);
export const matchFieldRng = (seed) => seeded(seed + 7);

function counts(items) {
  const c = {};
  for (const m of items) c[m.k] = (c[m.k] || 0) + 1;
  return c;
}

// How alike two skies are, 0–100: half for the same stars, half for the same whys.
export function sync(a, b) {
  if (!a.length || !b.length) return 0;
  const n = Math.max(a.length, b.length);
  const same = a.filter((m) => b.some((x) => x.t === m.t)).length;
  const ca = counts(a), cb = counts(b);
  const whys = Object.keys(ca).reduce((s, k) => s + Math.min(ca[k], cb[k] ?? 0), 0);
  return Math.round(100 * (0.5 * (same / n) + 0.5 * (whys / n)));
}

// One line about where two skies meet and where they part.
export function differLine(mine, theirs, other) {
  const cm = counts(mine), ct = counts(theirs);
  const shared = Object.keys(cm).filter((k) => ct[k]).sort((x, y) => ct[y] + cm[y] - (ct[x] + cm[x]))[0];
  const only = theirs.find((m) => !cm[m.k]) ?? theirs.find((m) => !mine.some((x) => x.t === m.t));
  const parts = [];
  if (shared) parts.push(['You both went for ', { em: name(shared) }, '.']);
  if (only) parts.push([`Only ${other} kept `, { em: only.t.toLowerCase() }, '. Ask about it.']);
  return parts;
}

// Everything about one match, from one side.
export function matchCard(view) {
  const mine = toItems(view.mine?.kept, view.mine?.whys);
  const theirs = toItems(view.other?.kept, view.other?.whys);
  const both = mine.length > 0 && theirs.length > 0;
  return {
    both,
    mine, theirs,
    same: both ? mine.filter((m) => theirs.some((x) => x.t === m.t)).length : 0,
    sync: both ? sync(mine, theirs) : null,
    iRead: view.mine?.correct ?? null,
    theyRead: view.other?.correct ?? null,
    quicker: both && view.mine.speed != null && view.other.speed != null ? (view.mine.speed <= view.other.speed ? 'you' : 'them') : null,
    lines: both ? differLine(mine, theirs, view.other.name) : [],
  };
}

// All finished matches with the same person, newest first: how in sync, how well you read each other.
export function pairs(views) {
  const by = {};
  for (const v of views) {
    if (!v?.mine || !v.other?.kept) continue;
    const who = v.other.name;
    (by[who] ||= []).push(v);
  }
  return Object.entries(by).map(([who, vs]) => {
    const cards = vs.map(matchCard);
    const syncs = cards.map((c) => c.sync);
    const avg = Math.round(syncs.reduce((a, b) => a + b, 0) / syncs.length);
    const recent = syncs.slice(0, 3), early = syncs.slice(-3);
    const trend = syncs.length >= 4 ? Math.sign(recent.reduce((a, b) => a + b, 0) / recent.length - early.reduce((a, b) => a + b, 0) / early.length) : 0;
    const read = cards.filter((c) => c.iRead != null);
    const cm = counts(cards.flatMap((c) => c.mine)), ct = counts(cards.flatMap((c) => c.theirs));
    const meet = WHYS.map((w) => w.key).filter((k) => cm[k] && ct[k]).sort((a, b) => cm[b] + ct[b] - cm[a] - ct[a])[0] ?? null;
    const differ = WHYS.map((w) => w.key).filter((k) => (cm[k] ?? 0) + (ct[k] ?? 0) > 0).sort((a, b) => Math.abs((ct[b] ?? 0) - (cm[b] ?? 0)) - Math.abs((ct[a] ?? 0) - (cm[a] ?? 0))).slice(0, 2);
    return { who, matches: vs.length, sync: avg, trend, iRead: read.reduce((s, c) => s + c.iRead, 0), iReadOf: read.length * 3, meet, differ };
  }).sort((a, b) => b.matches - a.matches);
}

// A circle's week: closest pair, best reader, most surprising, and the circle's own sign.
export function weekAwards(members, plays, guesses) {
  const nameOf = Object.fromEntries(members.map((m) => [m.mid, m.name]));
  const byDay = {};
  for (const p of plays) (byDay[p.day] ||= []).push({ mid: p.mid, items: toItems(p.kept, p.whys) });
  const pairSync = {}, personSync = {};
  for (const ps of Object.values(byDay)) {
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
      const s = sync(ps[i].items, ps[j].items), key = [ps[i].mid, ps[j].mid].sort().join('|');
      (pairSync[key] ||= []).push(s);
      for (const m of [ps[i].mid, ps[j].mid]) (personSync[m] ||= []).push(s);
    }
  }
  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const closest = Object.entries(pairSync).map(([k, xs]) => ({ k, s: mean(xs) })).sort((a, b) => b.s - a.s)[0];
  const surprising = Object.entries(personSync).filter(([, xs]) => xs.length >= 1).map(([m, xs]) => ({ m, s: mean(xs) })).sort((a, b) => a.s - b.s)[0];
  const reads = {};
  for (const g of guesses) { const r = (reads[g.by] ||= { c: 0, of: 0 }); r.c += g.correct; r.of += 3; }
  const reader = Object.entries(reads).sort((a, b) => b[1].c / b[1].of - a[1].c / a[1].of || b[1].c - a[1].c)[0];
  const all = Object.values(byDay).flat().flatMap((p) => p.items);
  const top = Object.entries(counts(all)).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const rows = [];
  if (closest && Object.keys(pairSync).length > 0) rows.push(['Closest pair', `${closest.k.split('|').map((m) => nameOf[m] ?? '?').join(' & ')} · ${Math.round(closest.s)}%`]);
  if (reader) rows.push(['Best reader', `${nameOf[reader[0]] ?? '?'} · ${reader[1].c} of ${reader[1].of}`]);
  if (surprising && Object.keys(personSync).length > 2) rows.push(['Most surprising', nameOf[surprising.m] ?? '?']);
  if (top) rows.push(['Circle why', WHY[top].name]);
  return rows;
}
