// Turning a kept star into a plan: when, with whom, and when Keep should ask how it went. Pure.
import { dayKey, lc } from './insight.mjs';

export const WHENS = [
  { key: 'tonight', label: 'Tonight' },
  { key: 'weekend', label: 'This weekend' },
  { key: 'week', label: 'This week' },
  { key: 'someday', label: 'Someday' },
];

const at = (d, h) => { const x = new Date(d); x.setHours(h, 0, 0, 0); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const comingSunday = (now) => addDays(at(now, 18), (7 - new Date(now).getDay()) % 7);

// When to ask "did it happen?". Tonight: next morning. This weekend: Sunday evening.
// This week: the Sunday at least three days off. Someday: never.
export function askAtFor(when, now = Date.now()) {
  if (when === 'tonight') return addDays(at(now, 9), 1).getTime();
  if (when === 'weekend') {
    const sun = comingSunday(now);
    return sun.getTime() > now + 2 * 36e5 ? sun.getTime() : addDays(at(now, 9), 1).getTime();
  }
  if (when === 'week') {
    let sun = comingSunday(now);
    if (sun.getTime() - now < 3 * 864e5) sun = addDays(sun, 7);
    return sun.getTime();
  }
  return null;
}

export const withLabel = (names = []) => {
  const n = names.filter(Boolean);
  if (!n.length) return '';
  return n.length === 1 ? n[0] : `${n.slice(0, -1).join(', ')} & ${n[n.length - 1]}`;
};

// "Tonight", "This weekend"... as seen from `now`; a "tonight" from an earlier day shows its weekday.
export function whenLabel(it, now = Date.now()) {
  if (!it.when) return null;
  if (it.when === 'tonight' && dayKey(it.at) !== dayKey(now)) return new Date(it.at).toLocaleDateString(undefined, { weekday: 'long' });
  return WHENS.find((w) => w.key === it.when)?.label ?? null;
}

export const planMeta = (it, now = Date.now()) => [whenLabel(it, now), it.with?.length ? `with ${withLabel(it.with)}` : null].filter(Boolean).join(' · ');

// What the follow-up says right after you make the plan.
export function followUp(when) {
  if (when === 'tonight') return 'Tomorrow morning Keep will ask how it went.';
  if (when === 'weekend') return 'Sunday evening Keep will ask how it went.';
  if (when === 'week') return 'At the end of the week Keep will ask how it went.';
  return 'It waits on your list for a month. Keep won’t ask about it.';
}

// The check-in question, as reading segments.
export function checkInAsk(it, now = Date.now()) {
  const t = { em: lc(it.t) };
  if (!it.when) {
    const yesterday = dayKey(it.at) === dayKey(now - 864e5);
    return [yesterday ? 'Yesterday' : 'Earlier this week', ' you picked ', t, '. Did you get to it?'];
  }
  const who = it.with?.length ? `, with ${withLabel(it.with)}` : '';
  const when = { tonight: dayKey(it.at) === dayKey(now - 864e5) ? 'last night' : 'the other night', weekend: 'this weekend', week: 'this week' }[it.when] ?? '';
  return ['You planned ', t, who, when ? `, ${when}` : '', '. Did it happen?'];
}

// Remembered names, most recent first, at most eight.
export const rememberPeople = (known, used) => [...used.filter(Boolean), ...known.filter((n) => !used.includes(n))].slice(0, 8);
