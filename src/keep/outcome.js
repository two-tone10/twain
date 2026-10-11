// The end of a solo drop, fast or slow: the final cut, then what the round says about you.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Canvas, Picture } from '@shopify/react-native-skia';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { BASKET, CUT_MS } from './content.mjs';
import { cutPair, headline, soloLines, tally } from './insight.mjs';
import { drawConstellation, layout, record, useSkyFonts } from './sky';
import { Button, Eyebrow, goHome, Reading, StillSky, WhyChip } from './ui';
import { addToList, loadRounds } from '../lib/storage';
import { C, F, R, S } from '../lib/theme';

export function Outcome({ g, onAgain, againLabel = 'Drop again' }) {
  const [pair] = useState(() => cutPair(g.kept));
  const [keeper, setKeeper] = useState(undefined);
  if (pair && keeper === undefined) return <FinalCut pair={pair} onDone={setKeeper} />;
  return <Results g={{ ...g, pair, keeper: keeper ?? null }} onAgain={onAgain} againLabel={againLabel} />;
}

/* ---------------- final cut ---------------- */

function FinalCut({ pair, onDone }) {
  const [order] = useState(() => (Math.random() < 0.5 ? pair : [pair[1], pair[0]]));
  const [chosen, setChosen] = useState(undefined);
  const bar = useSharedValue(1);
  const barStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: bar.value }] }));

  const done = useRef(false);
  const pick = (m) => {
    if (done.current) return;
    done.current = true;
    setChosen(m);
    if (m) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => onDone(m), 800);
  };

  useEffect(() => {
    bar.set(withTiming(0, { duration: CUT_MS, easing: Easing.linear }));
    const t = setTimeout(() => pick(null), CUT_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.root}>
      <StillSky />
      <SafeAreaView style={styles.cutWrap}>
        <Eyebrow>Final cut</Eyebrow>
        <Text style={styles.h2}>
          Only one <Text style={{ color: C.gold, fontFamily: F.serifItalic }}>makes it.</Text>
        </Text>
        <Text style={styles.sub}>If the day only had room for one.</Text>
        <View style={{ flex: 1 }} />
        {order.map((m, i) => {
          const lost = chosen !== undefined && chosen !== m;
          return (
            <View key={m.t} style={{ gap: S.md }}>
              {i === 1 && <Text style={styles.or}>or</Text>}
              <Pressable accessibilityRole="button" onPress={() => pick(m)} style={[styles.cutCard, chosen === m && styles.cutWin, lost && styles.cutLose]}>
                <View style={styles.cutStar} />
                <Text style={styles.cutText}>{m.t}</Text>
              </Pressable>
            </View>
          );
        })}
        <View style={{ flex: 1 }} />
        <View style={styles.track}>
          <Animated.View style={[styles.fill, barStyle]} />
        </View>
      </SafeAreaView>
    </View>
  );
}

/* ---------------- results ---------------- */

