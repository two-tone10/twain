// The commons: anonymous counts of what everyone keeps, and the board. Nothing typed is ever sent.
// Contract: docs/commons-api.md. Switched off until the backend's URL and key are set in EAS env.
import { load, save } from './storage';
import { isOwn } from '../keep/content.mjs';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export const commonsOn = !!(URL && KEY);

export async function rpc(name, body) {
  if (!commonsOn) return null;
  const res = await fetch(`${URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${name} ${res.status}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// A random id made on this phone, so the server can rate-limit without knowing who anyone is.
let device = null;
export async function deviceId() {
  if (device) return device;
  device = await load('keep:device', null);
  if (!device) {
    const h = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
    device = `${h()}${h()}-${h()}-4${h().slice(1)}-${(8 + Math.floor(Math.random() * 4)).toString(16)}${h().slice(1)}-${h()}${h()}${h()}`;
    await save('keep:device', device);
  }
  return device;
}

// Every star that fell this round, kept or not, except your own stars. Fire and forget.
export async function logRound({ mode, deck, day = null, kept = [], gone = [] }) {
  if (!commonsOn) return;
  try {
    const shared = (m) => !isOwn(m.t);
    const stars = [...kept.filter(shared).map((m) => ({ t: m.t, k: m.k, kept: true, dwell: m.dwell ?? null })), ...gone.filter((m) => !m.thrown && shared(m)).map((m) => ({ t: m.t, k: m.k, kept: false, dwell: null }))].slice(0, 30);
    await rpc('log_round', { p: { device: await deviceId(), mode, deck, day, stars } });
  } catch {}
}

export async function dailyStats(day) {
  try { return (await rpc('daily_stats', { p_day: day })) ?? []; } catch { return []; }
}

export async function commonsBoard() {
  try { return await rpc('commons_board', {}); } catch { return null; }
}

// Built-in stars the moderator has taken down (or put back), from the server's change feed. They stop
// falling on every phone. Stars this phone reported earlier stay gone for it.
export async function syncGone() {
  const c = await load('keep:gone', { since: '1970-01-01T00:00:00Z', gone: [] });
  const reported = await load('keep:reported', []);
  if (commonsOn) {
    try {
      const gone = new Set(c.gone);
      for (let page = 0; page < 20; page++) {
        const fresh = (await rpc('community_changes', { p_since: c.since })) ?? [];
        for (const m of fresh) {
          if (m.status === 'hidden' || m.status === 'removed') gone.add(m.t); else gone.delete(m.t);
          c.since = m.changed_at;
        }
        if (fresh.length < 500) break;
      }
      c.gone = [...gone];
      await save('keep:gone', c);
    } catch {}
  }
  return [...c.gone, ...reported];
}

// A new id after the server forgets this phone, so nothing new links back to the old one.
export async function newDeviceId() {
  device = null;
  await save('keep:device', null);
  return deviceId();
}
