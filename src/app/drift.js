import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Canvas, PaintStyle, Picture, Skia } from '@shopify/react-native-skia';
import { useSharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { deal, shuffle } from '../keep/insight.mjs';
import { DRIFT, driftReading, fadeStarts } from '../keep/modes.mjs';
import { EMPTY, drawBar, drawCaps, drawLines, drawSky, drawStar, record, starfield, useLoop, useSkyFonts, wrap } from '../keep/sky';
import { Button, Eyebrow, goHome, Reading, StillSky, WhyChip } from '../keep/ui';
import { addHold, addToList } from '../lib/storage';
import { C, F, R, S } from '../lib/theme';
import { deckNow } from '../lib/prefs';

export default function Drift() {
  const [round, setRound] = useState(0);
  const [result, setResult] = useState(null);
  if (result) return <DriftResults stars={result} onAgain={() => { setResult(null); setRound((r) => r + 1); }} />;
  return <Field key={round} onDone={(stars) => { addHold(stars); setResult(stars); }} />;
}

/* ---------------- the field ---------------- */

const ring = Skia.Paint();
ring.setAntiAlias(true);
ring.setStyle(PaintStyle.Stroke);
ring.setStrokeWidth(1.5);
ring.setColor(Skia.Color(C.gold));

function Field({ onDone }) {
  const { width: W, height: H } = useWindowDimensions();
  const ins = useSafeAreaInsets();
  const fonts = useSkyFonts();
  const pic = useSharedValue(EMPTY);
  const top = ins.top + 70, bottom = H - ins.bottom - 70;

  const G = useRef(null);
  const game = () => {
    if (G.current) return G.current;
    // Ten moments from across the whys, set out in two loose columns.
    const picks = deal(2, Math.random, deckNow()).slice(0, DRIFT.count);
    const fades = shuffle(fadeStarts());
    const rowH = (bottom - top) / 5;
    const stars = picks.map((m, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const { lines, mw } = wrap(fonts.label, m.t, W * 0.4);
      return {
        ...m, lines, mw,
        x: W * (col ? 0.71 : 0.29) + (Math.random() - 0.5) * 24,
        y: top + rowH * row + rowH * (col ? 0.42 : 0.12),
        level: 1, fadeAt: fades[i], holdMs: 0, touches: 0, goneAt: null, fall: 0,
      };
    });
    return (G.current = { stars, holds: {}, gt: 0, over: false, field: starfield(W, H) });
  };

  const hit = (x, y) => game().stars.findIndex((s) => s.goneAt == null && Math.abs(x - s.x) < Math.max(36, s.mw / 2 + 8) && y > s.y - 30 && y < s.y + 16 + s.lines.length * 21);

  const onStart = (e) => {
    const g = game();
    if (g.over) return;
    for (const t of e.nativeEvent.changedTouches) {
      const i = hit(t.locationX, t.locationY);
      if (i < 0) continue;
      g.holds[t.identifier] = i;
      g.stars[i].touches++;
      Haptics.selectionAsync();
    }
  };
  const onEnd = (e) => { for (const t of e.nativeEvent.changedTouches) delete game().holds[t.identifier]; };

  const finish = () => {
    const g = game();
    if (g.over) return;
    g.over = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => onDone(g.stars.map(({ t, k, holdMs, touches, goneAt }) => ({ t, k, holdMs, touches, goneAt }))), 900);
  };

  const step = (dt) => {
    const g = game();
    if (g.over) return;
    g.gt += dt;
    const held = new Set(Object.values(g.holds));
    for (const [i, s] of g.stars.entries()) {
      if (s.goneAt != null) { s.fall = Math.min(1, s.fall + dt / 1400); continue; }
      if (held.has(i)) { s.level = Math.min(1, s.level + dt / DRIFT.refillMs); s.holdMs += dt; }
      else if (g.gt >= s.fadeAt) {
        s.level -= dt / DRIFT.fadeMs;
        if (s.level <= 0) { s.level = 0; s.goneAt = g.gt; Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft); }
      }
    }
    if (g.gt >= DRIFT.roundMs || g.stars.every((s) => s.goneAt != null)) finish();
  };

  const draw = (c) => {
    const g = game(), f = fonts;
    drawSky(c, W, H, g.field, g.gt);
    const held = new Set(Object.values(g.holds));
    drawCaps(c, g.gt < 2500 ? 'Touch and hold a star to keep it lit' : 'Hold what you want to keep', 22, ins.top + 20, f.caps, C.gold, 0.95);
    const left = Math.max(0, 1 - g.gt / DRIFT.roundMs);
    drawBar(c, 22, ins.top + 29, W - 44, 2, 'rgba(239,230,214,0.12)');
    drawBar(c, 22, ins.top + 29, (W - 44) * left, 2, C.gold);
    for (const [i, s] of g.stars.entries()) {
      if (s.goneAt != null) {
        const a = 1 - s.fall, dy = s.fall * s.fall * 120;
        if (a <= 0) continue;
        drawStar(c, s.x, s.y + dy, 3, a * 0.5);
        drawLines(c, s.lines, s.x, s.y + dy + 10, f.label, 21, a * 0.3);
        continue;
      }
      const on = held.has(i), fading = g.gt >= s.fadeAt && !on;
      drawStar(c, s.x, s.y, 3 + 2.5 * s.level, 0.25 + 0.75 * s.level, on);
      if (fading || on) {
        ring.setAlphaf(on ? 0.9 : 0.55);
        c.drawArc({ x: s.x - 15, y: s.y - 15, width: 30, height: 30 }, -90, 360 * s.level, false, ring);
      }
      drawLines(c, s.lines, s.x, s.y + 14, f.label, 21, 0.2 + 0.8 * s.level);
    }
  };

  useLoop((dt) => {
    step(dt);
    pic.value = record(W, H, draw);
  }, !!fonts);

  return (
    <View style={styles.root} onTouchStart={onStart} onTouchEnd={onEnd} onTouchCancel={onEnd}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Picture picture={pic} />
      </Canvas>
      <Pressable accessibilityRole="button" accessibilityLabel="Quit round" onPress={() => goHome()} hitSlop={12} style={[styles.quit, { top: ins.top + 6 }]}>
        <Text style={styles.quitText}>✕</Text>
      </Pressable>
    </View>
  );
}