function Results({ g, onAgain, againLabel }) {
  const { width: W } = useWindowDimensions();
  const fonts = useSkyFonts();
  const [rounds, setRounds] = useState([]);
  const order = g.keeper ? [g.keeper, ...g.kept.filter((m) => m !== g.keeper)] : g.kept;
  const [picks, setPicks] = useState(() => new Set(g.keeper ? [0] : []));
  const [added, setAdded] = useState(null);
  useEffect(() => { loadRounds().then(setRounds); }, []);

  const lines = soloLines({ kept: g.kept, gone: g.gone, swaps: g.swaps, pair: g.pair, keeper: g.keeper ?? null });
  const counts = tally(rounds);
  const heroH = 200;
  const hero = useMemo(() => {
    if (!fonts) return null;
    const box = { x: S.lg, y: 22, w: W - 2 * S.lg, h: heroH - 44 };
    return record(W, heroH, (c) => drawConstellation(c, g.kept, layout(g.kept, box), { font: fonts.small, box, bright: true }));
  }, [fonts, W, g.kept]);

  const toggle = (i) => setPicks((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; });
  const add = async () => {
    const items = [...picks].map((i) => order[i]);
    if (items.length) await addToList(items);
    setAdded(items);
  };

  return (
    <View style={styles.root}>
      <StillSky />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.results}>
          <Eyebrow>Your constellation · {g.kept.length} of {BASKET}</Eyebrow>
          {hero && g.kept.length > 0 && (
            <Canvas style={{ width: W, height: heroH, marginHorizontal: -S.lg, backgroundColor: 'transparent' }}>
              <Picture picture={hero} />
            </Canvas>
          )}
          <Text style={styles.h2}>{headline(g.kept)}</Text>
          <View style={{ gap: 10 }}>
            {lines.map((l, i) => <Reading key={i} line={l} />)}
          </View>

          <View>
            {order.map((m) => (
              <View key={m.t} style={styles.row}>
                <Text style={styles.rowText}>
                  {m.t}
                  {m === g.keeper && <Text style={styles.cutTag}>  FINAL CUT</Text>}
                </Text>
                <WhyChip k={m.k} />
              </View>
            ))}
          </View>

          {g.kept.length > 0 && added === null && (
            <View style={styles.bring}>
              <Eyebrow>Bring one into today?</Eyebrow>
              <Text style={styles.small}>Pick anything you might actually do. It waits on the home screen for a week.</Text>
              <View style={styles.picks}>
                {order.map((m, i) => (
                  <Pressable key={m.t} accessibilityRole="checkbox" accessibilityState={{ checked: picks.has(i) }} onPress={() => toggle(i)} style={[styles.pick, picks.has(i) && styles.pickOn]}>
                    <Text style={[styles.pickText, picks.has(i) && { color: C.ink }]}>{m.t}</Text>
                  </Pressable>
                ))}
              </View>
              <Button small ghost label={picks.size ? `Add ${picks.size} to today` : 'Not today'} onPress={add} />
            </View>
          )}
          {added?.length > 0 && (
            <View style={styles.bring}>
              <Eyebrow>On your list</Eyebrow>
              <Text style={styles.rowText}>{added.map((m) => m.t).join(' · ')}</Text>
              <Text style={styles.small}>It’s on the home screen. Tick it off if it happens.</Text>
            </View>
          )}

          {rounds.length > 1 && (
            <View style={styles.bring}>
              <Eyebrow>Across {rounds.length} rounds</Eyebrow>
              <View style={styles.picks}>
                {counts.map(([k, n]) => (
                  <View key={k} style={styles.tallyItem}>
                    <WhyChip k={k} />
                    <Text style={styles.tallyN}>{n}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: S.md }}>
            <Button ghost label="Home" onPress={() => goHome()} style={{ flex: 1 }} />
            {onAgain && <Button label={againLabel} onPress={onAgain} style={{ flex: 2 }} />}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.sky0 },
  quit: { position: 'absolute', right: 18, width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  quitText: { color: C.faint, fontSize: 16 },
  h2: { fontFamily: F.serifRegular, fontSize: 30, lineHeight: 35, color: C.ink },
  sub: { fontFamily: F.sans, fontSize: 15, color: C.dim },
  cutWrap: { flex: 1, paddingHorizontal: S.lg, paddingVertical: S.md, gap: S.sm },
  cutCard: { borderRadius: R.xl, borderWidth: 1, borderColor: 'rgba(255,230,166,0.35)', backgroundColor: 'rgba(20,25,56,0.8)', paddingVertical: 28, paddingHorizontal: S.md, alignItems: 'center', gap: 12 },
  cutWin: { borderColor: C.glow, shadowColor: C.glow, shadowOpacity: 0.6, shadowRadius: 18, transform: [{ scale: 1.03 }] },
  cutLose: { opacity: 0.15, transform: [{ scale: 0.95 }] },
  cutStar: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.star, shadowColor: C.glow, shadowOpacity: 1, shadowRadius: 8 },
  cutText: { fontFamily: F.serifRegular, fontSize: 27, lineHeight: 32, color: C.ink, textAlign: 'center' },
  or: { textAlign: 'center', fontFamily: F.serifItalic, color: C.faint, fontSize: 16 },
  track: { height: 3, borderRadius: 2, backgroundColor: C.line, overflow: 'hidden' },
  fill: { height: 3, backgroundColor: C.gold, width: '100%', transformOrigin: 'left' },
  results: { paddingHorizontal: S.lg, paddingVertical: S.md, gap: S.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  rowText: { flex: 1, fontFamily: F.serif, fontSize: 16, color: C.ink },
  cutTag: { fontFamily: F.sansMedium, fontSize: 9, letterSpacing: 2, color: C.gold },
  bring: { gap: 10, borderTopWidth: 1, borderTopColor: 'rgba(216,180,106,0.3)', paddingTop: S.md },
  small: { fontFamily: F.sans, fontSize: 13, color: C.faint },
  picks: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pick: { paddingVertical: 8, paddingHorizontal: 13, borderRadius: R.full, borderWidth: 1, borderColor: C.line },
  pickOn: { borderColor: C.gold, backgroundColor: 'rgba(216,180,106,0.12)' },
  pickText: { fontFamily: F.serif, fontSize: 15, color: C.dim },
  tallyItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 10, borderRadius: R.full, borderWidth: 1, borderColor: C.line },
  tallyN: { fontFamily: F.sansMedium, fontSize: 12, color: C.ink },
});

