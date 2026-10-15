import AsyncStorage from '@react-native-async-storage/async-storage';
import { isStarName } from '../keep/names.mjs';

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

// Rounds, holds and the list are your codex, so they're kept. This ceiling is years of daily play.
const KEEP_ALL = 20000;

async function append(key, items, max) {
  const next = [...(await load(key, [])), ...items].slice(-max);
  await save(key, next);
  return next;
}

// Every round's keeps, by why, for the running tally.
export const loadRounds = () => load('keep:rounds', []);
// `items` keeps each grab's dwell (how far it had fallen), which is how Your sky reads speed.
export const addRound = (kept, mode = 'drop') =>
  append('keep:rounds', [{ kept: kept.map((m) => m.k), items: kept.map(({ t, k, dwell }) => ({ t, k, dwell })), mode, at: Date.now() }], KEEP_ALL);

// Drift rounds: what survived, and how long each star was held.
export const loadHolds = () => load('keep:holds', []);
export const addHold = (stars) =>
  append('keep:holds', [{ held: stars.filter((s) => s.goneAt == null).map(({ t, k, holdMs }) => ({ t, k, holdMs })), at: Date.now() }], KEEP_ALL);

// The one slow drop in progress, if any.
export const loadSlow = () => load('keep:slow', null);
export const saveSlow = (s) => save('keep:slow', s);

// Past constellations, newest last. Home draws the latest few faintly.
export const loadSkies = () => load('keep:skies', []);
export const addSky = (kept) => append('keep:skies', [kept.map(({ t, k }) => ({ t, k }))], 12);

// Whoever needs to know the list changed (the home-screen widget). Set once in the root layout.
let onList = null;
export const onListChange = (fn) => { onList = fn; };
const listChanged = (all) => { try { onList?.(all); } catch {} return all; };

// Moments and plans you chose to try. Open ones leave the List after a while; done ones stay in Kept for good.
export const loadList = () => load('keep:list', []);
// A plan also carries when, who with, and when to ask how it went.
export const addToList = (items) => appendList(items);
const appendList = async (items) => listChanged(await append('keep:list', items.map(({ t, k, when, with: people, askAt }) => ({
  id: Math.random().toString(36).slice(2, 9), t, k, at: Date.now(), done: false,
  ...(when ? { when, with: people ?? [], askAt: askAt ?? null } : {}),
})), KEEP_ALL));
export async function answerCheckIn(id, answer) {
  const all = await load('keep:list', []);
  const it = all.find((x) => x.id === id);
  if (it) Object.assign(it, answer, answer.didIt ? { doneAt: Date.now() } : {});
  await save('keep:list', all);
  return listChanged(all);
}

export async function toggleListItem(id) {
  const all = await load('keep:list', []);
  const it = all.find((x) => x.id === id);
  if (it) { it.done = !it.done; it.doneAt = it.done ? Date.now() : null; }
  await save('keep:list', all);
  listChanged(all);
  return { all, item: it };
}

export const loadNames = () => load('keep:names', ['', '']);
export const saveNames = (names) => save('keep:names', names);

// Game records: names you've drawn (with when first and how often), personal bests, and daily results.
export const loadNamed = () => load('keep:named', {});
export async function addNamed(name) {
  if (!name) return { all: {}, isNew: false };
  const all = await load('keep:named', {});
  const isNew = !all[name];
  all[name] = { first: all[name]?.first ?? Date.now(), n: (all[name]?.n ?? 0) + 1 };
  await save('keep:named', all);
  return { all, isNew };
}

export const loadBest = () => load('keep:best', { speed: null, combo: 0 });
// Returns which records this round beat.
export async function updateBest({ speed, combo }) {
  const best = await load('keep:best', { speed: null, combo: 0 });
  const beat = { speed: speed != null && best.speed != null && speed < best.speed, combo: combo > best.combo && combo >= 3 && best.combo > 0 };
  await save('keep:best', { speed: beat.speed ? speed : best.speed, combo: Math.max(best.combo, combo) });
  return beat;
}

export const loadDailies = () => load('keep:dailies', {});
export async function saveDaily(day, result) {
  const all = await load('keep:dailies', {});
  all[day] = result;
  await save('keep:dailies', all);
}

// Your star name: what friends see you as. Picked from a list, never typed; anything else reads as unset.
export const loadMyName = async () => { const n = await load('keep:myname', ''); return isStarName(n) ? n : ''; };
export const saveMyName = (n) => (isStarName(n) ? save('keep:myname', n) : null);

// Stars you added yourself. They fall only for you and never leave the phone.
export const loadMyStars = () => load('keep:mystars', []);
export const saveMyStars = (items) => save('keep:mystars', items);
