import { StyleSheet, Text, View } from 'react-native';
import { OTHER, ROLES } from '../game/content.mjs';
import { C, S, roleColor, roleTint, serif } from '../lib/theme';
import { Button, Eyebrow } from './ui';

export function Intro({ role, round, onGo, local }) {
  const p = ROLES[role];
  const partner = ROLES[OTHER[role]];
  return (
    <View style={[styles.wrap, { backgroundColor: roleTint(role) }]}>
      <Eyebrow>{local ? `Hand the phone over · Round ${round}` : `Round ${round}`}</Eyebrow>
      <Text style={styles.you}>You are</Text>
      <Text style={[styles.name, { color: roleColor(role) }]}>{p.name}</Text>
      <Text style={styles.line}>{p.line}</Text>
      <Text style={[styles.nudge, { color: roleColor(role) }]}>{p.nudge}</Text>
      <Text style={styles.small}>
        {partner.name} sees what you can’t. Fill one Saturday together.
      </Text>
      <Button label="Into it" color={roleColor(role)} onPress={onGo} style={{ marginTop: S.lg, alignSelf: 'stretch' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', padding: S.xl },
  you: { marginTop: S.lg, fontSize: 18, color: C.muted },
  name: { fontSize: 44, fontWeight: '800', marginTop: S.xs },
  line: { fontFamily: serif, fontStyle: 'italic', fontSize: 20, lineHeight: 28, color: C.ink, marginTop: S.md },
  nudge: { fontSize: 17, fontWeight: '700', marginTop: S.md },
  small: { fontSize: 14, color: C.muted, marginTop: S.lg, lineHeight: 20 },
});
