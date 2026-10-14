import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Field } from '../keep/field';
import { Outcome } from '../keep/outcome';
import { recordRound } from '../keep/records';
import { loadSkies } from '../lib/storage';
import { loadFirstStar, saveFirstStar } from '../lib/prefs';
import { C } from '../lib/theme';

export default function Play() {
  const [phase, setPhase] = useState('play');
  const [round, setRound] = useState(0);
  const [skies, setSkies] = useState(null);
  const [game, setGame] = useState(null);
  const [mine, setMine] = useState(undefined);

  useEffect(() => { loadSkies().then(setSkies); }, [round]);
  // The star from the intro falls once, in the first drop after it.
  useEffect(() => { loadFirstStar().then(setMine); }, []);

  const finished = async (g) => {
    if (mine) { setMine(null); saveFirstStar(null); }
    const extra = await recordRound(g);
    setGame({ ...g, ...extra });
    setPhase('done');
  };
  const again = () => { setRound((r) => r + 1); setPhase('play'); };

  if (phase === 'done') return <Outcome key={round} g={game} onAgain={again} />;
  return skies && mine !== undefined ? <Field key={round} skies={skies} mine={mine} onDone={finished} /> : <View style={styles.root} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.sky0 },
});
