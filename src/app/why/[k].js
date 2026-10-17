// One why's page: what it means, your history with it, and a few moments to try.
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Canvas, Picture } from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';
import { WHY, poolFor } from '../../keep/content.mjs';
import { whyStats } from '../../keep/readings.mjs';
import { drawConstellation, record, useSkyFonts } from '../../keep/sky';
import { Button, Eyebrow, StillSky, goHome } from '../../keep/ui';
import { addToList, loadHolds, loadList, loadRounds } from '../../lib/storage';
import { deckNow } from '../../lib/prefs';
import { C, F, S } from '../../lib/theme';

export default function Why() {
  const { k } = useLocalSearchParams();
  const w = WHY[k] ?? WHY.delight;
  const { width: W } = useWindowDimensions();
  const fonts = useSkyFonts();
  const [data, setData] = useState(null);
  const [added, setAdded] = useState([]);

  useFocusEffect(useCallback(() => {
    Promise.all([loadRounds(), loadHolds(), loadList()]).then(([rounds, holds, list]) => setData({ rounds, holds, list }));
  }, []));

  const s = useMemo(() => (data ? whyStats(w.key, data) : null), [data, w.key]);
  const H = 120;
  const pic = useMemo(() => {
    if (!fonts || !s?.mine.length) return null;
    const box = { x: S.lg, y: 18, w: W - 2 * S.lg, h: H - 40 };
    // Spread your moments across the strip, since they'd all sit in the same column of the big sky.
    const pts = s.mine.map((m, i) => ({ x: box.x + box.w * ((i + 0.5) / s.mine.length), y: box.y + box.h * (i % 2 ? 0.25 : 0.7) }));
    return record(W, H, (c) => drawConstellation(c, s.mine, pts, { font: fonts.small, box, bright: true }));
  }, [fonts, s, W]);

  if (!s) return <View style={styles.root} />;
  const onList = new Set([...data.list.map((it) => it.t), ...added]);
  const tries = poolFor(deckNow())[w.key].filter((t) => !onList.has(t)).slice(0, 3);
  const add = async (t) => { await addToList([{ t, k: w.key }]); Haptics.selectionAsync(); setAdded((a) => [...a, t]); };
  const rows = [
    ['Grabbed in a drop', s.grabbed ? `${s.grabbed} time${s.grabbed === 1 ? '' : 's'}${s.firsts ? ` · first ${s.firsts}×` : ''}` : '—'],
    ['Held in Drift', s.held ? `${s.held} time${s.held === 1 ? '' : 's'}` : '—'],
    ['Done from your list', s.done || '—'],
    ['Glad you did', s.asked ? `${s.glad} of ${s.asked}` : '—'],
  ];

  return (
    <View style={styles.root}>
      <StillSky />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.wrap}>
          <Eyebrow>Your seven</Eyebrow>
          <Text style={[styles.h1, { color: w.color }]}>{w.name}</Text>
          <Text style={styles.about}>{w.about}</Text>
          {pic && (
            <Canvas style={{ width: W, height: H, marginHorizontal: -S.lg }}>
              <Picture picture={pic} />
            </Canvas>
          )}
          <View>
            {rows.map(([label, v]) => (
              <View key={label} style={styles.stat}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.v}>{v}</Text>
              </View>
            ))}
          </View>
          {s.line && <Text style={styles.line}>{s.line}</Text>}
          {tries.length > 0 && (
            <View style={styles.block}>
              <Eyebrow>Try one this week</Eyebrow>
              {tries.map((t) => (
                <Pressable key={t} accessibilityRole="button" accessibilityLabel={`Add ${t} to your list`} onPress={() => add(t)} style={styles.try}>
                  <Text style={styles.tryText}>{t}</Text>
                  <Text style={styles.plus}>Add</Text>
                </Pressable>
              ))}
            </View>
          )}
          {added.length > 0 && <Text style={styles.note}>Added to your list.</Text>}
          <Text style={styles.note}>No pull counts for more than another.</Text>
          <Button ghost label="Back" onPress={goHome} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.sky0 },
  wrap: { paddingHorizontal: S.lg, paddingVertical: S.md, gap: S.md },
  h1: { fontFamily: F.serifRegular, fontSize: 48, lineHeight: 54 },
  about: { fontFamily: F.serifRegular, fontSize: 19, lineHeight: 26, color: C.ink },
  stat: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.line },
  label: { fontFamily: F.sans, fontSize: 14, color: C.dim },
  v: { fontFamily: F.sansMedium, fontSize: 14, color: C.ink, fontVariant: ['tabular-nums'] },
  line: { fontFamily: F.accent, fontSize: 18, lineHeight: 25, color: C.gold },
  block: { gap: 2, borderTopWidth: 1, borderTopColor: C.line, paddingTop: S.md },
  try: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, gap: 12 },
  tryText: { flex: 1, fontFamily: F.serif, fontSize: 17, color: C.ink },
  plus: { fontFamily: F.sansMedium, fontSize: 12, letterSpacing: 2, color: C.gold, textTransform: 'uppercase' },
  note: { fontFamily: F.sans, fontSize: 12, color: C.faint },
});
