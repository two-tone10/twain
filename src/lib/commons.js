// The commons: anonymous counts of what everyone keeps, the board, and stars players add.
// Contract: docs/commons-api.md. Switched off until the backend's URL and key are set in EAS env.
import { load, save } from './storage';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export const commonsOn = !!(URL && KEY);

async function rpc(name, body) {
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
async function deviceId() {
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

// Approved community stars, cached on the phone; new ones fetched since the last sync.
export async function syncCommunity() {
  const cached = await load('keep:community', { since: '1970-01-01T00:00:00Z', items: [] });
  if (!commonsOn) return cached.items;
  try {
    const fresh = (await rpc('community_moments', { p_since: cached.since })) ?? [];
    if (fresh.length) {
      const seen = new Set(cached.items.map((m) => m.t));
      const items = [...cached.items, ...fresh.filter((m) => !seen.has(m.t)).map(({ t, k }) => ({ t, k, d: 'community' }))];
      const since = fresh.reduce((a, m) => (m.approved_at > a ? m.approved_at : a), cached.since);
      await save('keep:community', { since, items });
      return items;
    }
  } catch {}
  return cached.items;
}
