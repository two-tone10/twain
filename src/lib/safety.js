// Reporting, hiding people, circle owners removing members, and deleting your data.
// Server side: supabase/migrations/20261015100000_keep_safety.sql.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GONE, setExtra, setGone } from '../keep/content.mjs';
import { commonsOn, deviceId, newDeviceId, rpc, syncCommunity } from './commons';
import { load, save } from './storage';

const call = async (name, p) => {
  if (!commonsOn) return { ok: false };
  try { return (await rpc(name, { p: { device: await deviceId(), ...p } })) ?? { ok: false }; } catch { return { ok: false }; }
};

// A star from another player. It stops falling on this phone straight away; three reports hide it for everyone.
export async function reportStar(t) {
  const reported = await load('keep:reported', []);
  if (!reported.includes(t)) await save('keep:reported', [...reported, t]);
  GONE.add(t);
  syncCommunity().then(({ items, gone }) => { setExtra(items); setGone(gone); });
  return call('report', { kind: 'star', t });
}

// `where` is { match: id } or { code, mid }. Reporting someone also hides them.
export const reportPerson = (where) => call('report', { kind: 'person', ...where });
export const hidePerson = (where) => call('hide_person', where);
export const reportCircle = (code) => call('report', { kind: 'circle', code });
export const removeMember = (code, mid) => call('remove_member', { code, mid });

// Deletes everything on Keep's server tied to this phone, then starts a fresh anonymous id.
export async function forgetMe() {
  const r = await call('forget_me', {});
  if (r?.ok) await newDeviceId();
  return !!r?.ok;
}

// The server, then everything Keep keeps on this phone. The app restarts empty, at the intro.
export async function eraseEverything() {
  if (commonsOn && !(await forgetMe())) return false;
  const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith('keep:'));
  await AsyncStorage.multiRemove(keys);
  return true;
}
