import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Canvas, Picture } from '@shopify/react-native-skia';
import { useSharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { BASKET, ROUND_MS, SOLO_PER_WHY } from '../keep/content.mjs';
import { deal } from '../keep/insight.mjs';
import {
  EMPTY, drawBar, drawCaps, drawConstellation, drawGhosts, drawLines, drawSky, drawStar, drawTrail,
  ease, layout, lerp, record, starfield, useLoop, useSkyFonts, wrap,
} from '../keep/sky';
import { Outcome } from '../keep/outcome';
import { goHome } from '../keep/ui';
import { addRound, addSky, loadSkies } from '../lib/storage';
import { C, F, R, S } from '../lib/theme';

export default function Play() {
  const [phase, setPhase] = useState('play');
  const [round, setRound] = useState(0);
  const [skies, setSkies] = useState(null);
  const [game, setGame] = useState(null);

  useEffect(() => { loadSkies().then(setSkies); }, [round]);

  const finished = (g) => {
    addRound(g.kept);
    if (g.kept.length) addSky(g.kept);
    setGame(g);
    setPhase('done');
  };
  const again = () => { setRound((r) => r + 1); setPhase('play'); };

  if (phase === 'done') return <Outcome key={round} g={game} onAgain={again} />;
  return skies ? <Field key={round} skies={skies} onDone={finished} /> : <View style={styles.root} />;
}

/* ---------------- the drop ---------------- */

function Field({ skies, onDone }) {
  const { width: W, height: H } = useWindowDimensions();
  const ins = useSafeAreaInsets();
  const fonts = useSkyFonts();
  const pic = useSharedValue(EMPTY);

  const geo = useMemo(() => {
    const sky = { x: 22, y: H - ins.bottom - 214, w: W - 44, h: 190 };
    return { hudY: ins.top + 20, top: ins.top + 44, fadeY: sky.y - 8, sky };
  }, [W, H, ins.top, ins.bottom]);

  // Mutable game state lives in a ref and is only touched from the loop and touch handlers.
  const G = useRef(null);
  const game = () => (G.current ??= { deck: deal(SOLO_PER_WHY), live: [], kept: [], gone: [], swaps: [], flies: [], fx: [], gt: 0, T: 0, scale: 1, next: 300, pending: null, over: false, field: starfield(W, H) });

  const pts = () => layout(game().kept, geo.sky);

  const spawn = () => {
    const g = game();
    const c = g.deck.shift();
    if (!c) return;
    const { lines, mw } = wrap(fonts.label, c.t, Math.min(170, W * 0.48));
    const pad = mw / 2 + 12;
    const p = g.gt / ROUND_MS;
    g.live.push({ ...c, lines, mw, pad, x: pad + Math.random() * (W - 2 * pad), vx: (Math.random() - 0.5) * 50, born: g.gt, dur: 6200 - 2800 * p, trail: [], y: geo.top });
  };

  const keep = (m) => {
    const g = game();
    g.live.splice(g.live.indexOf(m), 1);
    m.dwell = (g.gt - m.born) / m.dur;
    m.tapped = g.gt;
    m.landed = false;
    g.kept.push(m);
    g.flies.push({ m, x0: m.x, y0: m.y, t: 0 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const setPending = (m) => { const g = game(); g.pending = m; g.scale = 0.12; Haptics.selectionAsync(); };
  const cancelPending = () => { const g = game(); g.pending = null; g.scale = 1; };

  const swap = (i) => {
    const g = game(), inn = g.pending, out = g.kept[i], at = pts()[i];
    cancelPending();
    out.thrown = true;
    g.gone.push(out);
    g.swaps.push({ out, inn });
    g.fx.push({ x: at.x, y: at.y, t: 0, label: out.t });
    g.live.splice(g.live.indexOf(inn), 1);
    inn.dwell = (g.gt - inn.born) / inn.dur;
    inn.tapped = g.gt;
    inn.landed = false;
    g.kept[i] = inn;
    g.flies.push({ m: inn, x0: inn.x, y0: inn.y, t: 0 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const hitFalling = (x, y) => {
    const live = game().live;
    for (let i = live.length - 1; i >= 0; i--) {
      const m = live[i];
      const inHead = Math.hypot(x - m.x, y - m.y) < 28;
      const inLabel = Math.abs(x - m.x) < m.mw / 2 + 10 && y > m.y && y < m.y + 18 + m.lines.length * 21;
      if (inHead || inLabel) return m;
    }
    return null;
  };

  const onTouch = (e) => {
    const g = game();
    if (g.over || !fonts) return;
    const { locationX: x, locationY: y } = e.nativeEvent;
    if (g.pending) {
      const p = pts();
      const i = p.findIndex((pt, j) => g.kept[j].landed && Math.hypot(x - pt.x, y - pt.y) < 30);
      if (i >= 0) return swap(i);
      const m = hitFalling(x, y);
      cancelPending();
      if (m) setPending(m);
      return;
    }
    const m = hitFalling(x, y);
    if (!m) return;
    if (g.kept.length < BASKET) keep(m);
    else setPending(m);
  };

  const finish = () => {
    const g = game();
    if (g.over) return;
    g.over = true;
    cancelPending();
    for (const m of g.live) { m.left = g.gt; g.gone.push(m); }
    setTimeout(() => onDone(g), 700);
  };

  const step = (dt) => {
    const g = game();
    g.T += dt;
    if (g.over) return;
    g.gt += dt * g.scale;
    const p = Math.min(1, g.gt / ROUND_MS);
    if (g.gt >= g.next && g.deck.length) { spawn(); g.next = g.gt + 1500 - 750 * p; }
    for (const m of g.live.slice()) {
      const f = (g.gt - m.born) / m.dur;
      m.y = geo.top - 10 + f * (geo.fadeY - geo.top + 30);
      m.x += (m.vx * dt * g.scale) / 1000;
      if (m.x < m.pad) { m.x = m.pad; m.vx = Math.abs(m.vx); }
      if (m.x > W - m.pad) { m.x = W - m.pad; m.vx = -Math.abs(m.vx); }
      m.trail.unshift([m.x, m.y]);
      m.trail.length = Math.min(m.trail.length, 20);
      if (f >= 1) {
        if (g.pending === m) cancelPending();
        m.left = g.gt;
        g.gone.push(m);
        g.live.splice(g.live.indexOf(m), 1);
      }
    }
    g.flies = g.flies.filter((fl) => { fl.t += dt / 480; if (fl.t >= 1) { fl.m.landed = true; return false; } return true; });
    g.fx = g.fx.filter((f) => (f.t += dt / 900) < 1);
    if (g.gt >= ROUND_MS || (!g.deck.length && !g.live.length && !g.flies.length)) finish();
  };

  const draw = (c) => {
    const g = game(), f = fonts, sky = geo.sky;
    drawSky(c, W, H, g.field, g.T);

    // hud
    const full = g.kept.length >= BASKET;
    const hint = g.pending ? 'Tap a star in your sky to let it go' : full ? 'Full · tap a falling star to swap' : 'Keep five';
    drawCaps(c, hint, 22, geo.hudY, f.caps, C.gold, 0.95);
    const left = Math.max(0, 1 - g.gt / ROUND_MS);
    drawBar(c, 22, geo.hudY + 9, W - 44, 2, 'rgba(239,230,214,0.12)');
    drawBar(c, 22, geo.hudY + 9, (W - 44) * left, 2, C.gold);

    // your sky
    drawGhosts(c, skies, sky);
    const all = pts();
    const landed = g.kept.map((m, i) => (m.landed ? i : -1)).filter((i) => i >= 0);
    if (landed.length) drawConstellation(c, landed.map((i) => g.kept[i]), landed.map((i) => all[i]), { font: f.small, box: sky, T: g.T, bright: g.kept.length === BASKET && !g.flies.length });
    else if (!g.flies.length) drawLines(c, ['your sky'], W / 2, sky.y + sky.h / 2 - 10, f.italic, 16, 0.35);
    if (g.pending) landed.forEach((i, n) => drawStar(c, all[i].x, all[i].y, 6 + Math.sin(g.T * 0.008 + n) * 1.5, 0.5, true));

    // falling stars
    for (const m of g.live) {
      const al = Math.max(0, Math.min(1, (geo.fadeY - m.y) / 70));
      const dim = g.pending && g.pending !== m ? 0.45 : 1;
      drawTrail(c, m.trail, al * dim);
      drawStar(c, m.x, m.y, 4.5, al * dim, g.pending === m);
      drawLines(c, m.lines, m.x, m.y + 10, f.label, 21, al * dim);
    }

    // catches in flight
    for (const fl of g.flies) {
      const i = g.kept.indexOf(fl.m), to = all[i];
      if (!to) continue;
      const e = ease(fl.t);
      drawStar(c, lerp(fl.x0, to.x, e), lerp(fl.y0, to.y, e) - Math.sin(e * Math.PI) * 50, lerp(5, 3.4, e), 1, true);
    }

    // a star let go drifts down and fades
    for (const fx of g.fx) {
      drawStar(c, fx.x, fx.y + fx.t * 60, 3.4 * (1 - fx.t), 1 - fx.t);
      drawLines(c, [fx.label], fx.x, fx.y + fx.t * 60 + 8, f.small, 13, (1 - fx.t) * 0.7);
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
      <Pressable accessibilityRole="button" accessibilityLabel="Quit round" onPress={() => goHome()} hitSlop={12} style={[styles.quit, { top: ins.top + 6 }]}>
        <Text style={styles.quitText}>✕</Text>
      </Pressable>
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

