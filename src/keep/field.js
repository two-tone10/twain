import { useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Canvas, Picture } from '@shopify/react-native-skia';
import { useSharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { BASKET, ROUND_MS, SOLO_PER_WHY } from './content.mjs';
import { deal } from './insight.mjs';
import { COMBO_MS } from './fun.mjs';
import { chime, cometChime, loadSounds } from './sound';
import {
  EMPTY, drawBar, drawCaps, drawConstellation, drawGhosts, drawLines, drawSky, drawStar, drawTrail,
  ease, layout, lerp, record, starfield, useLoop, useSkyFonts, wrap,
} from './sky';
import { goHome } from './ui';
import { calmNow, deckNow } from '../lib/prefs';
import { C } from '../lib/theme';

/* ---------------- the drop ---------------- */

// The falling field. Drop uses it as is; Pass it around gives it a shorter round, each player's deck and name;
// the daily passes its own pre-dealt `cards` and a seeded `rng` so every phone sees the same sky.
// One comet may streak across each round, and quick catches in a row build a combo. Both score speed only.
export function Field({ skies = [], onDone, roundMs = ROUND_MS, deck, who, cards, rng = Math.random }) {
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
  const game = () => (G.current ??= {
    deckKey: cards ? 'everyday' : deck ?? deckNow(),
    deck: cards ? cards.map((c) => ({ ...c })) : deal(SOLO_PER_WHY, rng, deck ?? deckNow()),
    live: [], kept: [], gone: [], swaps: [], flies: [], fx: [], pops: [], gt: 0, T: 0, scale: 1, next: 300, pending: null, over: false, field: starfield(W, H),
    calm: calmNow() ? 1.5 : 1,
    cometAt: rng() < 0.8 ? roundMs * (0.25 + rng() * 0.5) : null, combo: 0, bestCombo: 0, lastCatch: -1e9, comets: 0,
  });
  useEffect(() => { loadSounds(); }, []);

  const pts = () => layout(game().kept, geo.sky);

  const spawn = (comet = false) => {
    const g = game();
    const c = g.deck.shift();
    if (!c) return;
    const { lines, mw } = wrap(fonts.label, c.t, Math.min(170, W * 0.48));
    const pad = mw / 2 + 12;
    const p = g.gt / roundMs;
    if (comet) {
      // A comet crosses the sky on a diagonal in under two seconds.
      const fromLeft = rng() < 0.5;
      g.live.push({ ...c, comet: true, lines, mw, pad, x: fromLeft ? pad : W - pad, vx: ((fromLeft ? 1 : -1) * W * 0.42) / g.calm, born: g.gt, dur: 1900 * g.calm, trail: [], y: geo.top });
      return;
    }
    g.live.push({ ...c, lines, mw, pad, x: pad + rng() * (W - 2 * pad), vx: (rng() - 0.5) * 50, born: g.gt, dur: (6200 - 2800 * p) * g.calm, trail: [], y: geo.top });
  };

  // Catches within COMBO_MS of each other build a combo; the chime climbs with it.
  const caught = (m) => {
    const g = game();
    g.combo = g.gt - g.lastCatch <= COMBO_MS ? g.combo + 1 : 1;
    g.lastCatch = g.gt;
    g.bestCombo = Math.max(g.bestCombo, g.combo);
    if (m.comet) { g.comets++; cometChime(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } else chime(g.combo);
    if (g.combo >= 2 || m.comet) g.pops.push({ x: m.x, y: m.y, t: 0, label: m.comet ? 'comet' : `×${g.combo}` });
  };

  const keep = (m) => {
    const g = game();
    g.live.splice(g.live.indexOf(m), 1);
    m.dwell = (g.gt - m.born) / m.dur;
    m.tapped = g.gt;
    m.landed = false;
    g.kept.push(m);
    g.flies.push({ m, x0: m.x, y0: m.y, t: 0 });
    Haptics.impactAsync(g.combo >= 2 ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
    caught(m);
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
    caught(inn);
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
    const p = Math.min(1, g.gt / roundMs);
    if (g.cometAt != null && g.gt >= g.cometAt && g.deck.length) { g.cometAt = null; spawn(true); }
    if (g.gt >= g.next && g.deck.length) { spawn(); g.next = g.gt + (1500 - 750 * p) * (g.calm > 1 ? 1.3 : 1); }
    for (const m of g.live.slice()) {
      const f = (g.gt - m.born) / m.dur;
      m.y = geo.top - 10 + f * (geo.fadeY - geo.top + 30);
      m.x += (m.vx * dt * g.scale) / 1000;
      if (m.x < m.pad) { m.x = m.pad; m.vx = Math.abs(m.vx); }
      if (m.x > W - m.pad) { m.x = W - m.pad; m.vx = -Math.abs(m.vx); }
      m.trail.unshift([m.x, m.y]);
      m.trail.length = Math.min(m.trail.length, m.comet ? 36 : 20);
      if (f >= 1) {
        if (g.pending === m) cancelPending();
        m.left = g.gt;
        g.gone.push(m);
        g.live.splice(g.live.indexOf(m), 1);
      }
    }
    g.flies = g.flies.filter((fl) => { fl.t += dt / 480; if (fl.t >= 1) { fl.m.landed = true; return false; } return true; });
    g.fx = g.fx.filter((f) => (f.t += dt / 900) < 1);
    g.pops = g.pops.filter((f) => (f.t += dt / 800) < 1);
    if (g.gt >= roundMs || (!g.deck.length && !g.live.length && !g.flies.length)) finish();
  };

  const draw = (c) => {
    const g = game(), f = fonts, sky = geo.sky;
    drawSky(c, W, H, g.field, g.T);

    // hud
    const full = g.kept.length >= BASKET;
    const hint = g.pending ? 'Tap a star in your sky to let it go' : full ? 'Full · tap a falling star to swap' : who ? `${who} · keep five` : 'Keep five';
    drawCaps(c, hint, 22, geo.hudY, f.caps, C.gold, 0.95);
    if (g.combo >= 2 && g.gt - g.lastCatch <= COMBO_MS) drawCaps(c, `×${g.combo}`, W - 60, geo.hudY, f.caps, C.glow, 1, 'left', 2);
    const left = Math.max(0, 1 - g.gt / roundMs);
    drawBar(c, 22, geo.hudY + 9, W - 44, 2, C.line);
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
      drawTrail(c, m.trail, al * dim * (m.comet ? 1.6 : 1));
      drawStar(c, m.x, m.y, m.comet ? 6.5 : 4.5, al * dim, g.pending === m || m.comet);
      drawLines(c, m.lines, m.x, m.y + 10, f.label, 21, al * dim, m.comet ? C.glow : undefined);
    }

    // catches in flight
    for (const fl of g.flies) {
      const i = g.kept.indexOf(fl.m), to = all[i];
      if (!to) continue;
      const e = ease(fl.t);
      drawStar(c, lerp(fl.x0, to.x, e), lerp(fl.y0, to.y, e) - Math.sin(e * Math.PI) * 50, lerp(5, 3.4, e), 1, true);
    }

    // combo and comet pops float up and fade
    for (const p of g.pops) drawCaps(c, p.label, p.x, p.y - 18 - p.t * 40, f.caps, C.glow, 1 - p.t, 'center', 2);

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
});
