// Hiding and reporting people, circle owners removing members, and deleting your data.
// Server side: supabase/migrations/20261015100000_keep_safety.sql.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { commonsOn, deviceId, newDeviceId, rpc } from './commons';

const call = async (name, p) => {
  if (!commonsOn) return { ok: false };
  try { return (await rpc(name, { p: { device: await deviceId(), ...p } })) ?? { ok: false }; } catch { return { ok: false }; }
};

// `where` is { match: id } or { code, mid }. Reporting someone also hides them.
export const reportPerson = (where) => call('report', { kind: 'person', ...where });
export const hidePerson = (where) => call('hide_person', where);
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
