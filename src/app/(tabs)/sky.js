import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Canvas, Picture } from '@shopify/react-native-skia';
import { tally } from '../../keep/insight.mjs';
import { skyReadings } from '../../keep/modes.mjs';
import { saidVsGrabbed, triad } from '../../keep/readings.mjs';
import { WHY, poolFor } from '../../keep/content.mjs';
import { drawConstellation, layout, record, useSkyFonts } from '../../keep/sky';
import { Button, Eyebrow, Reading, StillSky, WhyChip } from '../../keep/ui';
import { addToList, loadHolds, loadList, loadRounds, loadSkies } from '../../lib/storage';
import { deckNow, loadSaid } from '../../lib/prefs';
import { C, F, R, S } from '../../lib/theme';

export default function Sky() {
  const { width: W } = useWindowDimensions();
  const fonts = useSkyFonts();
  const [data, setData] = useState(null);
  const [offered, setOffered] = useState(null);

  useFocusEffect(
    useCallback(() => {
      setOffered(null);
      Promise.all([loadSkies(), loadRounds(), loadHolds(), loadList(), loadSaid()]).then(([skies, rounds, holds, list, said]) => setData({ skies, rounds, holds, list, said, now: Date.now() }));
    }, []),
  );

  const chartH = 260;
  // Every constellation you've kept, laid over each other like a star chart. Older ones fade back.
  const chart = useMemo(() => {
    if (!fonts || !data?.skies.length) return null;
    const box = { x: S.lg, y: 26, w: W - 2 * S.lg, h: chartH - 52 };
    const n = data.skies.length;
    return record(W, chartH, (c) => {
      data.skies.forEach((items, i) => {
        const last = i === n - 1;
        drawConstellation(c, items, layout(items, box), { box, font: last ? fonts.small : null, labels: last, alpha: last ? 1 : 0.12 + 0.35 * (i / n), bright: last });
      });
    });
  }, [fonts, data, W]);

  // Reach · do · glad: three small constellations side by side.
  const tri = useMemo(() => (data ? triad({ rounds: data.rounds, list: data.list, pool: poolFor(deckNow()), now: data.now }) : null), [data]);
  const triW = W - 2 * S.lg, triH = 96;
  const minis = useMemo(() => {
    if (!tri || !(tri.reach || tri.do || tri.glad)) return null;
    const cw = triW / 3;
    return record(triW, triH, (c) => {
      [tri.reach, tri.do, tri.glad].forEach((part, i) => {
        if (!part) return;
        const box = { x: i * cw + 10, y: 12, w: cw - 20, h: triH - 24 };
        const pts = part.items.map((m, j) => ({ x: box.x + box.w * ((j + 0.5) / part.items.length), y: box.y + box.h * [0.3, 0.75, 0.15, 0.6, 0.9, 0.4][j % 6] }));
        drawConstellation(c, part.items, pts, { labels: false });
      });
    });
  }, [tri, triW]);

  if (!data) return <View style={styles.root} />;
  const r = skyReadings(data);
  const svg = saidVsGrabbed(data.said, data.rounds);
  const addOffer = async () => { await addToList([tri.offer]); Haptics.selectionAsync(); setOffered(tri.offer.t); };
  const counts = tally(data.rounds);
  const blocks = [
    ['What you hold', r.hold?.line, 'Play Drift to see what you won’t let fade.'],
  ];
  const parts = [['Reach', tri.reach], ['Do', tri.do], ['Glad', tri.glad]];

  return (
    <View style={styles.root}>
      <StillSky />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.wrap}>
          <Eyebrow>Your sky · {data.skies.length} constellation{data.skies.length === 1 ? '' : 's'}</Eyebrow>
          {chart ? (
            <Canvas style={{ width: W, height: chartH, marginHorizontal: -S.lg }}>
              <Picture picture={chart} />
            </Canvas>
          ) : (
            <Text style={styles.empty}>Your sky is empty for now. Every drop you play adds a constellation here.</Text>
          )}

          {svg && (
            <View style={styles.block}>
              <Eyebrow>What you said · what you grab</Eyebrow>
              {svg.left ? (
                <Text style={styles.empty}>You said {WHY[svg.said[0]].name.toLowerCase()} and {WHY[svg.said[1]].name.toLowerCase()}. {svg.left} more drop{svg.left === 1 ? '' : 's'} and Keep will show you what your thumb says.</Text>
              ) : (
                <Reading line={svg.line} style={styles.big} />
              )}
            </View>
          )}

          <View style={styles.gap}>
            <Eyebrow>Three answers</Eyebrow>
            {minis && (
              <Canvas style={{ width: triW, height: triH }}>
                <Picture picture={minis} />
              </Canvas>
            )}
            <View style={styles.trio}>
              {parts.map(([label, part]) => (
                <View key={label} style={styles.trioCol}>
                  <Text style={styles.trioLabel}>{label.toUpperCase()}</Text>
                  {part ? <WhyChip k={part.k} /> : <Text style={styles.trioEmpty}>not yet</Text>}
                </View>
              ))}
            </View>
            {tri.line ? <Reading line={tri.line} style={styles.big} /> : (
              <Text style={styles.empty}>Reach is what you grab fastest. Do is what you tick off your list. Glad is what you’re glad you did. These fill in as you play and check back.</Text>
            )}
            {tri.offer && (offered ? (
              <Text style={styles.empty}>Added <Text style={{ color: C.gold }}>{offered.toLowerCase()}</Text> to your list.</Text>
            ) : (
              <Button small label={`Add “${tri.offer.t}”`} onPress={addOffer} />
            ))}
          </View>

          {r.gap && !tri.line && (
            <View style={styles.block}>
              <Eyebrow>Where they differ</Eyebrow>
              <Reading line={r.gap} />
            </View>
          )}

          {blocks.map(([label, line, empty]) => (
            <View key={label} style={styles.block}>
              <Eyebrow>{label}</Eyebrow>
              {line ? <Reading line={line} /> : <Text style={styles.empty}>{empty}</Text>}
            </View>
          ))}

          {r.nudge && (
            <View style={styles.block}>
              <Eyebrow>Waiting for you</Eyebrow>
              <Reading line={r.nudge} />
            </View>
          )}

          {counts.length > 0 && (
            <View style={styles.block}>
              <Eyebrow>Everything you’ve kept</Eyebrow>
              <View style={styles.tally}>
                {counts.map(([k, n]) => (
                  <View key={k} style={styles.tallyItem}>
                    <WhyChip k={k} />
                    <Text style={styles.tallyN}>{n}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.note}>No why counts for more than another. These are just the ones you reached for.</Text>
            </View>
          )}

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.sky0 },
  wrap: { paddingHorizontal: S.lg, paddingVertical: S.md, gap: S.md },
  gap: { gap: 8, padding: S.md, borderRadius: R.xl, borderWidth: 1, borderColor: 'rgba(216,180,106,0.45)', backgroundColor: 'rgba(20,25,56,0.8)' },
  big: { fontSize: 21, lineHeight: 29 },
  block: { gap: 8, borderTopWidth: 1, borderTopColor: C.line, paddingTop: S.md },
  empty: { fontFamily: F.sans, fontSize: 14, lineHeight: 20, color: C.faint },
  tally: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tallyItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 10, borderRadius: R.full, borderWidth: 1, borderColor: C.line },
  tallyN: { fontFamily: F.sansMedium, fontSize: 12, color: C.ink },
  note: { fontFamily: F.sans, fontSize: 12, color: C.faint },
  trio: { flexDirection: 'row' },
  trioCol: { flex: 1, alignItems: 'center', gap: 4 },
  trioLabel: { fontFamily: F.sansMedium, fontSize: 9, letterSpacing: 2.5, color: C.faint },
  trioEmpty: { fontFamily: F.serifItalic, fontSize: 12, color: C.faint },
});
