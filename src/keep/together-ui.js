// Shared pieces for Match and Circles: a small sky, the three-pick guess, picking your star name,
// and the hide / report / remove menu for a person.
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Canvas, Picture } from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';
import { drawColored, drawConstellation, layout, record, useSkyFonts } from './sky';
import { skyPoint } from './insight.mjs';
import { Button } from './ui';
import { saveMyName } from '../lib/storage';
import { anotherStar } from './names.mjs';
import { hidePerson, removeMember, reportPerson } from '../lib/safety';
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
// Before your first match or circle: the star name friends will see. Picked, never typed.
export function NameGate({ name, onSaved }) {
  const [v, setV] = useState(() => anotherStar(''));
  if (name) return null;
  const save = async () => { await saveMyName(v); onSaved(v); };
  return (
    <View style={styles.gate}>
      <Text style={styles.gateT}>Friends will see you as</Text>
      <Text style={styles.star}>{v}</Text>
      <Text style={styles.gateS}>A star name, so Keep never needs yours. Change it anytime in You.</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button small ghost label="Another" onPress={() => { Haptics.selectionAsync(); setV(anotherStar(v)); }} style={{ flex: 1 }} />
        <Button small label={`Use ${v}`} onPress={save} style={{ flex: 1.4 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opt: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: R.lg, borderWidth: 1, borderColor: C.line, maxWidth: '100%' },
  optOn: { borderColor: C.gold, backgroundColor: C.accentWash },
  optT: { fontFamily: F.serif, fontSize: 15, color: C.dim },
  gate: { gap: 10, padding: S.md, borderRadius: R.xl, borderWidth: 1, borderColor: C.cardLine, backgroundColor: C.card },
  gateT: { fontFamily: F.sans, fontSize: 14, color: C.dim },
  gateS: { fontFamily: F.sans, fontSize: 13, lineHeight: 18, color: C.faint },
  star: { fontFamily: F.serifRegular, fontSize: 34, color: C.gold },
});

// Hide, report, or (for a circle's owner) remove someone. `where` is { match: id } or { code, mid }.
// Hiding works both ways. Reporting also hides, and puts it in front of Keep's moderator.
export function personMenu({ name, where, canRemove, onDone }) {
  const done = (title, body) => Alert.alert(title, body, [{ text: 'OK', onPress: onDone }]);
  const hide = async () => {
    const r = await hidePerson(where);
    if (r?.ok) done(`${name} is hidden`, 'You won’t see each other’s matches, skies or names again.');
    else Alert.alert('Couldn’t reach Keep’s server', 'Try again in a moment.');
  };
  const report = async () => {
    const r = await reportPerson(where);
    if (r?.ok) done('Thanks for telling us', `${name} is hidden from you, and Keep’s moderator will take a look.`);
    else Alert.alert('Couldn’t reach Keep’s server', 'Try again in a moment.');
  };
  const remove = () => Alert.alert(`Remove ${name}?`, 'They leave the circle and can’t rejoin with the code.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: async () => {
      const r = await removeMember(where.code, where.mid);
      if (r?.ok) onDone?.(); else Alert.alert('Couldn’t remove them', 'Try again in a moment.');
    } },
  ]);
  Alert.alert(name, null, [
    ...(canRemove ? [{ text: 'Remove from circle', onPress: remove }] : []),
    { text: `Hide ${name}`, onPress: hide },
    { text: 'Report and hide', style: 'destructive', onPress: report },
    { text: 'Cancel', style: 'cancel' },
  ]);
}

// The small "more" button that opens personMenu.
export function More({ label, onPress }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={10} onPress={onPress} style={moreStyle}>
      <Text style={moreText}>•••</Text>
    </Pressable>
  );
}
const moreStyle = { width: 32, height: 24, borderRadius: R.full, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' };
const moreText = { fontFamily: F.sansBold, fontSize: 11, letterSpacing: 1, color: C.dim, marginTop: -2 };
