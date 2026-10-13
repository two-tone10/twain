// Sky: your sign up top, reach · do · glad as three words, then every constellation you've drawn.
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Canvas, Picture } from '@shopify/react-native-skia';
import { tally } from '../../keep/insight.mjs';
import { skyReadings } from '../../keep/modes.mjs';
import { saidVsGrabbed, triad } from '../../keep/readings.mjs';
import { SIGN_ROUNDS, signFor } from '../../keep/fun.mjs';
import { WHY, poolFor } from '../../keep/content.mjs';
import { shareCard } from '../../keep/share';
import { drawColored, drawConstellation, layout, record, useSkyFonts } from '../../keep/sky';
import { Button, Eyebrow, Reading, StillSky, WhyChip } from '../../keep/ui';
import { addToList, loadHolds, loadList, loadRounds, loadSkies } from '../../lib/storage';
import { deckNow, loadSaid } from '../../lib/prefs';
import { C, F, R, S } from '../../lib/theme';

export default function Sky() {
  const { width: W } = useWindowDimensions();
  const fonts = useSkyFonts();
  const [data, setData] = useState(null);
  const [offered, setOffered] = useState(null);
  const [open, setOpen] = useState(null);

  useFocusEffect(
    useCallback(() => {
      setOffered(null);
      Promise.all([loadSkies(), loadRounds(), loadHolds(), loadList(), loadSaid()]).then(([skies, rounds, holds, list, said]) => setData({ skies, rounds, holds, list, said, now: Date.now() }));
    }, []),
  );

  const sign = useMemo(() => (data ? signFor(data.rounds) : null), [data]);
  const signH = 150;
  // The sign as a small rising constellation in its why's color.
  const signPic = useMemo(() => {
    if (!sign?.k) return null;
    const w = W - 2 * S.lg;
    const pts = [[0.2, 0.82], [0.4, 0.58], [0.6, 0.45], [0.8, 0.18]].map(([x, y]) => ({ x: x * w, y: y * signH }));
    return record(w, signH, (c) => drawColored(c, pts, WHY[sign.k].color, 1));
  }, [sign, W]);

  const chartH = 240;
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

  const tri = useMemo(() => (data ? triad({ rounds: data.rounds, list: data.list, pool: poolFor(deckNow()), now: data.now }) : null), [data]);

  if (!data) return <View style={styles.root} />;
  const r = skyReadings(data);
  const svg = saidVsGrabbed(data.said, data.rounds);
  const counts = tally(data.rounds);
  const addOffer = async () => { await addToList([tri.offer]); Haptics.selectionAsync(); setOffered(tri.offer.t); };
  const shareSign = () => fonts && shareCard('sign', { k: sign.k, name: sign.name, line: sign.line }, fonts, `I’m ${sign.name} ✦ in Keep`).catch(() => {});
  const parts = [['Reach', tri.reach], ['Do', tri.do], ['Glad', tri.glad]];
  const played = SIGN_ROUNDS - (sign?.left ?? 0);

  return (
    <View style={styles.root}>
      <StillSky />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.wrap}>
          <Eyebrow>Your sign</Eyebrow>
          {sign?.k ? (
            <>
              {signPic && <Canvas style={{ width: W - 2 * S.lg, height: signH }}><Picture picture={signPic} /></Canvas>}
              <Text style={[styles.sign, { color: WHY[sign.k].color }]}>{sign.name}</Text>
              <Text style={styles.line}>{sign.line}</Text>
            </>
          ) : (
            <View style={styles.waiting}>
              <View style={styles.slots}>
                {Array.from({ length: SIGN_ROUNDS }, (_, i) => <View key={i} style={[styles.slot, i < played && styles.slotOn]} />)}
              </View>
              <Text style={styles.line}>Play {sign?.left ?? SIGN_ROUNDS} more drop{sign?.left === 1 ? '' : 's'} to find your sign.</Text>
            </View>
          )}

          <View style={styles.trio}>
            {parts.map(([label, part]) => (
              <Pressable key={label} accessibilityRole="button" disabled={!part} onPress={() => setOpen((o) => (o === label ? null : label))} style={styles.trioCol}>
                <Text style={styles.trioLabel}>{label.toUpperCase()}</Text>
                {part ? <Text style={[styles.trioWhy, { color: WHY[part.k].color }]}>{WHY[part.k].name}</Text> : <Text style={styles.trioEmpty}>—</Text>}
              </Pressable>
            ))}
          </View>
          {open && tri.line && <Reading line={tri.line} />}
          {tri.offer && !offered && (tri.line || open) ? <Button small ghost label={`Try “${tri.offer.t}”`} onPress={addOffer} /> : null}
          {offered && <Text style={styles.note}>On your list.</Text>}
          {sign?.k && <Button small ghost label="Share your sign" onPress={shareSign} />}

          {svg && !svg.left && (
            <View style={styles.block}>
              <Eyebrow>Said · grabbed</Eyebrow>
              <Reading line={svg.line} />
            </View>
          )}

          <View style={styles.block}>
            <Eyebrow>Every sky · {data.skies.length}</Eyebrow>
            {chart && (
              <Canvas style={{ width: W, height: chartH, marginHorizontal: -S.lg }}>
                <Picture picture={chart} />
              </Canvas>
            )}
            {counts.length > 0 && (
              <View style={styles.tally}>
                {counts.map(([k, n]) => (
                  <View key={k} style={styles.tallyItem}>
                    <WhyChip k={k} />
                    <Text style={styles.tallyN}>{n}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {(r.hold || r.nudge) && (
            <View style={styles.block}>
              {r.hold && <Reading line={r.hold.line} />}
              {r.nudge && <Reading line={r.nudge} />}
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
  sign: { fontFamily: F.serifRegular, fontSize: 48, lineHeight: 54, textAlign: 'center' },
  line: { fontFamily: F.serifItalic, fontSize: 18, color: C.dim, textAlign: 'center' },
  waiting: { alignItems: 'center', gap: 12, paddingVertical: S.lg },
  slots: { flexDirection: 'row', gap: 12 },
  slot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(239,230,214,0.4)', borderStyle: 'dashed' },
  slotOn: { backgroundColor: C.star, borderWidth: 0, shadowColor: C.glow, shadowOpacity: 1, shadowRadius: 5 },
  trio: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.line, paddingVertical: S.md },
  trioCol: { flex: 1, alignItems: 'center', gap: 4 },
  trioLabel: { fontFamily: F.sansMedium, fontSize: 9, letterSpacing: 2.5, color: C.faint },
  trioWhy: { fontFamily: F.serif, fontSize: 18 },
  trioEmpty: { fontFamily: F.serif, fontSize: 18, color: C.faint },
  note: { fontFamily: F.sans, fontSize: 13, color: C.faint, textAlign: 'center' },
  block: { gap: 8, borderTopWidth: 1, borderTopColor: C.line, paddingTop: S.md },
  tally: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tallyItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 10, borderRadius: R.full, borderWidth: 1, borderColor: C.line },
  tallyN: { fontFamily: F.sansMedium, fontSize: 12, color: C.ink },
});
