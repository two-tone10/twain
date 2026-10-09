import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ROLES, TILE } from '../game/content.mjs';
import { Button, Card, Eyebrow } from '../components/ui';
import { loadAlbum } from '../lib/storage';
import { C, S, roleColor, serif } from '../lib/theme';

export default function Album() {
  const [days, setDays] = useState([]);
  useEffect(() => {
    loadAlbum().then(setDays);
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Button label="‹ Home" outline small color={C.muted} onPress={() => router.back()} style={{ alignSelf: 'flex-start' }} />
        <Text style={styles.title}>Album</Text>
        <Text style={styles.sub}>
          {days.length ? `${days.length} ${days.length === 1 ? 'day' : 'days'} built together.` : 'Saturdays you build together land here.'}
        </Text>
        {days.map((d) => (
          <Card key={d.key} style={{ gap: S.xs }}>
            <View style={styles.row}>
              <Eyebrow>{new Date(d.at).toLocaleDateString()}</Eyebrow>
              {d.full ? <Eyebrow color={C.ink}>Full day</Eyebrow> : null}
            </View>
            <Text style={styles.emojis}>{d.board.map((id) => (id ? TILE[id].emoji : '·')).join('  ')}</Text>
            {ROLES[d.role] ? (
              <Text style={[styles.as, { color: roleColor(d.role) }]}>as {ROLES[d.role].name}</Text>
            ) : null}
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: S.lg, gap: S.md, maxWidth: 560, width: '100%', alignSelf: 'center' },
  title: { fontFamily: serif, fontSize: 40, color: C.ink, fontWeight: '600' },
  sub: { fontSize: 16, color: C.muted, marginTop: -S.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  emojis: { fontSize: 26 },
  as: { fontSize: 13, fontWeight: '700' },
});
