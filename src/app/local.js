import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Intro } from '../components/Intro';
import { Reveal } from '../components/Reveal';
import { Table } from '../components/Table';
import { newGame, reduce } from '../game/engine.mjs';
import { useAlbumSave } from '../lib/useAlbumSave';
import { C } from '../lib/theme';

export default function Local() {
  const [state, setState] = useState(() => newGame(Math.floor(Math.random() * 2 ** 31)));
  const [seen, setSeen] = useState(null);
  const viewer = state.turn;
  const view = `${state.round}:${viewer}`;
  useAlbumSave(state, 'both');

  useEffect(() => {
    if (state.phase === 'reveal') setSeen(null);
  }, [state.phase]);

  const dispatch = (action) => setState((s) => reduce(s, viewer, action));

  let body;
  if (state.phase === 'reveal') {
    body = <Reveal state={state} onNext={() => dispatch({ type: 'next' })} />;
  } else if (seen !== view) {
    body = <Intro local role={viewer} round={state.round} onGo={() => setSeen(view)} />;
  } else {
    body = <Table local state={state} role={viewer} dispatch={dispatch} />;
  }
  return <SafeAreaView style={styles.safe}>{body}</SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: C.bg } });
