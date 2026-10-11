import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Canvas, Picture } from '@shopify/react-native-skia';
import { router } from 'expo-router';
import { WHY } from './content.mjs';
import { drawSky, record, starfield } from './sky';
import { C, F, R, S } from '../lib/theme';

// Back to where you came from, or home if a link opened this screen directly.
export const goHome = () => (router.canGoBack() ? router.back() : router.replace('/'));

// A still night sky behind a screen. `draw` adds anything on top, in the same picture.
// `version` changes when whatever `draw` reads has changed.
export function StillSky({ draw, version = 0 }) {
  const { width: w, height: h } = useWindowDimensions();
  const field = useMemo(() => starfield(w, h, 90), [w, h]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pic = useMemo(() => record(w, h, (c) => { drawSky(c, w, h, field, 0); draw?.(c, w, h); }), [w, h, field, version]);
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Picture picture={pic} />
    </Canvas>
  );
}

export function Button({ label, onPress, ghost, disabled, small, style }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.btn,
        small && styles.small,
        ghost ? styles.ghost : { backgroundColor: C.gold },
        (disabled || pressed) && { opacity: disabled ? 0.35 : 0.8 },
        style,
      ]}
    >
      <Text style={[styles.label, small && { fontSize: 15 }, { color: ghost ? C.ink : C.dark }]}>{label}</Text>
    </Pressable>
  );
}

export function Eyebrow({ children, color = C.gold, style }) {
  return <Text style={[styles.eyebrow, { color }, style]}>{children}</Text>;
}

// A reading line: plain strings and { em } segments for moment names.
export function Reading({ line, style }) {
  return (
    <Text style={[styles.reading, style]}>
      {line.map((s, i) => (typeof s === 'string' ? s : <Text key={i} style={styles.em}>{s.em}</Text>))}
    </Text>
  );
}

// A why's color and name. Tapping it opens that why's page.
export function WhyChip({ k, link = true }) {
  const w = WHY[k];
  const body = (
    <>
      <View style={[styles.dot, { backgroundColor: w.color }]} />
      <Text style={[styles.chipText, { color: w.color }]}>{w.name}</Text>
    </>
  );
  if (!link) return <View style={styles.chip}>{body}</View>;
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={`${w.name}: what it means and your history`} hitSlop={8} onPress={() => router.push(`/why/${k}`)} style={styles.chip}>
      {body}
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  btn: { borderRadius: R.full, paddingVertical: 16, paddingHorizontal: S.lg, alignItems: 'center' },
  small: { paddingVertical: 11, paddingHorizontal: S.md },
  ghost: { borderWidth: 1, borderColor: C.line },
  label: { fontFamily: F.sansBold, fontSize: 17 },
  eyebrow: { fontFamily: F.sansMedium, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase' },
  reading: { fontFamily: F.serifRegular, fontSize: 18, lineHeight: 25, color: C.ink },
  em: { fontFamily: F.serifItalic, color: C.gold },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { fontFamily: F.sans, fontSize: 12 },
});
