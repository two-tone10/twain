// Small settings. The deck is read synchronously when a round is dealt, so it's kept in memory too.
import { load, save } from './storage';

let deck = 'everyday';
export const deckNow = () => deck;

export async function loadPrefs() {
  deck = await load('keep:deck', 'everyday');
}
export async function setDeck(d) {
  deck = d;
  await save('keep:deck', d);
}

// The two whys you said matter most, picked slowly, once.
export const loadSaid = () => load('keep:said', null);
export const saveSaid = (ks) => save('keep:said', ks);

export const loadOnboarded = () => load('keep:onboarded', false);
export const setOnboarded = () => save('keep:onboarded', true);

// Opt-in "tonight's star" nudge at 6pm.
export const loadEvening = () => load('keep:evening', false);
export const saveEvening = (on) => save('keep:evening', on);

// Names you've made plans with, most recent first.
export const loadPeople = () => load('keep:people', []);
export const savePeople = (names) => save('keep:people', names);
