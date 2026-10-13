// Back up everything Keep knows to a file you keep (Files, iCloud Drive, AirDrop), and restore from one.
// Everything stays local otherwise; this is the only way data leaves the phone, and only when you ask.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

const PREFIX = 'keep:';

export async function exportBackup() {
  const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX));
  const data = Object.fromEntries((await AsyncStorage.multiGet(keys)).map(([k, v]) => [k, v == null ? null : JSON.parse(v)]));
  const body = JSON.stringify({ app: 'keep', version: 1, at: Date.now(), data });
  const day = new Date().toISOString().slice(0, 10);
  const file = new File(Paths.cache, `Keep backup ${day}.json`);
  file.create({ overwrite: true });
  file.write(body);
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Save your Keep backup' });
}

// Picks a backup file and returns what's in it, without writing anything yet.
export async function pickBackup() {
  const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'public.json', 'public.text'], copyToCacheDirectory: true });
  if (res.canceled || !res.assets?.[0]) return null;
  const parsed = JSON.parse(await new File(res.assets[0].uri).text());
  if (parsed?.app !== 'keep' || typeof parsed.data !== 'object') throw new Error('not a Keep backup');
  const list = parsed.data['keep:list'] ?? [];
  return { backup: parsed, at: parsed.at, done: list.filter((it) => it.done || it.didIt).length, rounds: (parsed.data['keep:rounds'] ?? []).length };
}

// Replaces what's on this phone with the backup.
export async function restoreBackup(backup) {
  const old = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX));
  await AsyncStorage.multiRemove(old);
  const pairs = Object.entries(backup.data).filter(([k]) => k.startsWith(PREFIX)).map(([k, v]) => [k, JSON.stringify(v)]);
  await AsyncStorage.multiSet(pairs);
}
