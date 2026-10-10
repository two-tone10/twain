import { StyleSheet, Text, View } from 'react-native';
import { C, S, serif } from '../lib/theme';
import { Button, Eyebrow } from './ui';

export const seatName = (seat) => (seat === 'a' ? 'Player 1' : 'Player 2');

export function Handover({ seat, onGo }) {
  return (
    <View style={styles.wrap}>
      <Eyebrow>Pass the phone</Eyebrow>
      <Text style={styles.title}>{seatName(seat)}, you’re up.</Text>
      <Text style={styles.small}>No peeking, {seat === 'a' ? 'Player 2' : 'Player 1'}.</Text>
      <Button label={`I’m ${seatName(seat)}`} onPress={onGo} style={{ marginTop: S.lg, alignSelf: 'stretch' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', padding: S.xl, gap: S.sm, maxWidth: 520, width: '100%', alignSelf: 'center' },
  title: { fontFamily: serif, fontSize: 36, color: C.ink, fontWeight: '600' },
  small: { fontSize: 15, color: C.muted },
});
