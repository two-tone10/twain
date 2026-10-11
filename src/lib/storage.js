import AsyncStorage from '@react-native-async-storage/async-storage';

export async function load(key, fallback = null) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export async function save(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

async function append(key, items, max) {
  const next = [...(await load(key, [])), ...items].slice(-max);
  await save(key, next);
  return next;
}

// Every round's keeps, by why, for the running tally.
export const loadRounds = () => load('keep:rounds', []);
// `items` keeps each grab's dwell (how far it had fallen), which is how Your sky reads speed.
export const addRound = (kept, mode = 'drop') =>
  append('keep:rounds', [{ kept: kept.map((m) => m.k), items: kept.map(({ t, k, dwell }) => ({ t, k, dwell })), mode, at: Date.now() }], 200);

// Drift rounds: what survived, and how long each star was held.
export const loadHolds = () => load('keep:holds', []);
export const addHold = (stars) =>
  append('keep:holds', [{ held: stars.filter((s) => s.goneAt == null).map(({ t, k, holdMs }) => ({ t, k, holdMs })), at: Date.now() }], 200);

// The one slow drop in progress, if any.
export const loadSlow = () => load('keep:slow', null);
export const saveSlow = (s) => save('keep:slow', s);

// Past constellations, newest last. Home draws the latest few faintly.
export const loadSkies = () => load('keep:skies', []);
export const addSky = (kept) => append('keep:skies', [kept.map(({ t, k }) => ({ t, k }))], 12);

// Moments you chose to try. They wait a week, then quietly drop off.
export const loadList = () => load('keep:list', []);
export const addToList = (items) => append('keep:list', items.map(({ t, k }) => ({ id: Math.random().toString(36).slice(2, 9), t, k, at: Date.now(), done: false })), 30);
export async function answerCheckIn(id, answer) {
  const all = await load('keep:list', []);
  const it = all.find((x) => x.id === id);
  if (it) Object.assign(it, answer);
  await save('keep:list', all);
  return all;
}

export async function toggleListItem(id) {
  const all = await load('keep:list', []);
  const it = all.find((x) => x.id === id);
  if (it) it.done = !it.done;
  await save('keep:list', all);
  return { all, item: it };
}

export const loadNames = () => load('keep:names', ['', '']);
export const saveNames = (names) => save('keep:names', names);
