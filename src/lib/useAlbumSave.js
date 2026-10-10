import { useEffect } from 'react';
import { score } from '../game/engine.mjs';
import { addToAlbum } from './storage';

export function useAlbumSave(state, seat) {
  useEffect(() => {
    if (!state || state.phase !== 'reveal') return;
    const s = score(state);
    if (!s.win) return;
    addToAlbum({ key: `${state.seed}`, at: Date.now(), board: state.board, role: seat ? state.picks[seat] : null, picks: state.picks, full: s.full });
    // Save once per finished round, not on every state change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.phase, state?.seed]);
}
