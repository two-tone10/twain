// Small settings. The deck is read synchronously when a round is dealt, so it's kept in memory too.
import { AccessibilityInfo } from 'react-native';
import { load, save } from './storage';

let deck = 'everyday';
let calm = false;
export const deckNow = () => deck;
// Calm mode: slower stars and a gentler comet. Starts on if the phone asks for reduced motion.
export const calmNow = () => calm;

export async function loadPrefs() {
  deck = await load('keep:deck', 'everyday');
  const saved = await load('keep:calm', null);
  calm = saved ?? (await AccessibilityInfo.isReduceMotionEnabled().catch(() => false));
}
export async function setCalm(on) {
  calm = on;
  await save('keep:calm', on);
}

// "Today's drop is ready" reminder: an hour of the day, or null for off.
export const loadDailyHour = () => load('keep:dailyhour', null);
export const saveDailyHour = (h) => save('keep:dailyhour', h);
export async function setDeck(d) {
  deck = d;
  await save('keep:deck', d);
}

// The two whys you said matter most, picked slowly, once.
export const loadSaid = () => load('keep:said', null);
export const saveSaid = (ks) => save('keep:said', ks);

export const loadOnboarded = () => load('keep:onboarded', false);
export const setOnboarded = () => save('keep:onboarded', true);

// The star you typed in the intro. It falls in your next drop, once.
export const loadFirstStar = () => load('keep:firststar', null);
export const saveFirstStar = (star) => save('keep:firststar', star);

// Opt-in "tonight's star" nudge at 6pm.
export const loadEvening = () => load('keep:evening', false);
export const saveEvening = (on) => save('keep:evening', on);

// Names you've made plans with, most recent first.
export const loadPeople = () => load('keep:people', []);
export const savePeople = (names) => save('keep:people', names);
