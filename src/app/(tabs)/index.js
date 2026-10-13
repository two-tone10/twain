import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, StillSky } from '../../keep/ui';
import { drawConstellation, drawGhosts, drawStar, drawTrail, layout } from '../../keep/sky';
import { ALL_NAMES, dayNumber } from '../../keep/fun.mjs';
import { BASKET, DECK } from '../../keep/content.mjs';
import { fmtLeft, slowSnapshot } from '../../keep/modes.mjs';
import { loadDailies, loadNamed, loadSkies, loadSlow } from '../../lib/storage';
import { deckNow, loadOnboarded } from '../../lib/prefs';
import { C, F, R, S } from '../../lib/theme';

const MODES = [
  ['◷', 'Slow', '/slow'],
  ['◐', 'Drift', '/drift'],
  ['⇄', 'Duel', '/duel'],
  ['◎', 'Pass', '/pass'],
];

export default function Play() {
  const [skies, setSkies] = useState([]);
  const [slow, setSlow] = useState(null);
  const [named, setNamed] = useState(0);
  const [doneToday, setDoneToday] = useState(false);
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
      loadNamed().then((n) => setNamed(Object.keys(n).length));
      loadDailies().then((d) => setDoneToday(!!d[dayNumber()]));
    }, []),
  );

  const day = now ? dayNumber(now) : null;
  const snap = slow && !slow.recorded && now ? slowSnapshot(slow, now, BASKET) : null;
  const slowLine = snap && (snap.done ? 'Slow drop done ›' : `Slow drop · ${slow.kept.length}/${BASKET} · ${snap.live.length ? `${snap.live.length} falling` : `next ${fmtLeft(snap.next.spawnAt - now)}`} ›`);

  return (
    <View style={styles.root}>
      <StillSky
        version={skies.length}
        draw={(c, w, h) => {
          const box = { x: 24, y: h * 0.14, w: w - 48, h: h * 0.24 };
          if (skies.length) {
            drawGhosts(c, skies.slice(0, -1), box);
            const last = skies[skies.length - 1];
            drawConstellation(c, last, layout(last, box), { alpha: 0.5, labels: false });
          }
          // A comet, for the look of the thing.
          const trail = Array.from({ length: 22 }, (_, i) => [w * 0.74 + i * 5, h * 0.5 - i * 4]);
          drawTrail(c, trail, 0.8);
          drawStar(c, w * 0.74, h * 0.5, 4, 1, true);
        }}
      />
      <SafeAreaView edges={['top']} style={styles.wrap}>
        <View style={styles.top}>
          <Pressable accessibilityRole="button" accessibilityLabel={`${named} of ${ALL_NAMES} skies named`} onPress={() => router.navigate('/kept')} hitSlop={8}>
            <Text style={styles.topT}>✦ {named}<Text style={{ color: C.faint }}>/{ALL_NAMES}</Text></Text>
          </Pressable>
          {day ? <Text style={styles.topT}>DAILY #{day} {doneToday ? '✓' : '· READY'}</Text> : null}
        </View>
        <View style={{ flex: 1 }} />
        <Text style={styles.title}>Keep<Text style={{ color: C.gold }}>.</Text></Text>
        <Text style={styles.tag}>Catch what you’d keep.</Text>
        <View style={{ flex: 1 }} />
        <View style={{ gap: S.md }}>
          {doneToday ? (
            <Button label="Drop" onPress={() => router.push('/play')} />
          ) : (
            <Button label="Today’s drop" onPress={() => router.push('/daily')} />
          )}
          <Pressable accessibilityRole="button" onPress={() => router.push(doneToday ? '/daily' : '/play')} style={styles.alt}>
            <Text style={styles.altT}>{doneToday ? 'Today’s drop ✓  ·  send it ›' : 'or a free drop ›'}</Text>
          </Pressable>
          {slowLine ? (
            <Pressable accessibilityRole="button" onPress={() => router.push('/slow')} style={styles.alt}>
              <Text style={[styles.altT, { color: C.gold }]}>{slowLine}</Text>
            </Pressable>
          ) : null}
          <View style={styles.modes}>
            {MODES.map(([g, label, to]) => (
              <Pressable key={label} accessibilityRole="button" accessibilityLabel={label} onPress={() => router.push(to)} style={styles.mode}>
                <View style={styles.icon}><Text style={styles.glyph}>{g}</Text></View>
                <Text style={styles.modeT}>{label.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Settings. Deck: ${DECK[deck].name}`} onPress={() => router.push('/settings')} style={styles.alt}>
            <Text style={styles.deckT}>{DECK[deck].name.toUpperCase()} DECK  ·  SETTINGS</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.sky0 },
  wrap: { flex: 1, paddingHorizontal: S.lg, paddingBottom: S.sm, gap: S.sm },
  top: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: S.sm },
  topT: { fontFamily: F.sansMedium, fontSize: 11, letterSpacing: 2.5, color: C.gold },
  title: { fontFamily: F.serifRegular, fontSize: 84, lineHeight: 92, color: C.ink, textAlign: 'center' },
  tag: { fontFamily: F.sans, fontSize: 16, color: C.dim, textAlign: 'center' },
  alt: { alignItems: 'center', paddingVertical: 2 },
  altT: { fontFamily: F.sans, fontSize: 14, color: C.dim },
  modes: { flexDirection: 'row', justifyContent: 'space-around', marginTop: S.xs },
  mode: { alignItems: 'center', gap: 6, minWidth: 56 },
  icon: { width: 46, height: 46, borderRadius: R.full, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  glyph: { fontSize: 18, color: C.ink },
  modeT: { fontFamily: F.sansMedium, fontSize: 9, letterSpacing: 2, color: C.faint },
  deckT: { fontFamily: F.sansMedium, fontSize: 9, letterSpacing: 2.5, color: C.faint },
});
