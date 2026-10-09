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

export async function clientId() {
  let id = await load('twain:client');
  if (!id) {
    id = Math.random().toString(36).slice(2, 10);
    await save('twain:client', id);
  }
  return id;
}

const ALBUM = 'twain:album';

export const loadAlbum = () => load(ALBUM, []);

export async function addToAlbum(day) {
  const album = await loadAlbum();
  if (album.some((d) => d.key === day.key)) return album;
  const next = [day, ...album];
  await save(ALBUM, next);
  return next;
}
