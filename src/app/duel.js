import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Canvas, Picture } from '@shopify/react-native-skia';
import { useSharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { BASKET, DUEL_PER_WHY, ROUND_MS } from '../keep/content.mjs';
import { deal, duelSummary } from '../keep/insight.mjs';
import {
  EMPTY, drawBar, drawCaps, drawConstellation, drawLines, drawSky, drawStar, drawTrail,
  ease, layout, lerp, record, starfield, useLoop, useSkyFonts, wrap,
} from '../keep/sky';
import { Button, Eyebrow, goHome, Reading, StillSky, WhyChip } from '../keep/ui';
import { loadNames, saveNames } from '../lib/storage';
import { C, F, R, S } from '../lib/theme';

export default function Duel() {
  const [phase, setPhase] = useState('setup');
  const [names, setNames] = useState(['', '']);
  const [round, setRound] = useState(0);
  const [result, setResult] = useState(null);

  useEffect(() => { loadNames().then(setNames); }, []);

  const start = () => {
    saveNames(names);
    setRound((r) => r + 1);
    setPhase('play');
  };
  const shown = [names[0].trim() || 'Bottom', names[1].trim() || 'Top'];

  if (phase === 'play') return <Arena key={round} names={shown} onDone={(r) => { setResult(r); setPhase('results'); }} />;
  if (phase === 'results') return <DuelResults r={result} onAgain={start} />;

  return (
    <View style={styles.root}>
      <StillSky />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.setup}>
          <Eyebrow>Duel</Eyebrow>
          <Text style={styles.h2}>
            Two thumbs.{'\n'}
            <Text style={{ color: C.gold, fontFamily: F.serifItalic }}>One phone.</Text>
          </Text>
          <Text style={styles.sub}>Lay the phone flat between you. Stars streak across the middle. Tap your side of a star to grab it. If you both want it, the faster thumb wins.</Text>
          {['Bottom player', 'Top player'].map((label, i) => (
            <View key={label} style={{ gap: 6 }}>
              <Text style={styles.label}>{label}</Text>
              <TextInput
                value={names[i]}
                onChangeText={(v) => setNames((n) => (i ? [n[0], v] : [v, n[1]]))}
                placeholder="Name"
                placeholderTextColor={C.faint}
                maxLength={14}
                autoCorrect={false}
                style={styles.input}
              />
            </View>
          ))}
          <View style={{ flex: 1 }} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button ghost label="Back" onPress={() => goHome()} style={{ flex: 1 }} />
            <Button label="Start" onPress={start} style={{ flex: 2 }} />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

/* ---------------- the arena ---------------- */

function Arena({ names, onDone }) {
  const { width: W, height: H } = useWindowDimensions();
  const ins = useSafeAreaInsets();
  const fonts = useSkyFonts();
  const pic = useSharedValue(EMPTY);

  // Both skies use the same box; the top player's is drawn turned 180°.
  const geo = useMemo(() => {
    const m = Math.max(ins.top, ins.bottom);
    return { cy: H / 2, sky: { x: 22, y: H - m - 160, w: W - 44, h: 130 } };
  }, [W, H, ins.top, ins.bottom]);
  const flip = (p) => ({ x: W - p.x, y: H - p.y });

  const G = useRef(null);
  const game = () => (G.current ??= { deck: deal(DUEL_PER_WHY), live: [], baskets: [[], []], ghosts: [], flies: [], pops: [], fights: [], gone: [], gt: 0, next: 400, lane: 0, over: false, field: starfield(W, H, 120) });

  const target = (who, i) => {
    const p = layout(game().baskets[who], geo.sky)[i];
    return who ? flip(p) : p;
  };

  const spawn = () => {
    const g = game();
    const c = g.deck.shift();
    if (!c) return;
    const { lines, mw } = wrap(fonts.label, c.t, Math.min(160, W * 0.44));
    g.lane = 1 - g.lane;
    const p = g.gt / ROUND_MS;
    g.live.push({ ...c, lines, mw, dir: g.lane ? -1 : 1, y: geo.cy + (g.lane ? 80 : -80), born: g.gt, dur: 4600 - 2000 * p, trail: [], x: -100 });
  };

  const pop = (x, y, text, who) => game().pops.push({ x, y, text, who, t: 0 });

  const onTouch = (e) => {
    const g = game();
    if (g.over || !fonts) return;
    for (const t of e.nativeEvent.changedTouches) {
      const x = t.locationX, y = t.locationY;
      const hit = (m) => Math.abs(x - m.x) < m.mw / 2 + 14 && Math.abs(y - m.y) < 64;
      // a late thumb on a star that was just taken
      const ghost = g.ghosts.find((gh) => hit(gh) && g.gt - gh.at < 450);
      if (ghost) {
        const who = y < ghost.y ? 1 : 0;
        if (who !== ghost.by && !ghost.fought) { ghost.fought = true; g.fights.push({ m: ghost.m, winner: ghost.by }); pop(x, y, 'too slow', who); }
        continue;
      }
      const m = [...g.live].reverse().find(hit);
      if (!m) continue;
      const who = y < m.y ? 1 : 0;
      if (g.baskets[who].length >= BASKET) { pop(x, y, 'full', who); continue; }
      g.live.splice(g.live.indexOf(m), 1);
      g.baskets[who].push(m);
      g.ghosts.push({ m, x: m.x, y: m.y, mw: m.mw, by: who, at: g.gt });
      g.flies.push({ m, who, x0: m.x, y0: m.y, t: 0 });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const finish = () => {
    const g = game();
    if (g.over) return;
    g.over = true;
    setTimeout(() => onDone({ names, baskets: g.baskets, fights: g.fights }), 700);
  };

  const step = (dt) => {
    const g = game();
    if (g.over) return;
    g.gt += dt;
    const p = Math.min(1, g.gt / ROUND_MS);
    if (g.gt >= g.next && g.deck.length) { spawn(); g.next = g.gt + 1250 - 600 * p; }
    for (const m of g.live.slice()) {
      const f = (g.gt - m.born) / m.dur, w = m.mw + 30, span = W + w;
      m.x = m.dir > 0 ? -w / 2 + f * span : W + w / 2 - f * span;
      m.trail.unshift([m.x, m.y]);
      m.trail.length = Math.min(m.trail.length, 16);
      if (f >= 1) { g.gone.push(m); g.live.splice(g.live.indexOf(m), 1); }
    }
    g.ghosts = g.ghosts.filter((gh) => g.gt - gh.at < 450);
    g.flies = g.flies.filter((fl) => { fl.t += dt / 480; if (fl.t >= 1) { fl.m.landed = true; return false; } return true; });
    g.pops = g.pops.filter((pp) => (pp.t += dt / 800) < 1);
    const full = g.baskets.every((b) => b.length >= BASKET);
    if (g.gt >= ROUND_MS || full || (!g.deck.length && !g.live.length && !g.flies.length)) finish();
  };

  const half = (c, who) => {
    const g = game(), b = g.baskets[who], sky = geo.sky;
    const pts = layout(b, sky);
    const landed = b.map((m, i) => (m.landed ? i : -1)).filter((i) => i >= 0);
    drawCaps(c, `${names[who]}  ·  ${b.length} of ${BASKET}`, sky.x, sky.y - 8, fonts.caps, C.gold, 0.9);
    if (landed.length) drawConstellation(c, landed.map((i) => b[i]), landed.map((i) => pts[i]), { font: fonts.small, box: sky, T: g.gt, bright: b.length === BASKET });
  };

  const draw = (c) => {
    const g = game(), f = fonts;
    drawSky(c, W, H, g.field, g.gt);
    const left = Math.max(0, 1 - g.gt / ROUND_MS), bw = (W - 44) * left;
    drawBar(c, 22, geo.cy - 0.5, W - 44, 1, 'rgba(239,230,214,0.12)');
    drawBar(c, W / 2 - bw / 2, geo.cy - 0.5, bw, 1, C.gold);

    half(c, 0);
    c.save();
    c.rotate(180, W / 2, H / 2);
    half(c, 1);
    c.restore();

    for (const m of g.live) {
      drawTrail(c, m.trail, 0.9);
      drawStar(c, m.x, m.y, 4.5, 1);
      drawLines(c, m.lines, m.x, m.y + 9, f.label, 20);
      c.save();
      c.rotate(180, m.x, m.y);
      drawLines(c, m.lines, m.x, m.y + 9, f.label, 20);
      c.restore();
    }
    for (const fl of g.flies) {
      const i = g.baskets[fl.who].indexOf(fl.m), to = target(fl.who, i), e = ease(fl.t);
      drawStar(c, lerp(fl.x0, to.x, e), lerp(fl.y0, to.y, e), lerp(5, 3.4, e), 1, true);
    }
    for (const pp of g.pops) {
      c.save();
      if (pp.who) c.rotate(180, pp.x, pp.y);
      drawLines(c, [pp.text], pp.x, pp.y - 36 - pp.t * 20, f.italic, 16, 1 - pp.t, C.gold);
      c.restore();
    }
  };

  useLoop((dt) => {
    step(dt);
    pic.value = record(W, H, draw);
  }, !!fonts);

  return (
    <View style={styles.root} onTouchStart={onTouch}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Picture picture={pic} />
      </Canvas>
    </View>
  );
}

/* ---------------- results ---------------- */

function DuelResults({ r, onAgain }) {
  const { width: W } = useWindowDimensions();
  const fonts = useSkyFonts();
  const { head, lines } = duelSummary(r.names, r.baskets, r.fights);
  const colW = (W - 2 * S.lg - S.md) / 2;
  const minis = useMemo(() => {
    if (!fonts) return null;
    const box = { x: 8, y: 14, w: colW - 16, h: 92 };
    return r.baskets.map((b) => record(colW, 120, (c) => drawConstellation(c, b, layout(b, box), { labels: false })));
  }, [fonts, colW, r.baskets]);

  return (
    <View style={styles.root}>
      <StillSky />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.results}>
          <Eyebrow>Duel · {r.names[0]} and {r.names[1]}</Eyebrow>
          <Reading line={head} style={styles.h2} />
          <View style={{ gap: 10 }}>
            {lines.map((l, i) => <Reading key={i} line={l} />)}
          </View>
          <View style={{ flexDirection: 'row', gap: S.md }}>
            {[0, 1].map((p) => (
              <View key={p} style={{ width: colW }}>
                <Eyebrow>{r.names[p]}</Eyebrow>
                {minis && (
                  <Canvas style={{ width: colW, height: 120, backgroundColor: 'transparent' }}>
                    <Picture picture={minis[p]} />
                  </Canvas>
                )}
                {r.baskets[p].length ? r.baskets[p].map((m) => (
                  <View key={m.t} style={styles.row}>
                    <Text style={styles.rowText}>{m.t}</Text>
                    <WhyChip k={m.k} />
                  </View>
                )) : <Text style={styles.sub}>Nothing kept</Text>}
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: S.md }}>
            <Button ghost label="Home" onPress={() => goHome()} style={{ flex: 1 }} />
            <Button label="Rematch" onPress={onAgain} style={{ flex: 2 }} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.sky0 },
  setup: { flex: 1, paddingHorizontal: S.lg, paddingVertical: S.md, gap: S.md },
  h2: { fontFamily: F.serifRegular, fontSize: 30, lineHeight: 36, color: C.ink },
  sub: { fontFamily: F.sans, fontSize: 15, lineHeight: 21, color: C.dim },
  label: { fontFamily: F.sans, fontSize: 12, color: C.dim },
  input: { borderWidth: 1, borderColor: C.line, backgroundColor: 'rgba(20,25,56,0.8)', borderRadius: R.lg, paddingVertical: 13, paddingHorizontal: 14, color: C.ink, fontFamily: F.sans, fontSize: 16 },
  results: { paddingHorizontal: S.lg, paddingVertical: S.md, gap: S.md },
  row: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.line, gap: 3 },
  rowText: { fontFamily: F.serif, fontSize: 14, color: C.ink },
});
