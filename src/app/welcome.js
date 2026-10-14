// First launch: three slow stars instead of instructions, then the two whys you'd name, then your deck.
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Canvas, Picture } from '@shopify/react-native-skia';
import { useSharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { DECKS, deckReady, WHYS, WHY, poolFor } from '../keep/content.mjs';
import { EMPTY, drawLines, drawSky, drawStar, drawTrail, record, starfield, useLoop, useSkyFonts, wrap } from '../keep/sky';
import { Button, Eyebrow, StillSky } from '../keep/ui';
import { deckNow, saveSaid, setDeck, setOnboarded } from '../lib/prefs';
import { C, F, R, S } from '../lib/theme';

const FIRST = ['company', 'novelty', 'skill'];
const PULL = {
  delight: 'what simply feels good',
  setting: 'a place',
  novelty: 'something new',
  company: 'people',
  skill: 'getting better at something',
  taste: 'something really good',
  direction: 'where your life is heading',
};

export default function Welcome() {
  const [step, setStep] = useState('stars');
  const [said, setSaid] = useState([]);
  const [deck, pickDeck] = useState(deckNow());

  const finish = async (play) => {
    if (said.length === 2) await saveSaid(said);
    await setDeck(deck);
    await setOnboarded();
    router.replace(play ? '/play' : '/');
  };

  return (
    <View style={styles.root}>
      {step !== 'stars' && <StillSky />}
      {step === 'stars' && <ThreeStars onNext={() => setStep('said')} />}
      {step === 'said' && (
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.wrap}>
            <Eyebrow>Before you play</Eyebrow>
            <Text style={styles.h2}>Which two of these matter most to you?</Text>
            <Text style={styles.sub}>Take your time. This is the one slow question. Later, Keep puts your answer next to what your thumb actually grabs.</Text>
            <View style={{ gap: 2 }}>
              {WHYS.map((w) => {
                const on = said.includes(w.key);
                return (
                  <Pressable
                    key={w.key}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    onPress={() => { Haptics.selectionAsync(); setSaid((s) => (on ? s.filter((k) => k !== w.key) : [...s, w.key].slice(-2))); }}
                    style={[styles.why, on && { borderColor: w.color, backgroundColor: C.card }]}
                  >
                    <View style={[styles.dot, { backgroundColor: w.color }, !on && { opacity: 0.55 }]} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[styles.whyName, on && { color: w.color }]}>{w.name}</Text>
                      <Text style={styles.whyAbout}>{w.about}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <Button label={said.length === 2 ? 'Next' : `Pick ${2 - said.length} more`} disabled={said.length !== 2} onPress={() => setStep('deck')} />
            <Pressable onPress={() => { setSaid([]); setStep('deck'); }} style={styles.skip}><Text style={styles.skipText}>I’d rather not say</Text></Pressable>
          </ScrollView>
        </SafeAreaView>
      )}
      {step === 'deck' && (
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.wrap}>
            <Eyebrow>Your sky</Eyebrow>
            <Text style={styles.h2}>Which moments should fall?</Text>
            <Text style={styles.sub}>Same seven whys in every deck. The moments fit where you are. You can change this anytime.</Text>
            <View style={{ gap: 8 }}>
              {DECKS.filter((d) => deckReady(d.key)).map((d) => {
                const on = deck === d.key;
                return (
                  <Pressable key={d.key} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => pickDeck(d.key)} style={[styles.deck, on && styles.deckOn]}>
                    <Text style={[styles.deckName, on && { color: C.gold }]}>{d.name}</Text>
                    <Text style={styles.whyAbout}>{d.who}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Button label="Play your first drop" onPress={() => finish(true)} />
          </ScrollView>
        </SafeAreaView>
      )}
    </View>
  );
}

function ThreeStars({ onNext }) {
  const { width: W, height: H } = useWindowDimensions();
  const ins = useSafeAreaInsets();
  const fonts = useSkyFonts();
  const pic = useSharedValue(EMPTY);
  const [caught, setCaught] = useState(null);

  const G = useRef(null);
  const game = () => (G.current ??= { T: 0, field: starfield(W, H, 90), stars: null });
  const pool = poolFor('everyday');

  const reset = () => {
    const g = game();
    g.stars = FIRST.map((k, i) => {
      const { lines, mw } = wrap(fonts.label, pool[k][i], W * 0.3);
      return { k, t: pool[k][i], lines, mw, x: W * (0.2 + i * 0.3), y: -30, born: g.T + i * 1100, trail: [], caught: false };
    });
  };

  useLoop((dt) => {
    const g = game();
    g.T += dt;
    if (!g.stars) reset();
    const floor = H * 0.66, top = ins.top + 130;
    let alive = 0;
    for (const s of g.stars) {
      if (s.caught) { s.y += (H * 0.36 - s.y) * 0.08; s.x += (W / 2 - s.x) * 0.08; continue; }
      const f = (g.T - s.born) / 7000;
      s.y = top + Math.max(0, f) * (floor - top);
      s.trail.unshift([s.x, s.y]);
      s.trail.length = Math.min(s.trail.length, 16);
      s.waiting = f < 0;
      if (f < 1) alive++;
    }
    if (!alive && !g.stars.some((s) => s.caught)) reset();
    pic.value = record(W, H, (c) => {
      drawSky(c, W, H, g.field, g.T);
      for (const s of g.stars) {
        if (s.waiting) continue;
        const al = s.caught ? 1 : Math.max(0, Math.min(1, (floor - s.y) / 80)) * (g.stars.some((o) => o.caught) ? 0.15 : 1);
        if (!s.caught) drawTrail(c, s.trail, al);
        drawStar(c, s.x, s.y, s.caught ? 6 : 4.5, al, s.caught);
        drawLines(c, s.lines, s.x, s.y + 12, fonts.label, 21, al, s.caught ? WHY[s.k].color : undefined);
      }
    });
  }, !!fonts);

  const onTouch = (e) => {
    const g = game();
    if (caught || !g.stars) return;
    const { locationX: x, locationY: y } = e.nativeEvent;
    const s = g.stars.find((m) => !m.waiting && Math.abs(x - m.x) < m.mw / 2 + 16 && y > m.y - 30 && y < m.y + 20 + m.lines.length * 21);
    if (!s) return;
    s.caught = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCaught(s.k);
  };

  return (
    <View style={styles.root} onTouchStart={onTouch}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Picture picture={pic} />
      </Canvas>
      <View style={[styles.top, { top: ins.top + 16 }]} pointerEvents="none">
        <Text style={styles.title}>Keep<Text style={{ color: C.gold }}>.</Text></Text>
        {!caught && <Text style={styles.sub}>Three stars. Tap the one you’d keep.</Text>}
      </View>
      {caught && (
        <View style={[styles.bottom, { paddingBottom: ins.bottom + S.md }]}>
          <Text style={styles.reading}>
            You went for <Text style={styles.em}>{PULL[caught]}</Text> first. Keep notices things like that. Over a few rounds, it shows you the pattern.
          </Text>
          <Text style={styles.sub}>Then it helps you bring a little more of it into your week.</Text>
          <Button label="Next" onPress={onNext} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.sky0 },
  wrap: { paddingHorizontal: S.lg, paddingVertical: S.md, gap: S.md },
  top: { position: 'absolute', left: S.lg, right: S.lg, gap: 6 },
  title: { fontFamily: F.serifRegular, fontSize: 44, lineHeight: 50, color: C.ink },
  bottom: { position: 'absolute', left: S.lg, right: S.lg, bottom: 0, gap: S.sm + 4 },
  reading: { fontFamily: F.serifRegular, fontSize: 22, lineHeight: 30, color: C.ink },
  em: { fontFamily: F.serifItalic, color: C.gold },
  h2: { fontFamily: F.serifRegular, fontSize: 30, lineHeight: 36, color: C.ink },
  sub: { fontFamily: F.sans, fontSize: 15, lineHeight: 22, color: C.dim },
  why: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 12, borderRadius: R.lg, borderWidth: 1, borderColor: 'transparent' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  whyName: { fontFamily: F.serif, fontSize: 17, color: C.ink },
  whyAbout: { fontFamily: F.sans, fontSize: 13, lineHeight: 18, color: C.faint },
  deck: { paddingVertical: 13, paddingHorizontal: 14, borderRadius: R.lg, borderWidth: 1, borderColor: C.line, gap: 2 },
  deckOn: { borderColor: C.gold, backgroundColor: C.accentWash },
  deckName: { fontFamily: F.serif, fontSize: 17, color: C.ink },
  skip: { alignItems: 'center', paddingVertical: 6 },
  skipText: { fontFamily: F.sans, fontSize: 14, color: C.faint },
});
