import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PERSPECTIVES, ROLES } from '../game/content.mjs';
import { C, R, S, roleColor, roleTint, serif } from '../lib/theme';
import { Eyebrow } from './ui';

export function PerspectiveCards({ onPick }) {
  return (
    <View style={{ gap: S.sm }}>
      {PERSPECTIVES.map((p) => (
        <Pressable
          key={p}
          accessibilityRole="button"
          onPress={() => onPick(p)}
          style={({ pressed }) => [styles.card, { backgroundColor: roleTint(p), borderColor: roleColor(p) }, pressed && { opacity: 0.8 }]}
        >
          <Text style={[styles.name, { color: roleColor(p) }]}>{ROLES[p].name}</Text>
          <Text style={styles.line}>{ROLES[p].line}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Pick({ onPick, label, them }) {
  return (
    <View style={styles.wrap}>
      <Eyebrow>{label ? `${label} · in secret` : 'In secret'}</Eyebrow>
      <Text style={styles.title}>Pick your side.</Text>
      <PerspectiveCards onPick={onPick} />
      <Text style={styles.small}>
        {cap(them)} won’t see it. You’ll also get a Mask: one tile from the other side you secretly need. At the Turn you can switch sides. After five rounds, read {them}.
      </Text>
    </View>
  );
}

export function Waiting({ title, perspective, note }) {
  return (
    <View style={styles.wrap}>
      {perspective ? (
        <>
          <Eyebrow>You’re playing</Eyebrow>
          <Text style={[styles.name, { color: roleColor(perspective), fontSize: 36 }]}>{ROLES[perspective].name}</Text>
          <Text style={styles.small}>Keep it to yourself.</Text>
        </>
      ) : null}
      <Text style={[styles.wait, perspective && { marginTop: S.xl }]}>{title}</Text>
      {note ? <Text style={styles.small}>{note}</Text> : null}
    </View>
  );
}

export const cap = (s) => s[0].toUpperCase() + s.slice(1);

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', padding: S.xl, gap: S.sm, maxWidth: 520, width: '100%', alignSelf: 'center' },
  title: { fontFamily: serif, fontSize: 36, color: C.ink, fontWeight: '600', marginBottom: S.sm },
  card: { borderRadius: R.lg, borderWidth: 1.5, padding: S.md, gap: 4 },
  name: { fontSize: 24, fontWeight: '800' },
  line: { fontFamily: serif, fontStyle: 'italic', fontSize: 16, lineHeight: 22, color: C.ink },
  small: { fontSize: 14, color: C.muted, marginTop: S.sm, lineHeight: 20 },
  wait: { fontSize: 17, color: C.muted, fontWeight: '600' },
});
