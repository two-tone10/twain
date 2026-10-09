import { Pressable, StyleSheet, Text, View } from 'react-native';
import { C, R, S } from '../lib/theme';

export function Button({ label, onPress, color = C.ink, outline, disabled, small, style }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.btn,
        small && styles.small,
        outline ? { borderColor: color, borderWidth: 1.5 } : { backgroundColor: color },
        (disabled || pressed) && { opacity: disabled ? 0.35 : 0.8 },
        style,
      ]}
    >
      <Text style={[styles.label, small && { fontSize: 14 }, { color: outline ? color : C.surface }]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Eyebrow({ children, color = C.muted }) {
  return <Text style={[styles.eyebrow, { color }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  btn: { borderRadius: R.full, paddingVertical: 14, paddingHorizontal: S.lg, alignItems: 'center' },
  small: { paddingVertical: 8, paddingHorizontal: S.md },
  label: { fontSize: 16, fontWeight: '700' },
  card: { backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: S.md },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
});
