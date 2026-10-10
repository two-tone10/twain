import { Platform, Share, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Guess } from '../../components/Guess';
import { Pick, Waiting } from '../../components/Pick';
import { Reveal } from '../../components/Reveal';
import { Table } from '../../components/Table';
import { Button, Eyebrow } from '../../components/ui';
import { useRoom } from '../../lib/room';
import { useAlbumSave } from '../../lib/useAlbumSave';
import { C, S, serif } from '../../lib/theme';

function roomLink(code) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return `${window.location.origin}/room/${code}`;
  return Linking.createURL(`/room/${code}`);
}

function Center({ children }) {
  return <View style={styles.center}>{children}</View>;
}

export default function Room() {
  const { code: raw } = useLocalSearchParams();
  const code = String(raw || '').toUpperCase();
  const room = useRoom(code);
  const { state, seat } = room;
  const them = 'your partner';
  useAlbumSave(state, seat);

  let body;
  if (!room.configured) {
    body = <Center><Text style={styles.msg}>Rooms aren’t set up in this build.</Text></Center>;
  } else if (room.full) {
    body = (
      <Center>
        <Text style={styles.big}>This room is full.</Text>
        <Button label="Home" onPress={() => router.replace('/')} style={{ marginTop: S.lg }} />
      </Center>
    );
  } else if (!state) {
    body = (
      <Center>
        <Text style={styles.msg}>{room.online ? `Finding room ${code}…` : 'Connecting…'}</Text>
      </Center>
    );
  } else if (room.isHost && !state.guestId) {
    const link = roomLink(code);
    body = (
      <Center>
        <Eyebrow>Room</Eyebrow>
        <Text style={styles.code}>{code}</Text>
        <Text style={styles.msg}>Send this to your partner.</Text>
        <Text style={styles.link} selectable>{link}</Text>
        <Button
          label="Share invite"
          onPress={() => Share.share({ message: `Play Twain with me: ${link}`, url: link }).catch(() => {})}
          style={{ marginTop: S.lg, alignSelf: 'stretch' }}
        />
        <Text style={[styles.msg, { marginTop: S.lg }]}>Waiting for them to join…</Text>
      </Center>
    );
  } else if (state.phase === 'reveal') {
    const names = seat === 'a' ? { a: 'you', b: them } : { a: them, b: 'you' };
    body = <Reveal state={state} names={names} onAgain={() => room.dispatch({ type: 'again' })} />;
  } else if (state.phase === 'pick') {
    body = state.picks[seat]
      ? <Waiting perspective={state.picks[seat]} title={`Waiting for ${them} to pick…`} />
      : <Pick them={them} onPick={(p) => room.dispatch({ type: 'pick', perspective: p })} />;
  } else if (state.phase === 'guess') {
    body = <Guess state={state} seat={seat} dispatch={room.dispatch} them={them} />;
  } else {
    body = <Table state={state} seat={seat} dispatch={room.dispatch} partnerHere={room.partnerHere} them={them} />;
  }

  return <SafeAreaView style={styles.safe}>{body}</SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: S.xl, gap: S.sm },
  code: { fontSize: 64, fontWeight: '800', letterSpacing: 10, color: C.ink },
  msg: { fontSize: 16, color: C.muted, textAlign: 'center' },
  big: { fontFamily: serif, fontSize: 28, color: C.ink },
  link: { fontSize: 14, color: C.ink, textAlign: 'center' },
});
