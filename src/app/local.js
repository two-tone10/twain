import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Guess } from '../components/Guess';
import { Handover, seatName } from '../components/Handover';
import { Pick } from '../components/Pick';
import { Reveal } from '../components/Reveal';
import { Table } from '../components/Table';
import { due, newGame, reduce } from '../game/engine.mjs';
import { useAlbumSave } from '../lib/useAlbumSave';
import { C } from '../lib/theme';

const other = (seat) => seatName(seat === 'a' ? 'b' : 'a');

export default function Local() {
  const [state, setState] = useState(() => newGame(Math.floor(Math.random() * 2 ** 31)));
  const [holder, setHolder] = useState(null);
  const viewer = due(state)[0] || null;
  useAlbumSave(state, null);

  const dispatch = (action) => setState((s) => reduce(s, viewer, action));
  const them = viewer ? other(viewer) : '';
  const label = viewer ? seatName(viewer) : '';

  let body;
  if (state.phase === 'reveal') {
    body = <Reveal state={state} names={{ a: 'Player 1', b: 'Player 2' }} onAgain={() => setState((s) => reduce(s, 'a', { type: 'again' }))} />;
  } else if (viewer !== holder) {
    body = <Handover seat={viewer} onGo={() => setHolder(viewer)} />;
  } else if (state.phase === 'pick') {
    body = <Pick label={label} them={them} onPick={(p) => dispatch({ type: 'pick', perspective: p })} />;
  } else if (state.phase === 'guess') {
    body = <Guess state={state} seat={viewer} dispatch={dispatch} them={them} label={label} />;
  } else {
    body = <Table state={state} seat={viewer} dispatch={dispatch} them={them} />;
  }
  return <SafeAreaView style={styles.safe}>{body}</SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: C.bg } });
