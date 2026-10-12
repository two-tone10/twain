// Pass it around: what a table of players shares, who went their own way, and what to do together. Pure.
import { WHYS, WHY } from './content.mjs';
import { lc } from './insight.mjs';

const WORDS = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'];
const name = (k) => WHY[k].name.toLowerCase();
const article = (k) => (/^[aeiou]/.test(name(k)) ? 'an' : 'a');

function howMany(count, total) {
  if (count === total) return total === 2 ? 'Both of you' : `All ${WORDS[total].toLowerCase()} of you`;
  return `${WORDS[count]} of you`;
}

export function tableSummary(players) {
  const n = players.length;
  const byT = new Map();
  for (const p of players) for (const m of p.kept) {
    if (!byT.has(m.t)) byT.set(m.t, { t: m.t, k: m.k, who: [] });
    if (!byT.get(m.t).who.includes(p.name)) byT.get(m.t).who.push(p.name);
  }
  const shared = [...byT.values()].filter((m) => m.who.length > 1).sort((a, b) => b.who.length - a.who.length || WHY[a.k].index - WHY[b.k].index);

  const whyPlayers = Object.fromEntries(WHYS.map((w) => [w.key, players.filter((p) => p.kept.some((m) => m.k === w.key)).map((p) => p.name)]));
  const everyone = WHYS.map((w) => w.key).filter((k) => whyPlayers[k].length === n);
  const nobody = WHYS.map((w) => w.key).filter((k) => !whyPlayers[k].length);

  // One moment per player that only they kept, preferring a why nobody else touched.
  const solos = players.map((p) => {
    const mine = p.kept.filter((m) => byT.get(m.t).who.length === 1);
    const lone = mine.find((m) => whyPlayers[m.k].length === 1) ?? mine[0];
    return lone ? { name: p.name, t: lone.t, k: lone.k, unique: whyPlayers[lone.k].length === 1, overlap: (p.kept.length - mine.length) / p.kept.length } : null;
  }).filter(Boolean);
  // The one worth asking about: a why nobody else kept, from whoever shared least with the table.
  const askAbout = solos.slice().sort((a, b) => b.unique - a.unique || a.overlap - b.overlap)[0];

  const lines = [];
  if (shared.length) lines.push([`${howMany(shared[0].who.length, n)} grabbed `, { em: lc(shared[0].t) }, '.']);
  else if (everyone.length) lines.push(['Everyone kept ', article(everyone[0]), ' ', { em: name(everyone[0]) }, ' moment.']);
  else lines.push(['No two skies alike tonight.']);
  if (nobody.length && players.every((p) => p.kept.length)) lines.push([`Nobody kept a single ${name(nobody[0])} moment.`]);

  // What to pick from together: shared moments, else everything in the why most of you kept.
  let menu = shared;
  if (!menu.length) {
    const top = WHYS.map((w) => w.key).sort((a, b) => whyPlayers[b].length - whyPlayers[a].length || WHY[a].index - WHY[b].index)[0];
    menu = [...byT.values()].filter((m) => m.k === top);
  }
  if (!menu.length) menu = [...byT.values()];

  return { shared, everyone, nobody, solos, lines, menu: menu.slice(0, 5), ask: askAbout ? ['Ask ', askAbout.name, ' about ', { em: lc(askAbout.t) }, '.'] : null };
}
