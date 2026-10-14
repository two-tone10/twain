// The commons: anonymous counts of what everyone keeps, the board, and stars players add.
// Contract: docs/commons-api.md. Switched off until the backend's URL and key are set in EAS env.
import { load, save } from './storage';

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

// Every star that fell this round, kept or not. Fire and forget.
export async function logRound({ mode, deck, day = null, kept = [], gone = [] }) {
  if (!commonsOn) return;
  try {
    const stars = [...kept.map((m) => ({ t: m.t, k: m.k, kept: true, dwell: m.dwell ?? null })), ...gone.filter((m) => !m.thrown).map((m) => ({ t: m.t, k: m.k, kept: false, dwell: null }))].slice(0, 30);
    await rpc('log_round', { p: { device: await deviceId(), mode, deck, day, stars } });
  } catch {}
}

export async function dailyStats(day) {
  try { return (await rpc('daily_stats', { p_day: day })) ?? []; } catch { return []; }
}

export async function commonsBoard() {
  try { return await rpc('commons_board', {}); } catch { return null; }
}

export async function submitStar({ t, k, deck = 'everyday' }) {
  if (!commonsOn) return { ok: false, reason: 'offline' };
  try { return await rpc('submit_star', { p: { device: await deviceId(), t, k, deck } }); } catch { return { ok: false, reason: 'offline' }; }
}

// The star you added in the intro: sent once; if the phone was offline, tried again on the next launch.
export const holdStar = (star) => save('keep:pendingstar', star);
export async function sendHeldStar() {
  const star = await load('keep:pendingstar', null);
  if (!star) return null;
  const r = await submitStar(star);
  if (r?.ok || (r?.reason && r.reason !== 'offline')) await save('keep:pendingstar', null);
  return r;
}

// Stars from players, kept on the phone and brought up to date from the server's change feed:
// approved ones join, hidden or removed ones leave (built-in stars can be removed too), restored ones return.
// Stars this phone reported stay gone for it whatever happens.
export async function syncCommunity() {
  const c = await load('keep:stars', { since: '1970-01-01T00:00:00Z', items: [], gone: [] });
  const reported = await load('keep:reported', []);
  if (commonsOn) {
    try {
      const items = new Map(c.items.map((m) => [m.t, m]));
      const gone = new Set(c.gone);
      for (let page = 0; page < 20; page++) {
        const fresh = (await rpc('community_changes', { p_since: c.since })) ?? [];
        for (const m of fresh) {
          if (m.status === 'approved') { items.set(m.t, { t: m.t, k: m.k, d: 'community' }); gone.delete(m.t); }
          else if (m.status === 'restored') gone.delete(m.t);
          else { items.delete(m.t); gone.add(m.t); }
          c.since = m.changed_at;
        }
        if (fresh.length < 500) break;
      }
      c.items = [...items.values()];
      c.gone = [...gone];
      await save('keep:stars', c);
    } catch {}
  }
  return { items: c.items.filter((m) => !reported.includes(m.t)), gone: [...c.gone, ...reported] };
}

// A new id after the server forgets this phone, so nothing new links back to the old one.
export async function newDeviceId() {
  device = null;
  await save('keep:device', null);
  return deviceId();
}