/* ---------------- results ---------------- */

function DriftResults({ stars, onAgain }) {
  const { head, held, lines } = useMemo(() => driftReading(stars), [stars]);
  // Still lit first, then by how long each was held.
  const order = useMemo(() => [...stars].sort((a, b) => (b.goneAt == null) - (a.goneAt == null) || b.holdMs - a.holdMs), [stars]);
  const [picks, setPicks] = useState(() => new Set());
  const [added, setAdded] = useState(null);
  const toggle = (t) => setPicks((s) => { const n = new Set(s); if (n.has(t)) n.delete(t); else n.add(t); return n; });
  const add = async () => {
    const items = held.filter((m) => picks.has(m.t));
    if (items.length) await addToList(items);
    setAdded(items);
  };

  return (
    <View style={styles.root}>
      <StillSky />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.results}>
          <Eyebrow>Drift · {held.length} of {stars.length} still lit</Eyebrow>
          <Text style={styles.h2}>{head}</Text>
          <View style={{ gap: 10 }}>
            {lines.map((l, i) => <Reading key={i} line={l} />)}
          </View>
          <View>
            {order.map((m) => (
              <View key={m.t} style={styles.row}>
                <View style={[styles.lit, m.goneAt == null ? styles.litOn : null]} />
                <Text style={[styles.rowText, m.goneAt != null && { color: C.faint }]}>{m.t}</Text>
                <WhyChip k={m.k} />
              </View>
            ))}
          </View>
          {held.length > 0 && added === null && (
            <View style={styles.bring}>
              <Eyebrow>Bring one into today?</Eyebrow>
              <View style={styles.picks}>
                {held.map((m) => (
                  <Pressable key={m.t} accessibilityRole="checkbox" accessibilityState={{ checked: picks.has(m.t) }} onPress={() => toggle(m.t)} style={[styles.pick, picks.has(m.t) && styles.pickOn]}>
                    <Text style={[styles.pickText, picks.has(m.t) && { color: C.ink }]}>{m.t}</Text>
                  </Pressable>
                ))}
              </View>
              <Button small ghost label={picks.size ? `Add ${picks.size} to today` : 'Not today'} onPress={add} />
            </View>
          )}
          {added?.length > 0 && (
            <View style={styles.bring}>
              <Eyebrow>On your list</Eyebrow>
              <Text style={styles.rowText}>{added.map((m) => m.t).join(' · ')}</Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: S.md }}>
            <Button ghost label="Home" onPress={() => goHome()} style={{ flex: 1 }} />
            <Button label="Drift again" onPress={onAgain} style={{ flex: 2 }} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.sky0 },
  quit: { position: 'absolute', right: 18, width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  quitText: { color: C.faint, fontSize: 16 },
  results: { paddingHorizontal: S.lg, paddingVertical: S.md, gap: S.md },
  h2: { fontFamily: F.serifRegular, fontSize: 30, lineHeight: 35, color: C.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  lit: { width: 8, height: 8, borderRadius: 4, borderWidth: 1, borderColor: C.faint },
  litOn: { backgroundColor: C.star, borderColor: C.glow, shadowColor: C.glow, shadowOpacity: 1, shadowRadius: 6 },
  rowText: { flex: 1, fontFamily: F.serif, fontSize: 16, color: C.ink },
  bring: { gap: 10, borderTopWidth: 1, borderTopColor: 'rgba(216,180,106,0.3)', paddingTop: S.md },
  picks: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pick: { paddingVertical: 8, paddingHorizontal: 13, borderRadius: R.full, borderWidth: 1, borderColor: C.line },
  pickOn: { borderColor: C.gold, backgroundColor: 'rgba(216,180,106,0.12)' },
  pickText: { fontFamily: F.serif, fontSize: 15, color: C.dim },
});
