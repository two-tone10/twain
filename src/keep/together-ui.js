// Shared pieces for Match and Circles: a small sky, the three-pick guess, and a first-name gate.
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Canvas, Picture } from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';
import { drawColored, drawConstellation, layout, record, useSkyFonts } from './sky';
import { skyPoint } from './insight.mjs';
import { Button } from './ui';
import { saveMyName } from '../lib/storage';
import { C, F, R, S } from '../lib/theme';

// One constellation, small (no labels) or full width (with labels).
export function MiniSky({ items, h = 130, small = true, width }) {
  const { width: W } = useWindowDimensions();
  const fonts = useSkyFonts();
  const w = width ?? (small ? (W - 2 * S.lg - S.md) / 2 : W);
  const pic = useMemo(() => {
    if (!fonts || !items.length) return null;
    const box = { x: small ? 8 : S.lg, y: 14, w: w - (small ? 16 : 2 * S.lg), h: h - 30 };
    return record(w, h, (c) => drawConstellation(c, items, layout(items, box), { font: small ? null : fonts.small, labels: !small, box, bright: !small }));
  }, [fonts, items, w, h, small]);
  return pic ? <Canvas style={{ width: w, height: h, marginHorizontal: small ? 0 : -S.lg }}><Picture picture={pic} /></Canvas> : <View style={{ height: h }} />;
}

const PALETTE = ['#7bafd4', '#c8a97e', '#ef8f9f', '#a7c48a', '#b79be0', '#6fd0d8', '#f3b98a', '#d9b26a'];
export const personColor = (i) => PALETTE[i % PALETTE.length];

// Everyone's constellation in one sky; a moment kept by more than one person sits on the same spot.
export function GroupSky({ people, h = 240 }) {
  const { width: W } = useWindowDimensions();
  const pic = useMemo(() => {
    const box = { x: S.lg, y: 18, w: W - 2 * S.lg, h: h - 36 };
    const at = (m) => { const p = skyPoint(m); return { x: box.x + p.x * box.w, y: box.y + p.y * box.h }; };
    return record(W, h, (c) => people.forEach((p, i) => drawColored(c, p.items.map(at), personColor(i))));
  }, [people, W, h]);
  return <Canvas style={{ width: W, height: h, marginHorizontal: -S.lg }}><Picture picture={pic} /></Canvas>;
}

// Pick three of the stars that fell. Calls onDone with the three texts.
export function GuessPicker({ options, onDone, label = 'Reveal' }) {
  const [picked, setPicked] = useState([]);
  const toggle = (t) => { Haptics.selectionAsync(); setPicked((p) => (p.includes(t) ? p.filter((x) => x !== t) : p.length < 3 ? [...p, t] : p)); };
  return (
    <View style={{ gap: S.md }}>
      <View style={styles.grid}>
        {options.map((t) => (
          <Pressable key={t} accessibilityRole="checkbox" accessibilityState={{ checked: picked.includes(t) }} onPress={() => toggle(t)} style={[styles.opt, picked.includes(t) && styles.optOn]}>
            <Text style={[styles.optT, picked.includes(t) && { color: C.ink }]}>{t}</Text>
          </Pressable>
        ))}
      </View>
      <Button label={picked.length === 3 ? label : `Pick ${3 - picked.length} more`} disabled={picked.length !== 3} onPress={() => onDone(picked)} />
    </View>
  );
}

// Friends see your first name. Asked once, then remembered (also in Settings).
export function NameGate({ name, onSaved }) {
  const [v, setV] = useState(name ?? '');
  if (name) return null;
  const save = async () => { const n = v.trim(); if (!n) return; await saveMyName(n); onSaved(n); };
  return (
    <View style={styles.gate}>
      <Text style={styles.gateT}>What should friends call you?</Text>
      <TextInput value={v} onChangeText={setV} onSubmitEditing={save} placeholder="First name" placeholderTextColor={C.faint} maxLength={20} style={styles.input} returnKeyType="done" />
      <Button small label="Save" disabled={!v.trim()} onPress={save} />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opt: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: R.lg, borderWidth: 1, borderColor: C.line, maxWidth: '100%' },
  optOn: { borderColor: C.gold, backgroundColor: C.accentWash },
  optT: { fontFamily: F.serif, fontSize: 15, color: C.dim },
  gate: { gap: 10, padding: S.md, borderRadius: R.xl, borderWidth: 1, borderColor: C.cardLine, backgroundColor: C.card },
  gateT: { fontFamily: F.serif, fontSize: 18, color: C.ink },
  input: { borderWidth: 1, borderColor: C.line, backgroundColor: C.inset, borderRadius: R.lg, paddingVertical: 11, paddingHorizontal: 12, color: C.ink, fontFamily: F.sans, fontSize: 16 },
});
