// Match and Circles: calls to the commons backend (supabase/migrations/20261014120000_keep_together.sql).
import { commonsOn, deviceId, rpc } from './commons';
import { loadMyName } from './storage';
import { whyDigits } from '../keep/together.mjs';

export const SITE = 'https://lipurposefe.com/keep';
export const matchLink = (id) => `${SITE}/match?m=${id}`;
export const circleLink = (code) => `${SITE}/circle?c=${code}`;
export { commonsOn };

const me = async () => ({ device: await deviceId(), name: (await loadMyName()) || 'A friend' });
const safe = async (fn, fallback = null) => { try { return await fn(); } catch { return fallback; } };
const play = (kept, speed) => ({ kept: kept.map((m) => m.t), whys: whyDigits(kept), speed });

export const createMatch = (seed, deck, kept, speed) => safe(async () => rpc('create_match', { p: { ...(await me()), seed, deck, ...play(kept, speed) } }));
export const getMatch = (id) => safe(async () => rpc('get_match', { p_id: id, p_device: await deviceId() }));
export const playMatch = (id, kept, speed) => safe(async () => rpc('play_match', { p: { ...(await me()), id, ...play(kept, speed) } }));
export const guessMatch = (id, guesses) => safe(async () => rpc('guess_match', { p: { device: await deviceId(), id, guesses } }));
export const rematch = (id, seed, deck, kept, speed) => safe(async () => rpc('rematch', { p: { ...(await me()), id, seed, deck, ...play(kept, speed) } }));
export const myMatches = () => safe(async () => rpc('my_matches', { p_device: await deviceId() }), []);

export const createCircle = (circleName) => safe(async () => rpc('create_circle', { p: { ...(await me()), circle_name: circleName } }));
export const joinCircle = (code) => safe(async () => rpc('join_circle', { p: { ...(await me()), code } }));
export const circlePreview = (code) => safe(() => rpc('circle_preview', { p_code: code }));
export const leaveCircle = (code) => safe(async () => rpc('leave_circle', { p: { device: await deviceId(), code } }));
export const myCircles = () => safe(async () => rpc('my_circles', { p_device: await deviceId() }), []);
export const circleDay = (code, day) => safe(async () => rpc('circle_day', { p_code: code, p_device: await deviceId(), p_day: day }));
export const circleGuess = (code, day, mid, guesses) => safe(async () => rpc('circle_guess', { p: { device: await deviceId(), code, day, mid, guesses } }));
export const circleWeek = (code, today) => safe(async () => rpc('circle_week', { p_code: code, p_device: await deviceId(), p_today: today }));

// Every daily drop goes up, so circles can show it to members who've played the same day.
export async function logDaily(day, kept, speed) {
  if (!commonsOn || !kept.length) return;
  await safe(async () => rpc('log_daily', { p: { ...(await me()), day, ...play(kept, speed) } }));
}
