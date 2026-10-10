import { useCallback, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Eyebrow } from '../components/ui';
import { createRoom } from '../lib/room';
import { loadAlbum } from '../lib/storage';
import { C, R, S, serif } from '../lib/theme';

export default function Home() {
  const [code, setCode] = useState('');
  const [days, setDays] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadAlbum().then((a) => setDays(a.length));
    }, []),
  );

  const start = async () => router.push(`/room/${await createRoom()}`);
  const join = () => code.trim().length === 4 && router.push(`/room/${code.trim().toUpperCase()}`);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.wrap}>
        <Text style={styles.title}>Twain</Text>
        <Text style={styles.tag}>Two of you. One Saturday.</Text>
        <View style={styles.pair}>
          <Text style={[styles.persona, { color: C.savorer }]}>The Savorer</Text>
          <Text style={styles.amp}>&</Text>
          <Text style={[styles.persona, { color: C.steward }]}>The Steward</Text>
        </View>
        <Text style={styles.how}>Pick a side in secret. Hide a Mask. Maybe switch. Then read your partner.</Text>

        <Button label="Start a room" onPress={start} style={{ marginTop: S.xl }} />
        <View style={styles.joinRow}>
          <TextInput
            value={code}
            onChangeText={(t) => setCode(t.replace(/[^a-z]/gi, '').slice(0, 4).toUpperCase())}
            placeholder="CODE"
            placeholderTextColor={C.muted}
            autoCapitalize="characters"
            style={styles.input}
            onSubmitEditing={join}
          />
          <Button label="Join" outline disabled={code.length !== 4} onPress={join} style={{ flex: 1 }} />
        </View>
        <Button label="Pass & play on one phone" outline color={C.muted} onPress={() => router.push('/local')} />

        <View style={{ flex: 1 }} />
        <Button
          label={days ? `Album · ${days} ${days === 1 ? 'day' : 'days'}` : 'Album'}
          outline
          small
          color={C.ink}
          onPress={() => router.push('/album')}
          style={{ alignSelf: 'center' }}
        />
        <Eyebrow>{' '}</Eyebrow>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  wrap: { flex: 1, padding: S.lg, gap: S.sm, maxWidth: 520, width: '100%', alignSelf: 'center' },
  title: { fontFamily: serif, fontSize: 56, color: C.ink, marginTop: S.xl, fontWeight: '600' },
  tag: { fontSize: 18, color: C.muted, fontWeight: '600' },
  pair: { flexDirection: 'row', alignItems: 'baseline', gap: S.sm, marginTop: S.lg },
  persona: { fontSize: 20, fontWeight: '800' },
  amp: { fontFamily: serif, fontSize: 20, color: C.muted },
  how: { fontFamily: serif, fontStyle: 'italic', fontSize: 17, lineHeight: 25, color: C.ink, marginTop: S.sm },
  joinRow: { flexDirection: 'row', gap: S.sm, marginVertical: S.xs },
  input: {
    flex: 1, borderRadius: R.full, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface,
    paddingHorizontal: S.lg, fontSize: 18, fontWeight: '800', letterSpacing: 4, color: C.ink,
  },
});
