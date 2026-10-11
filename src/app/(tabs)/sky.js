import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Canvas, Picture } from '@shopify/react-native-skia';
import { tally } from '../../keep/insight.mjs';
import { skyReadings } from '../../keep/modes.mjs';
import { drawConstellation, layout, record, useSkyFonts } from '../../keep/sky';
import { Eyebrow, Reading, StillSky, WhyChip } from '../../keep/ui';
import { loadHolds, loadList, loadRounds, loadSkies } from '../../lib/storage';
import { C, F, R, S } from '../../lib/theme';

export default function Sky() {
  const { width: W } = useWindowDimensions();
  const fonts = useSkyFonts();
  const [data, setData] = useState(null);

  useFocusEffect(
    useCallback(() => {
      Promise.all([loadSkies(), loadRounds(), loadHolds(), loadList()]).then(([skies, rounds, holds, list]) => setData({ skies, rounds, holds, list }));
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

  if (!data) return <View style={styles.root} />;
  const r = skyReadings(data);
  const counts = tally(data.rounds);
  const blocks = [
    ['What you grab', r.grab?.line, 'Play a few drops and this fills in. It reads what you reach for fastest.'],
    ['What you hold', r.hold?.line, 'Play Drift to see what you won’t let fade.'],
    ['What you do', r.live?.line, 'Tick off a couple of moments from your list and this shows what you actually make time for.'],
  ];

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

          {r.gap && (
            <View style={styles.gap}>
              <Eyebrow>Where they differ</Eyebrow>
              <Reading line={r.gap} style={styles.big} />
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
});
