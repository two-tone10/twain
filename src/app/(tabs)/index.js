import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, StillSky } from '../../keep/ui';
import { drawConstellation, drawGhosts, drawStar, drawTrail, layout } from '../../keep/sky';
import { ALL_NAMES, dayNumber } from '../../keep/fun.mjs';
import { BASKET, DECK } from '../../keep/content.mjs';
import { fmtLeft, slowSnapshot } from '../../keep/modes.mjs';
import { loadDailies, loadMyName, loadNamed, loadSkies, loadSlow } from '../../lib/storage';
import { commonsOn, myMatches } from '../../lib/together';
import { deckNow, loadOnboarded } from '../../lib/prefs';
import { C, F, R, S } from '../../lib/theme';

const MODES = [
  ['◷', 'Slow', '/slow'],
  ['◐', 'Drift', '/drift'],
  ['⇄', 'Match', '/match'],
  ['◎', 'Circles', '/circles'],
];

export default function Play() {
  const [skies, setSkies] = useState([]);
  const [slow, setSlow] = useState(null);
  const [named, setNamed] = useState(0);
  const [doneToday, setDoneToday] = useState(false);
  const [now, setNow] = useState(0);
  const [deck, setDeckName] = useState(deckNow());
  const [me, setMe] = useState('');
  const [waiting, setWaiting] = useState(0);

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
      loadMyName().then(setMe);
      // Drops friends sent you that you haven't played yet.
      if (commonsOn) myMatches().then((vs) => setWaiting((vs ?? []).filter((v) => v && !v.mine && !v.expired).length));
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
            <Text style={styles.topT}>✦ {named}<Text style={{ color: C.faint }}>/{ALL_NAMES}</Text>{day ? `   DAILY #${day} ${doneToday ? '✓' : '· READY'}` : ''}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="You: settings and your data" onPress={() => router.push('/settings')} hitSlop={10} style={styles.you}>
            <Text style={styles.youT}>{me.trim() ? me.trim()[0].toUpperCase() : '◦'}</Text>
          </Pressable>
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
              <Pressable key={label} accessibilityRole="button" accessibilityLabel={label === 'Match' && waiting ? `Match, ${waiting} waiting for you` : label} onPress={() => router.push(to)} style={styles.mode}>
                <View style={styles.icon}>
                  <Text style={styles.glyph}>{g}</Text>
                  {label === 'Match' && waiting > 0 ? <View style={styles.badge} /> : null}
                </View>
                <Text style={styles.modeT}>{label.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Deck: ${DECK[deck].name}`} onPress={() => router.push('/decks')} style={styles.alt}>
            <Text style={styles.deckT}>{DECK[deck].name.toUpperCase()} DECK ›</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.sky0 },
  wrap: { flex: 1, paddingHorizontal: S.lg, paddingBottom: S.sm, gap: S.sm },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: S.sm },
  you: { width: 34, height: 34, borderRadius: R.full, borderWidth: 1, borderColor: C.gold, alignItems: 'center', justifyContent: 'center' },
  youT: { fontFamily: F.serifRegular, fontSize: 17, color: C.gold },
  badge: { position: 'absolute', top: 2, right: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: C.gold, borderWidth: 2, borderColor: C.sky0 },
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
