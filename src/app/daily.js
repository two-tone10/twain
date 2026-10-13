// Today's drop: the same 21 stars for everyone, once a day. Then send it to a friend.
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Canvas, Picture } from '@shopify/react-native-skia';
import { WHY } from '../keep/content.mjs';
import { dailyDeal, dayNumber, fieldRng, fmtSpeed, shareText, skyName } from '../keep/fun.mjs';
import { Field } from '../keep/field';
import { Outcome } from '../keep/outcome';
import { recordRound } from '../keep/records';
import { shareCard } from '../keep/share';
import { drawConstellation, layout, record, useSkyFonts } from '../keep/sky';
import { Button, Eyebrow, StillSky, goHome } from '../keep/ui';
import { loadDailies, loadMyName, saveDaily } from '../lib/storage';
import { C, F, R, S } from '../lib/theme';

export default function Daily() {
  const [day] = useState(() => dayNumber());
  const [saved, setSaved] = useState(undefined);
  const [game, setGame] = useState(null);
  const [cards] = useState(() => dailyDeal(day));
  useEffect(() => { loadDailies().then((d) => setSaved(d[day] ?? null)); }, [day]);

  const finished = async (g) => {
    const extra = await recordRound(g, 'daily');
    await saveDaily(day, { kept: g.kept.map(({ t, k }) => ({ t, k })), speed: extra.speed, at: Date.now() });
    setGame({ ...g, ...extra, day });
  };

  if (game) return <Outcome g={game} againLabel="Free drop" onAgain={() => router.replace('/play')} />;
  if (saved === undefined) return <View style={styles.root} />;
  if (saved) return <DailyDone day={day} result={saved} />;
  return <Field cards={cards} rng={fieldRng(day)} who={`Daily #${day}`} onDone={finished} />;
}

// Already played today: your result, a way to send it, and a free drop.
function DailyDone({ day, result }) {
  const { width: W } = useWindowDimensions();
  const fonts = useSkyFonts();
  const [me, setMe] = useState('');
  useEffect(() => { loadMyName().then(setMe); }, []);
  const kept = result.kept;
  const name = kept.length ? skyName(kept) : null;
  const H = 220;
  const pic = useMemo(() => {
    if (!fonts || !kept.length) return null;
    const box = { x: S.lg, y: 22, w: W - 2 * S.lg, h: H - 44 };
    return record(W, H, (c) => drawConstellation(c, kept, layout(kept, box), { font: fonts.small, box, bright: true }));
  }, [fonts, W, kept]);
  const send = () => shareCard('daily', { day, kept, name, speed: fmtSpeed(result.speed) }, fonts, shareText({ day, kept, speed: result.speed, who: me })).catch(() => {});

  return (
    <View style={styles.root}>
      <StillSky />
      <SafeAreaView style={styles.wrap}>
        <View style={styles.score}><Text style={styles.scoreT}>DAILY #{day} ✓</Text><Text style={styles.scoreT}>{fmtSpeed(result.speed)}</Text></View>
        {pic && <Canvas style={{ width: W, height: H, marginHorizontal: -S.lg }}><Picture picture={pic} /></Canvas>}
        <View style={{ alignItems: 'center', gap: 6 }}>
          <Eyebrow color={C.faint}>Today you drew</Eyebrow>
          <Text style={styles.name}>{name ?? 'Nothing this time'}</Text>
          <View style={styles.dots}>{kept.map((m, i) => <View key={i} style={[styles.dot, { backgroundColor: WHY[m.k].color }]} />)}</View>
        </View>
        <Text style={styles.sub}>New stars tomorrow.</Text>
        <View style={{ flex: 1 }} />
        {kept.length > 0 && <Button label="Send to a friend" onPress={send} />}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button ghost label="Home" onPress={goHome} style={{ flex: 1 }} />
          <Button ghost label="Free drop" onPress={() => router.replace('/play')} style={{ flex: 1.3 }} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.sky0 },
  wrap: { flex: 1, paddingHorizontal: S.lg, paddingVertical: S.md, gap: S.md },
  score: { flexDirection: 'row', justifyContent: 'space-between' },
  scoreT: { fontFamily: F.sansMedium, fontSize: 11, letterSpacing: 2.5, color: C.gold },
  name: { fontFamily: F.serifRegular, fontSize: 34, lineHeight: 40, color: C.ink, textAlign: 'center' },
  sub: { fontFamily: F.sans, fontSize: 14, color: C.faint, textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 14, height: 14, borderRadius: R.full },
});
