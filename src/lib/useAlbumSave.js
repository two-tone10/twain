import { useEffect } from 'react';
import { score } from '../game/engine.mjs';
import { addToAlbum } from './storage';

export function useAlbumSave(state, role) {
  useEffect(() => {
    if (!state || state.phase !== 'reveal') return;
    const s = score(state);
    if (!s.win) return;
    addToAlbum({ key: `${state.seed}`, at: Date.now(), board: state.board, role, full: s.full });
  }, [state?.phase, state?.seed]);
}
