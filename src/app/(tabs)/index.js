import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, StillSky } from '../../keep/ui';
import { drawGhosts, drawConstellation, layout } from '../../keep/sky';
import { BASKET, DECK } from '../../keep/content.mjs';
import { fmtLeft, slowSnapshot } from '../../keep/modes.mjs';
import { loadSkies, loadSlow } from '../../lib/storage';
import { deckNow, loadOnboarded } from '../../lib/prefs';
import { C, F, S } from '../../lib/theme';

export default function Play() {
  const [skies, setSkies] = useState([]);
  const [slow, setSlow] = useState(null);
  const [now, setNow] = useState(0);
  const [deck, setDeckName] = useState(deckNow());

  // First launch goes through the three stars.
  useEffect(() => { loadOnboarded().then((done) => { if (!done) router.push('/welcome'); }); }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30e3);
    return () => clearInterval(id);
  }, []);
  useFocusEffect(
    useCallback(() => {
      setNow(Date.now());
      setDeckName(deckNow());
      loadSkies().then(setSkies);
      loadSlow().then(setSlow);
    }, []),
  );

  const snap = slow && !slow.recorded && now ? slowSnapshot(slow, now, BASKET) : null;
  const slowLine = !snap ? 'Or a slow drop, all day ›'
    : snap.done ? 'Your slow drop is done. See how it went ›'
    : `Slow drop · ${slow.kept.length} of ${BASKET} kept · ${snap.live.length ? `${snap.live.length} falling now` : `next in ${fmtLeft(snap.next.spawnAt - now)}`} ›`;

  return (
    <View style={styles.root}>
      <StillSky
        version={skies.length}
        draw={(c, w, h) => {
          if (!skies.length) return;
          const box = { x: 24, y: h * 0.1, w: w - 48, h: h * 0.22 };
          drawGhosts(c, skies.slice(0, -1), box);
          const last = skies[skies.length - 1];
          drawConstellation(c, last, layout(last, box), { alpha: 0.55, labels: false });
        }}
      />
      <SafeAreaView edges={['top']} style={styles.wrap}>
        <View style={{ flex: 1 }} />
        <Text style={styles.title}>
          Keep<Text style={{ color: C.gold }}>.</Text>
        </Text>
        <Text style={styles.tag}>Moments fall like stars. Tap the ones you’d keep. Your sky holds five.</Text>
        <Text style={styles.hint}>Don’t think. It gets faster.</Text>
        <View style={{ flex: 1 }} />
        <View style={{ gap: S.sm + 2 }}>
          <Button label="Drop" onPress={() => router.push('/play')} />
          <View style={{ flexDirection: 'row', gap: S.sm + 2 }}>
            <Button ghost label="Drift" onPress={() => router.push('/drift')} style={{ flex: 1 }} />
            <Button ghost label="Duel" onPress={() => router.push('/duel')} style={{ flex: 1 }} />
          </View>
          <Button ghost label="Pass it around · 2–6 players" onPress={() => router.push('/pass')} />
          <Pressable accessibilityRole="button" onPress={() => router.push('/slow')} style={styles.slow}>
            <Text style={[styles.slowText, snap && !snap.done && { color: C.gold }]}>{slowLine}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Deck: ${DECK[deck].name}. Change`} onPress={() => router.push('/decks')} style={styles.deck}>
            <Text style={styles.deckText}>DECK · <Text style={{ color: C.gold }}>{DECK[deck].name.toUpperCase()}</Text></Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.sky0 },
  wrap: { flex: 1, paddingHorizontal: S.lg, gap: S.sm },
  title: { fontFamily: F.serifRegular, fontSize: 76, lineHeight: 84, color: C.ink },
  tag: { fontFamily: F.sans, fontSize: 17, lineHeight: 24, color: C.dim, maxWidth: 300 },
  hint: { fontFamily: F.sans, fontSize: 15, color: C.faint },
  slow: { alignItems: 'center', paddingVertical: 10 },
  slowText: { fontFamily: F.sans, fontSize: 14, color: C.dim },
  deck: { alignItems: 'center', paddingBottom: 10 },
  deckText: { fontFamily: F.sansMedium, fontSize: 10, letterSpacing: 2.5, color: C.faint },
});
