import { ScrollView, StyleSheet, Text } from 'react-native';
import { C, S, serif } from '../lib/theme';
import { Clues } from './Clues';
import { PerspectiveCards, Waiting, cap } from './Pick';
import { Eyebrow } from './ui';

export function Guess({ state, seat, dispatch, them, label }) {
  if (state.guesses[seat]) return <Waiting title={`Waiting for ${them} to guess…`} />;
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Eyebrow>{label ? `${label} · the guess` : 'The guess'}</Eyebrow>
      <Text style={styles.title}>Which side did {them} play?</Text>
      <Text style={styles.sub}>Five rounds of clues. {cap(them)} could have picked the same side as you.</Text>
      <Clues state={state} seat={seat} them={them} />
      <PerspectiveCards onPick={(p) => dispatch({ type: 'guess', perspective: p })} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: S.lg, gap: S.md, paddingBottom: S.xl * 2, maxWidth: 560, width: '100%', alignSelf: 'center' },
  title: { fontFamily: serif, fontSize: 32, color: C.ink, fontWeight: '600' },
  sub: { fontSize: 15, color: C.muted, marginTop: -S.sm },
});
