// First launch, in eight scenes: the name, three stars to catch, what Keep gives you, the two whys you'd name,
// a star of your own (it falls in your first drop, and can go up to the commons), your deck, the daily reminder, go.
// One sky is drawn behind all of it; each scene adds its own moving picture.
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Canvas, Picture, Skia, PaintStyle, useFont } from '@shopify/react-native-skia';
import Animated, { FadeIn, FadeInDown, FadeOut, useSharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { DECKS, deckReady, WHYS, WHY, poolFor } from '../keep/content.mjs';
import { EMPTY, FILES, drawCaps, drawGlowStar, drawLines, drawStar, drawTrail, ease, record, starfield, useLoop, useSkyFonts, wrap } from '../keep/sky';
import { Button } from '../keep/ui';
import { allowReminders, scheduleDailyDrop } from '../keep/notify';
import { deckNow, saveDailyHour, saveFirstStar, saveSaid, setDeck, setOnboarded } from '../lib/prefs';
import { commonsOn, holdStar, submitStar } from '../lib/commons';
import { C, F, R, S } from '../lib/theme';

const SCENES = ['open', 'catch', 'gets', 'said', 'star', 'deck', 'evening', 'go'];
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
const GETS = [
  ['Under a minute\nof falling stars.', 'Each one a small moment. Catch the ones you’d keep. Let the rest fall.'],
  ['A sky that’s yours.', 'Every drop draws a constellation. After five, you get your sign.'],
  ['One, for real.', 'Pick a star to do this week. Keep checks in after, and remembers what you did.'],
  ['Play the same sky\nas a friend.', 'Send a drop. See how in sync you are, and how well you read each other.'],
];
const HOURS = [[19, '7'], [20, '8'], [21, '9']];
const REASONS = { too_short: 'A few more words.', too_long: 'Under 30 characters, so it fits on a star.', not_allowed: 'That one can’t go up. Try another.' };

function paint(color, stroke) {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setColor(Skia.Color(color));
  if (stroke) { p.setStyle(PaintStyle.Stroke); p.setStrokeWidth(stroke); }
  return p;
}
const clamp = (x) => Math.max(0, Math.min(1, x));
// Rises softly into place, `d` ms after its scene appears.
const In = ({ d = 0, children, style }) => <Animated.View entering={FadeInDown.duration(800).delay(d)} style={style}>{children}</Animated.View>;

export default function Welcome() {
  const { width: W, height: H } = useWindowDimensions();
  const ins = useSafeAreaInsets();
  const fonts = useSkyFonts();
  const big = useFont(FILES.italic, 20);
  const pic = useSharedValue(EMPTY);

  const [i, setI] = useState(0);
  const scene = SCENES[i];
  const [caught, setCaught] = useState(null);
  const [get, setGet] = useState(0);
  const [said, setSaid] = useState([]);
  const [text, setText] = useState('');
  const [k, setK] = useState(null);
  const [share, setShare] = useState(true);
  const [sent, setSent] = useState(null);
  const [err, setErr] = useState('');
  const [deck, pickDeck] = useState(deckNow());
  const [hour, setHour] = useState(20);

  // Everything the sky draws lives here, read by the frame loop.
  const G = useRef(null);
  const game = () => (G.current ??= { T: 0, at: 0, getAt: 0, field: starfield(W, H, 120), stars: null, mine: null, drop: null, pool: poolFor('everyday'), P: null });

  const go = (n) => {
    const g = game();
    g.at = g.T;
    if (SCENES[n] === 'catch') g.stars = null;
    if (SCENES[n] === 'gets') { g.getAt = g.T; setGet(0); }
    if (SCENES[n] === 'go') g.drop = null;
    setI(n);
  };
  const next = () => go(i + 1);

  // Three stars fall; whatever you tap rises to the middle in its why's color.
  function drawCatch(c, T) {
    const g = game();
    const floor = H * 0.74, top = ins.top + 200;
    if (!g.stars) {
      g.stars = FIRST.map((key, j) => {
        const t = g.pool[key][j];
        const { lines, mw } = wrap(fonts.label, t, W * 0.28);
        return { k: key, t, lines, mw, x: W * (0.2 + j * 0.3), y: -40, born: T + 400 + j * 1000, trail: [], caught: false };
      });
    }
    const any = g.stars.some((s) => s.caught);
    let alive = 0;
    for (const s of g.stars) {
      if (s.caught) {
        s.x += (W / 2 - s.x) * 0.06; s.y += (H * 0.42 - s.y) * 0.06;
        drawGlowStar(c, s.x, s.y, 7, WHY[s.k].color);
        drawLines(c, wrap(big, s.t, W * 0.7).lines, s.x, s.y + 20, big, 26, 1, WHY[s.k].color);
        continue;
      }
      const f = (T - s.born) / 7200;
      s.waiting = f < 0;
      if (s.waiting) continue;
      s.y = top + f * (floor - top);
      s.trail.unshift([s.x, s.y]);
      s.trail.length = Math.min(s.trail.length, 16);
      if (f < 1) alive++;
      const al = clamp((floor - s.y) / 90) * (any ? 0.1 : 1);
      drawTrail(c, s.trail, al);
      drawStar(c, s.x, s.y, 4.5, al);
      if (!any) drawLines(c, s.lines, s.x, s.y + 12, fonts.label, 21, al);
    }
    if (!alive && !any && g.stars.every((s) => !s.waiting)) g.stars = null;
  }

  // The four promises, each with its own picture above the words.
  function drawGet(c, T, el, P) {
    const g = game();
    const box = { x: 30, y: ins.top + 110, w: W - 60, h: H * 0.4 };
    const cols = WHYS.map((w) => w.color);
    if (get === 0) {
      for (let j = 0; j < 9; j++) {
        const ph = (T / (2800 + (j % 4) * 500) + j * 0.53 + j * j * 0.07) % 1;
        const x = box.x + ((j * 0.618) % 1) * box.w, y = box.y + ph * box.h;
        if (j % 3 === 0 && ph > 0.55) { drawGlowStar(c, x, box.y + box.h * 0.55, 5, cols[j % 7], clamp(1 - (ph - 0.55) * 2.2)); continue; }
        drawTrail(c, Array.from({ length: 12 }, (_, q) => [x, y - q * 6]), 0.8);
        drawStar(c, x, y, 3.5, 0.9);
      }
    } else if (get === 1) {
      const pts = [[0.12, 0.62], [0.3, 0.46], [0.46, 0.56], [0.62, 0.36], [0.76, 0.44], [0.88, 0.24]].map(([x, y]) => [box.x + x * box.w, box.y + y * box.h]);
      const ks = [3, 0, 3, 4, 2, 6];
      P.ghost.setAlphaf(0.1);
      for (let gh = 1; gh < 4; gh++) pts.forEach((q, j) => j && c.drawLine(pts[j - 1][0] + gh * 9 - 18, pts[j - 1][1] + Math.sin(gh + j - 1) * 22, q[0] + gh * 9 - 18, q[1] + Math.sin(gh + j) * 22, P.ghost));
      const n = clamp(el / 2600) * (pts.length - 1);
      P.line.setAlphaf(0.75);
      for (let j = 1; j <= Math.ceil(n); j++) {
        const f = Math.min(1, n - (j - 1)), a = pts[j - 1], b = pts[j];
        c.drawLine(a[0], a[1], a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, P.line);
      }
      pts.forEach((q, j) => j <= n + 0.01 && drawGlowStar(c, q[0], q[1], 4.5, cols[ks[j]]));
    } else if (get === 2) {
      const m = caught ? g.stars?.find((s) => s.caught) : null;
      const t = m?.t ?? 'Dinner with old friends', col = WHY[m?.k ?? 'company'].color;
      const p = ease(clamp(el / 2200));
      const sx = W * 0.7, sy = box.y + 30, ex = 54, ey = box.y + box.h * 0.62;
      const rowA = ease(clamp((el - 1600) / 800));
      P.box.setAlphaf(rowA);
      c.drawRRect(Skia.RRectXY(Skia.XYWHRect(30, ey - 32, W - 60, 64), 16, 16), P.box);
      drawLines(c, [t], (W + 44) / 2, ey - 22, fonts.label, 22, rowA);
      drawCaps(c, 'Thursday', (W + 44) / 2, ey + 18, fonts.caps, C.faint, rowA, 'center');
      drawGlowStar(c, sx + (ex - sx) * p, sy + (ey - sy) * p, 6, col);
      const q = ease(clamp((el - 3400) / 700));
      drawLines(c, ['Did you do it?'], W / 2, ey + 52, big, 26, q, C.gold);
    } else {
      const p = ease(clamp(el / 2000));
      const A = [[0.15, 0.6], [0.3, 0.35], [0.5, 0.5], [0.68, 0.3], [0.85, 0.55]];
      const B = [[0.2, 0.4], [0.3, 0.35], [0.48, 0.72], [0.68, 0.3], [0.8, 0.7]];
      const draw = (pts0, col, dx) => {
        const pts = pts0.map(([x, y]) => [box.x + x * box.w + dx * (1 - p), box.y + y * box.h]);
        P.line.setColor(Skia.Color(col)); P.line.setAlphaf(0.55);
        pts.forEach((q, j) => j && c.drawLine(pts[j - 1][0], pts[j - 1][1], q[0], q[1], P.line));
        pts.forEach((q) => drawGlowStar(c, q[0], q[1], 3, col, 0.9));
      };
      draw(A, C.gold, -40);
      draw(B, WHY.setting.color, 40);
      P.line.setColor(Skia.Color(C.gold));
      if (p > 0.95) [[0.3, 0.35], [0.68, 0.3]].forEach(([x, y]) => drawStar(c, box.x + x * box.w, box.y + y * box.h, 5, 0.6 + 0.4 * Math.sin(T / 300), true));
      const q = ease(clamp((el - 2000) / 600));
      drawLines(c, ['62%'], W / 2, box.y + box.h - 6, fonts.huge, 46, q);
      drawCaps(c, 'In sync', W / 2, box.y + box.h + 52, fonts.caps, C.faint, q, 'center');
    }
  }

  // Moving pictures, one per scene.
  useLoop((dt) => {
    const g = game();
    g.T += dt;
    const T = g.T, el = T - g.at;
    g.P ??= { dot: paint(C.field), line: paint(C.gold, 1.2), ghost: paint(C.ink, 1), box: paint(C.cardLine, 1), moon: paint(C.glow) };
    const { P } = g;
    const field = (c, al) => g.field.forEach((s) => { P.dot.setAlphaf(clamp(al * (0.2 + 0.45 * (0.5 + 0.5 * Math.sin(T * 0.002 + s.p))))); c.drawCircle(s.x, s.y, s.r, P.dot); });
    pic.value = record(W, H, (c) => {
      if (scene === 'open') {
        const lift = ease(clamp(el / 1800));
        field(c, lift);
        const p = ease(clamp(el / 2600)), x = W / 2 + 40 * (1 - p), y = -20 + p * H * 0.3;
        drawTrail(c, Array.from({ length: 18 }, (_, j) => [x + j * 3 * (1 - p), y - j * 7 * (1 - p * 0.7)]), 1 - p * 0.6);
        drawStar(c, x, y, 4 + 2 * p, 1, true);
      } else if (scene === 'catch') {
        field(c, 1);
        drawCatch(c, T);
      } else if (scene === 'gets') {
        field(c, 0.8);
        drawGet(c, T, T - g.getAt, P);
      } else if (scene === 'said' || scene === 'deck') {
        field(c, 0.6);
      } else if (scene === 'star') {
        field(c, 0.7);
        const m = g.mine;
        if (m) {
          const p = ease(clamp((T - m.at) / 2600)), x = W / 2, y = H * 0.66 - p * H * 0.24;
          drawTrail(c, Array.from({ length: 24 }, (_, j) => [x, y + j * 9 * (1 - p * 0.6)]), 1 - p * 0.4, WHY[m.k].color);
          drawGlowStar(c, x, y, 5 + 2 * p + Math.sin(T / 500) * 0.6 * p, WHY[m.k].color);
          const { lines } = wrap(big, m.t, W * 0.6);
          drawLines(c, lines, x, y + 22, big, 26, p, WHY[m.k].color);
        }
      } else if (scene === 'evening') {
        field(c, 0.9);
        const p = (hour - 18) / 4, mx = W * (0.22 + p * 0.56), my = H * 0.7 - Math.sin(Math.PI * (0.15 + p * 0.7)) * 60;
        drawGlowStar(c, mx, my, 9, C.glow, 0.9);
      } else if (scene === 'go') {
        field(c, 1);
        g.drop ??= Array.from({ length: 20 }, (_, j) => ({ x: W * (0.08 + ((j * 0.618) % 1) * 0.84), v: 0.04 + (j % 5) * 0.008, o: j * 97 }))
          .concat(g.mine ? [{ x: W / 2, v: 0.05, o: 300, mine: true }] : []);
        for (const d of g.drop) {
          // Theirs falls in once and settles above the words; the rest keep falling past.
          const y = d.mine ? -40 + ease(clamp((el - 600) / 3200)) * (H * 0.4 + 40) + Math.sin(T / 900) * 4 : ((T * d.v + d.o) % (H + 200)) - 100;
          const col = d.mine ? WHY[g.mine.k].color : null;
          drawTrail(c, Array.from({ length: 12 }, (_, j) => [d.x, y - j * 6]), d.mine ? 0.9 : 0.45, col);
          if (d.mine) {
            drawGlowStar(c, d.x, y, 5.5, col);
            drawLines(c, wrap(big, g.mine.t, W * 0.6).lines, d.x, y + 14, big, 26, 1, col);
          } else drawStar(c, d.x, y, 3, 0.6);
        }
      }
    });
  }, !!fonts && !!big);

  const onTouch = (e) => {
    const g = game();
    if (scene === 'open') return next();
    if (scene === 'gets') { g.swipe = e.nativeEvent.pageX; return; }
    if (scene !== 'catch' || caught || !g.stars) return;
    const { pageX: x, pageY: y } = e.nativeEvent;
    const s = g.stars.find((m) => !m.waiting && Math.abs(x - m.x) < m.mw / 2 + 18 && y > m.y - 36 && y < m.y + 36 + m.lines.length * 21);
    if (!s) return;
    s.caught = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCaught(s.k);
  };
  const showGet = (n) => { const g = game(); g.getAt = g.T; setGet(n); };
  const onTouchEnd = (e) => {
    const g = game();
    if (scene !== 'gets' || g.swipe == null) return;
    const d = e.nativeEvent.pageX - g.swipe;
    g.swipe = null;
    if (Math.abs(d) > 40) showGet(Math.max(0, Math.min(3, get + (d < 0 ? 1 : -1))));
  };

  const clean = text.trim();
  const sendStar = async () => {
    const g = game();
    setErr('');
    const star = { t: clean, k };
    if (share && commonsOn) {
      const r = await submitStar(star);
      if (r?.reason && REASONS[r.reason]) { setErr(REASONS[r.reason]); return; }
      if (!r?.ok) await holdStar(star);
    }
    await saveFirstStar(star);
    g.mine = { ...star, at: g.T };
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSent(star);
  };

  const remind = async () => {
    if (await allowReminders()) {
      await saveDailyHour(hour);
      await scheduleDailyDrop(hour, false);
    }
    next();
  };

  const finish = async () => {
    if (said.length === 2) await saveSaid(said);
    await setDeck(deck);
    await setOnboarded();
    router.replace('/play');
  };

  const top = { paddingTop: ins.top + 40, paddingBottom: ins.bottom + S.md };

  return (
    <View style={styles.root} onTouchStart={onTouch} onTouchEnd={onTouchEnd}>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none"><Picture picture={pic} /></Canvas>

      <Animated.View key={scene} entering={FadeIn.duration(700)} exiting={FadeOut.duration(250)} style={[StyleSheet.absoluteFill, styles.scene, top]} pointerEvents="box-none">
        {scene === 'open' && (
          <View style={styles.center} pointerEvents="none">
            <In d={500}><Text style={styles.logo}>Keep<Text style={{ color: C.gold }}>.</Text></Text></In>
            <In d={1100}><Text style={styles.tag}>Catch what you’d keep.</Text></In>
            <In d={1800} style={styles.tapWrap}><Text style={styles.tap}>TAP ANYWHERE</Text></In>
          </View>
        )}

        {scene === 'catch' && (
          <>
            {!caught && <In d={300}><Text style={styles.h}>Three stars.{'\n'}Tap the one you’d keep.</Text></In>}
            <View style={{ flex: 1 }} pointerEvents="none" />
            {caught && (
              <In d={700} style={styles.bottom}>
                <Text style={styles.reading}>You went for <Text style={styles.em}>{PULL[caught]}</Text> first.</Text>
                <Text style={styles.sub}>Your thumb is quicker than your reasons. Keep watches what it grabs.</Text>
                <Button label="Next" onPress={next} />
              </In>
            )}
          </>
        )}

        {scene === 'gets' && (
          <>
            <Text style={styles.k}>What you get</Text>
            <View style={{ flex: 1 }} pointerEvents="none" />
            <Animated.View key={get} entering={FadeInDown.duration(600)} style={{ gap: 10 }} pointerEvents="none">
              <Text style={styles.h}>{GETS[get][0]}</Text>
              <Text style={styles.sub}>{GETS[get][1]}</Text>
            </Animated.View>
            <View style={styles.pips}>
              {GETS.map((_, n) => <View key={n} style={[styles.pip, n === get && styles.pipOn]} />)}
            </View>
            <Button label={get === 3 ? 'Begin' : 'Next'} onPress={() => (get < 3 ? showGet(get + 1) : next())} />
          </>
        )}

        {scene === 'said' && (
          <ScrollView contentContainerStyle={{ gap: S.md, flexGrow: 1 }}>
            <Text style={styles.k}>The one slow question</Text>
            <Text style={styles.h}>Which two matter most to you?</Text>
            <View style={{ gap: 2 }}>
              {WHYS.map((w) => {
                const on = said.includes(w.key);
                return (
                  <Pressable
                    key={w.key}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    onPress={() => { Haptics.selectionAsync(); setSaid((s) => (on ? s.filter((x) => x !== w.key) : [...s, w.key].slice(-2))); }}
                    style={[styles.why, on && { borderColor: w.color, backgroundColor: C.card }]}
                  >
                    <View style={[styles.dot, { backgroundColor: w.color }, !on && { opacity: 0.55 }, on && { shadowColor: w.color, shadowOpacity: 1, shadowRadius: 6 }]} />
                    <Text style={[styles.whyName, on && { color: w.color }]}>{w.name}</Text>
                    <Text style={styles.whyAbout}>{PULL[w.key]}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ flex: 1 }} />
            <Button label={said.length === 2 ? 'Next' : `Pick ${2 - said.length} more`} disabled={said.length !== 2} onPress={next} />
            <Pressable onPress={() => { setSaid([]); next(); }} style={styles.skip}><Text style={styles.skipT}>I’d rather not say</Text></Pressable>
          </ScrollView>
        )}

        {scene === 'star' && (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ gap: S.md, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.k}>Your star</Text>
              {sent ? (
                <In><Text style={styles.h}>In the sky.</Text></In>
              ) : (
                <>
                  <Text style={styles.h}>Something you{'\n'}really love doing?</Text>
                  <TextInput value={text} onChangeText={(v) => { setText(v); setErr(''); }} placeholder="Swimming in the sea" placeholderTextColor={C.faint} maxLength={30} style={styles.input} returnKeyType="done" />
                  <Text style={styles.count}>{clean.length}/30</Text>
                  <View style={styles.chips}>
                    {WHYS.map((w) => (
                      <Pressable key={w.key} accessibilityRole="radio" accessibilityState={{ selected: k === w.key }} onPress={() => { Haptics.selectionAsync(); setK(w.key); }} style={[styles.chip, k === w.key && { backgroundColor: w.color, borderColor: w.color }]}>
                        <Text style={[styles.chipT, k === w.key && { color: C.dark }]}>{w.name}</Text>
                      </Pressable>
                    ))}
                  </View>
                  {commonsOn && (
                    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: share }} onPress={() => setShare((v) => !v)} style={styles.share}>
                      <View style={[styles.box, share && { backgroundColor: C.gold }]}>{share && <Text style={styles.tick}>✓</Text>}</View>
                      <Text style={[styles.sub, { flex: 1, fontSize: 13 }]}>Add it to everyone’s sky too. A person reads it first. No names.</Text>
                    </Pressable>
                  )}
                  {err ? <Text style={styles.err}>{err}</Text> : null}
                </>
              )}
              <View style={{ flex: 1, minHeight: S.lg }} />
              {sent ? (
                <In d={1800} style={{ gap: S.md }}>
                  <Text style={styles.sub}>{share && commonsOn ? 'It’ll fall in your first drop. And once it’s read, in everyone’s.' : 'It’ll fall in your first drop.'}</Text>
                  <Button label="Next" onPress={next} />
                </In>
              ) : (
                <>
                  <Button label="Send it up" disabled={clean.length < 3 || !k} onPress={sendStar} />
                  <Pressable onPress={next} style={styles.skip}><Text style={styles.skipT}>Skip</Text></Pressable>
                </>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        )}

        {scene === 'deck' && (
          <ScrollView contentContainerStyle={{ gap: S.md, flexGrow: 1 }}>
            <Text style={styles.k}>Your sky</Text>
            <Text style={styles.h}>Which moments should fall?</Text>
            <View style={{ gap: 6 }}>
              {DECKS.filter((d) => deckReady(d.key)).map((d) => {
                const on = deck === d.key;
                return (
                  <Pressable key={d.key} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => { Haptics.selectionAsync(); pickDeck(d.key); }} style={[styles.deck, on && styles.deckOn]}>
                    <Text style={[styles.deckName, on && { color: C.gold }]}>{d.name}</Text>
                    <Text style={styles.deckWho}>{d.who}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ flex: 1 }} />
            <Button label="Next" onPress={next} />
          </ScrollView>
        )}

        {scene === 'evening' && (
          <>
            <Text style={styles.k}>Daily drop</Text>
            <Text style={styles.h}>A new sky every day.{'\n'}<Text style={styles.hEm}>When</Text> should it fall?</Text>
            <Text style={styles.sub}>Same stars for everyone. One quiet note, no streaks.</Text>
            <View style={styles.times}>
              {HOURS.map(([h, l]) => (
                <Pressable key={h} accessibilityRole="radio" accessibilityState={{ selected: hour === h }} onPress={() => { Haptics.selectionAsync(); setHour(h); }} style={[styles.time, hour === h && styles.deckOn]}>
                  <Text style={[styles.timeN, hour === h && { color: C.gold }]}>{l}</Text>
                  <Text style={styles.timeS}>PM</Text>
                </Pressable>
              ))}
            </View>
            <View style={{ flex: 1 }} pointerEvents="none" />
            <Button label={`Remind me at ${hour - 12}`} onPress={remind} />
            <Pressable onPress={next} style={styles.skip}><Text style={styles.skipT}>Not now</Text></Pressable>
          </>
        )}

        {scene === 'go' && (
          <>
            <View style={{ flex: 1 }} pointerEvents="none" />
            <In d={300}><Text style={styles.k}>Ready</Text></In>
            <In d={700}><Text style={styles.h}>Your first drop.</Text></In>
            <In d={1200}><Text style={styles.sub}>{sent ? 'Twenty-one stars. One of them is yours.' : 'Twenty-one stars. Keep five.'}</Text></In>
            <In d={1800}><Button label="Play" onPress={finish} /></In>
          </>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.sky0 },
  scene: { paddingHorizontal: S.lg + 6, gap: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  logo: { fontFamily: F.serifRegular, fontSize: 84, lineHeight: 92, color: C.ink, textAlign: 'center' },
  tag: { fontFamily: F.serifItalic, fontSize: 20, color: C.dim, textAlign: 'center' },
  tapWrap: { position: 'absolute', bottom: 40, left: 0, right: 0 },
  tap: { fontFamily: F.sansMedium, fontSize: 10, letterSpacing: 3, color: C.faint, textAlign: 'center' },
  k: { fontFamily: F.sansMedium, fontSize: 10, letterSpacing: 3, color: C.gold, textTransform: 'uppercase' },
  h: { fontFamily: F.serifRegular, fontSize: 34, lineHeight: 40, color: C.ink },
  hEm: { fontFamily: F.serifItalic, color: C.gold },
  sub: { fontFamily: F.sans, fontSize: 15, lineHeight: 22, color: C.dim },
  bottom: { gap: S.sm + 4 },
  reading: { fontFamily: F.serifRegular, fontSize: 24, lineHeight: 31, color: C.ink },
  em: { fontFamily: F.serifItalic, color: C.gold },
  pips: { flexDirection: 'row', gap: 8, justifyContent: 'center', paddingVertical: 4 },
  pip: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.line },
  pipOn: { width: 22, backgroundColor: C.gold },
  why: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 11, paddingHorizontal: 14, borderRadius: R.xl, borderWidth: 1, borderColor: 'transparent' },
  dot: { width: 11, height: 11, borderRadius: 6 },
  whyName: { fontFamily: F.serifRegular, fontSize: 19, color: C.ink, flex: 1 },
  whyAbout: { fontFamily: F.sans, fontSize: 12, color: C.faint, maxWidth: '55%', textAlign: 'right' },
  skip: { alignItems: 'center', paddingVertical: 6 },
  skipT: { fontFamily: F.sans, fontSize: 14, color: C.faint },
  input: { borderWidth: 1, borderColor: C.gold, backgroundColor: C.card, borderRadius: R.xl, paddingVertical: 15, paddingHorizontal: 16, color: C.ink, fontFamily: F.serifRegular, fontSize: 22 },
  count: { fontFamily: F.sans, fontSize: 12, color: C.faint, textAlign: 'right', marginTop: -8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { paddingVertical: 7, paddingHorizontal: 13, borderRadius: R.full, borderWidth: 1, borderColor: C.line },
  chipT: { fontFamily: F.sansMedium, fontSize: 13, color: C.dim },
  share: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  box: { width: 20, height: 20, borderRadius: 6, borderWidth: 1, borderColor: C.gold, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  tick: { color: C.dark, fontSize: 13, fontFamily: F.sansBold },
  err: { fontFamily: F.sans, fontSize: 14, color: '#e79a7a' },
  deck: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: R.xl, borderWidth: 1, borderColor: C.line },
  deckOn: { borderColor: C.gold, backgroundColor: C.accentWash },
  deckName: { fontFamily: F.serifRegular, fontSize: 18, color: C.ink },
  deckWho: { fontFamily: F.sans, fontSize: 12, color: C.faint, flexShrink: 1, textAlign: 'right' },
  times: { flexDirection: 'row', gap: 8 },
  time: { flex: 1, alignItems: 'center', paddingVertical: 16, borderRadius: R.xl, borderWidth: 1, borderColor: C.line, gap: 4 },
  timeN: { fontFamily: F.serifRegular, fontSize: 24, color: C.ink },
  timeS: { fontFamily: F.sansMedium, fontSize: 9, letterSpacing: 2.5, color: C.faint },
});
