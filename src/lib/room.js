import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';
import { clientId, load, save } from './storage';
import { newGame, reduce } from '../game/engine.mjs';

const LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ';

export function newCode() {
  return Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join('');
}

export async function createRoom() {
  const code = newCode();
  const seed = Math.floor(Math.random() * 2 ** 31);
  await save(`twain:host:${code}`, newGame(seed));
  return code;
}

// Host-authoritative room over a Supabase Realtime broadcast channel.
// Nothing is written to the database; the host's device holds the game.
export function useRoom(code) {
  const [me, setMe] = useState(null);
  const [isHost, setIsHost] = useState(null);
  const [state, setState] = useState(null);
  const [partnerHere, setPartnerHere] = useState(false);
  const [full, setFull] = useState(false);
  const [online, setOnline] = useState(false);
  const stateRef = useRef(null);
  const pendingRef = useRef([]);
  const channelRef = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const id = await clientId();
      const hosted = await load(`twain:host:${code}`);
      if (!alive) return;
      setMe(id);
      setIsHost(Boolean(hosted));
      if (hosted) {
        stateRef.current = hosted;
        setState(hosted);
      }
    })();
    return () => {
      alive = false;
    };
  }, [code]);

  const commit = useCallback(
    (next) => {
      stateRef.current = next;
      setState(next);
      save(`twain:host:${code}`, next);
      channelRef.current?.send({ type: 'broadcast', event: 'state', payload: next });
    },
    [code],
  );

  useEffect(() => {
    if (!supabase || !me || isHost === null) return;
    const channel = supabase.channel(`twain:${code}`, {
      config: { broadcast: { self: false }, presence: { key: me } },
    });
    channelRef.current = channel;
    let hello = null;

    channel.on('presence', { event: 'sync' }, () => {
      const others = Object.keys(channel.presenceState()).filter((k) => k !== me);
      setPartnerHere(others.length > 0);
    });

    if (isHost) {
      channel.on('broadcast', { event: 'hello' }, ({ payload }) => {
        const cur = stateRef.current;
        if (!cur) return;
        if (cur.guestId && cur.guestId !== payload.from) {
          channel.send({ type: 'broadcast', event: 'full', payload: { to: payload.from } });
          return;
        }
        commit(cur.guestId ? cur : { ...cur, guestId: payload.from });
      });
      channel.on('broadcast', { event: 'intent' }, ({ payload }) => {
        const cur = stateRef.current;
        if (!cur || payload.from !== cur.guestId) return;
        commit(reduce(cur, 'b', payload.action));
      });
    } else {
      channel.on('broadcast', { event: 'state' }, ({ payload }) => {
        if (payload.guestId && payload.guestId !== me) {
          setFull(true);
          return;
        }
        let next = payload;
        pendingRef.current = pendingRef.current.filter((action) => {
          const applied = reduce(next, 'b', action);
          if (applied === next) return false;
          next = applied;
          return true;
        });
        stateRef.current = next;
        setState(next);
        if (payload.guestId === me && hello) {
          clearInterval(hello);
          hello = null;
        }
      });
      channel.on('broadcast', { event: 'full' }, ({ payload }) => {
        if (payload.to === me) setFull(true);
      });
    }

    channel.subscribe(async (status) => {
      setOnline(status === 'SUBSCRIBED');
      if (status !== 'SUBSCRIBED') return;
      await channel.track({ host: isHost });
      if (isHost) {
        if (stateRef.current) channel.send({ type: 'broadcast', event: 'state', payload: stateRef.current });
      } else {
        const ping = () => channel.send({ type: 'broadcast', event: 'hello', payload: { from: me } });
        ping();
        if (hello) clearInterval(hello);
        hello = setInterval(ping, 2000);
      }
    });

    return () => {
      if (hello) clearInterval(hello);
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [code, me, isHost, commit]);

  const seat = isHost === null ? null : isHost ? 'a' : 'b';

  const dispatch = useCallback(
    (action) => {
      const cur = stateRef.current;
      if (!cur) return;
      if (isHost) {
        commit(reduce(cur, 'a', action));
      } else {
        const guess = reduce(cur, 'b', action);
        if (guess !== cur && action.type !== 'say') pendingRef.current = [...pendingRef.current, action];
        stateRef.current = guess;
        setState(guess);
        channelRef.current?.send({ type: 'broadcast', event: 'intent', payload: { from: me, action } });
      }
    },
    [isHost, commit, me],
  );

  return { state, seat, isHost, partnerHere, full, online, dispatch, configured: Boolean(supabase) };
}
