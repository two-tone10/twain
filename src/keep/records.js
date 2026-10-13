// What every finished solo round writes down: the round, its sky, its name, and any personal bests.
// Returns what the results screen shows on top of the game: name, whether it's new, speed, bests.
import { skyName, speedOf } from './fun.mjs';
import { addNamed, addRound, addSky, updateBest } from '../lib/storage';
import { logRound } from '../lib/commons';

export async function recordRound(g, mode = 'drop', day = null) {
  await addRound(g.kept, mode);
  if (['drop', 'daily', 'challenge'].includes(mode)) logRound({ mode, deck: g.deckKey ?? 'everyday', day, kept: g.kept, gone: g.gone ?? [] });
  if (!g.kept.length) return { speed: null };
  await addSky(g.kept);
  const { isNew } = await addNamed(skyName(g.kept));
  const speed = mode === 'slow' ? null : speedOf(g.kept);
  const beat = speed != null ? await updateBest({ speed, combo: g.bestCombo ?? 0 }) : {};
  return { isNew, speed, beat };
}
