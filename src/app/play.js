import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Field } from '../keep/field';
import { Outcome } from '../keep/outcome';
import { recordRound } from '../keep/records';
import { loadSkies } from '../lib/storage';
import { C } from '../lib/theme';

export default function Play() {
  const [phase, setPhase] = useState('play');
  const [round, setRound] = useState(0);
  const [skies, setSkies] = useState(null);
  const [game, setGame] = useState(null);

  useEffect(() => { loadSkies().then(setSkies); }, [round]);

  const finished = async (g) => {
    const extra = await recordRound(g);
    setGame({ ...g, ...extra });
    setPhase('done');
  };
  const again = () => { setRound((r) => r + 1); setPhase('play'); };

  if (phase === 'done') return <Outcome key={round} g={game} onAgain={again} />;
  return skies ? <Field key={round} skies={skies} onDone={finished} /> : <View style={styles.root} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.sky0 },
});
