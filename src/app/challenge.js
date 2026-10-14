// A friend's drop, opened from a link: see their sky, catch the same stars, compare.
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Canvas, Picture } from '@shopify/react-native-skia';
import { WHY } from '../keep/content.mjs';
import { dailyDeal, dayNumber, decodeChallenge, fieldRng, fmtSpeed, overlap, shareText, skyName } from '../keep/fun.mjs';
import { Field } from '../keep/field';
import { recordRound } from '../keep/records';
import { logDaily } from '../lib/together';
import { shareCard } from '../keep/share';
import { drawConstellation, layout, record, useSkyFonts } from '../keep/sky';
import { Button, Eyebrow, StillSky, goHome } from '../keep/ui';
import { loadDailies, loadMyName, saveDaily } from '../lib/storage';
import { C, F, R, S } from '../lib/theme';

export default function Challenge() {
  const params = useLocalSearchParams();
  const [c] = useState(() => decodeChallenge(params));
  const [mine, setMine] = useState(undefined);
  const [playing, setPlaying] = useState(false);
  useEffect(() => { if (c) loadDailies().then((d) => setMine(d[c.day] ?? null)); }, [c]);

  if (!c || !c.kept.length) return <Broken />;
  if (mine === undefined) return <View style={styles.root} />;

  const finished = async (g) => {
    const extra = await recordRound(g, 'challenge', c.day);
    const result = { kept: g.kept.map(({ t, k }) => ({ t, k })), speed: extra.speed, at: Date.now() };
    if (c.day === dayNumber()) { await saveDaily(c.day, result); logDaily(c.day, g.kept, extra.speed); }
    setMine(result);
    setPlaying(false);
  };
  if (playing) return <Field cards={dailyDeal(c.day)} rng={fieldRng(c.day)} who={`${c.name}’s drop`} onDone={finished} />;
  return mine ? <Compare c={c} mine={mine} /> : <Intro c={c} onPlay={() => setPlaying(true)} />;
}

function Sky({ kept, h = 200, small = false }) {
  const { width: W } = useWindowDimensions();
  const fonts = useSkyFonts();
  const w = small ? (W - 2 * S.lg - S.md) / 2 : W;
  const pic = useMemo(() => {
    if (!fonts || !kept.length) return null;
    const box = { x: small ? 8 : S.lg, y: 16, w: w - (small ? 16 : 2 * S.lg), h: h - 32 };
    return record(w, h, (cv) => drawConstellation(cv, kept, layout(kept, box), { font: small ? null : fonts.small, labels: !small, box, bright: !small }));
  }, [fonts, kept, w, h, small]);
  return pic ? <Canvas style={{ width: w, height: h, marginHorizontal: small ? 0 : -S.lg }}><Picture picture={pic} /></Canvas> : <View style={{ height: h }} />;
}

function Intro({ c, onPlay }) {
  return (
    <View style={styles.root}>
      <StillSky />
      <SafeAreaView style={styles.wrap}>
        <Eyebrow>Daily #{c.day}{c.speed ? ` · ${fmtSpeed(c.speed)}` : ''}</Eyebrow>
        <Text style={styles.h2}>{c.name} kept</Text>
        <Text style={styles.name}>{skyName(c.kept)}</Text>
        <Sky kept={c.kept} />
        <Text style={styles.sub}>Same 21 stars. Beat their speed, or land close to their sky.</Text>
        <View style={{ flex: 1 }} />
        <Button label={`Play ${c.name}’s drop`} onPress={onPlay} />
        <Button ghost label="Not now" onPress={goHome} />
      </SafeAreaView>
    </View>
  );
}

function Compare({ c, mine }) {
  const fonts = useSkyFonts();
  const [me, setMe] = useState('');
  useEffect(() => { loadMyName().then(setMe); }, []);
  const same = overlap(mine.kept, c.kept);
  const faster = mine.speed != null && c.speed != null ? (mine.speed < c.speed ? 'you' : 'them') : null;
  const send = () => shareCard('daily', { day: c.day, kept: mine.kept, name: skyName(mine.kept), speed: fmtSpeed(mine.speed) }, fonts, shareText({ day: c.day, kept: mine.kept, speed: mine.speed, who: me })).catch(() => {});

  return (
    <View style={styles.root}>
      <StillSky />
      <SafeAreaView style={styles.wrap}>
        <Eyebrow>Daily #{c.day} · you and {c.name}</Eyebrow>
        <Text style={styles.h2}>{same} of {Math.max(c.kept.length, mine.kept.length)} <Text style={styles.em}>the same.</Text></Text>
        <View style={styles.pair}>
          {[[c.name, c.kept, c.speed], ['You', mine.kept, mine.speed]].map(([who, kept, sp]) => (
            <View key={who} style={{ flex: 1, gap: 4 }}>
              <Text style={styles.who}>{who.toUpperCase()}{sp != null ? ` · ${fmtSpeed(sp)}` : ''}</Text>
              <Sky kept={kept} h={130} small />
              <Text style={styles.sky}>{kept.length ? skyName(kept) : '—'}</Text>
              <View style={styles.dots}>{kept.map((m, i) => <View key={i} style={[styles.dot, { backgroundColor: WHY[m.k].color }]} />)}</View>
            </View>
          ))}
        </View>
        {faster && <Text style={styles.sub}>{faster === 'you' ? 'You were quicker.' : `${c.name} was quicker.`}</Text>}
        <View style={{ flex: 1 }} />
        {mine.kept.length > 0 && <Button label={`Send yours to ${c.name}`} onPress={send} />}
        <Button ghost label="Home" onPress={goHome} />
      </SafeAreaView>
    </View>
  );
}

function Broken() {
  return (
    <View style={styles.root}>
      <StillSky />
      <SafeAreaView style={styles.wrap}>
        <Text style={styles.h2}>That link didn’t come through whole.</Text>
        <Button label="Home" onPress={goHome} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.sky0 },
  wrap: { flex: 1, paddingHorizontal: S.lg, paddingVertical: S.md, gap: S.md },
  h2: { fontFamily: F.serifRegular, fontSize: 30, lineHeight: 36, color: C.ink },
  em: { fontFamily: F.serifItalic, color: C.gold },
  name: { fontFamily: F.serifRegular, fontSize: 36, lineHeight: 42, color: C.gold },
  sub: { fontFamily: F.sans, fontSize: 14, lineHeight: 20, color: C.dim },
  pair: { flexDirection: 'row', gap: S.md },
  who: { fontFamily: F.sansMedium, fontSize: 10, letterSpacing: 2, color: C.faint },
  sky: { fontFamily: F.serif, fontSize: 16, color: C.ink },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: 10, height: 10, borderRadius: R.full },
});
