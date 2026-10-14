// Report a star another player added. It stops falling for you straight away; three reports hide it for everyone
// until Keep's moderator looks.
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { EXTRA, WHY } from '../keep/content.mjs';
import { Button, Eyebrow, StillSky, goHome } from '../keep/ui';
import { reportStar } from '../lib/safety';
import { C, F, R, S } from '../lib/theme';

export default function Report() {
  const { stars } = useLocalSearchParams();
  const [list] = useState(() => { try { return JSON.parse(String(stars ?? '[]')).slice(0, 30); } catch { return []; } });
  const [done, setDone] = useState([]);
  const kOf = (t) => EXTRA.find((m) => m.t === t)?.k;

  const report = async (t) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setDone((d) => [...d, t]);
    await reportStar(t);
  };

  return (
    <View style={styles.root}>
      <StillSky />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.wrap}>
          <Eyebrow>From other players</Eyebrow>
          <Text style={styles.h2}>Anything that shouldn’t be up there?</Text>
          <Text style={styles.sub}>A report stops it falling for you right away. Keep’s moderator looks at every one.</Text>
          <View>
            {list.map((t) => (
              <View key={t} style={styles.row}>
                <View style={[styles.dot, { backgroundColor: WHY[kOf(t)]?.color ?? C.faint }]} />
                <Text style={styles.t}>{t}</Text>
                {done.includes(t)
                  ? <Text style={styles.sent}>Reported</Text>
                  : <Pressable accessibilityRole="button" accessibilityLabel={`Report ${t}`} hitSlop={8} onPress={() => report(t)}><Text style={styles.rep}>Report</Text></Pressable>}
              </View>
            ))}
          </View>
          <Button ghost label="Done" onPress={goHome} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.sky0 },
  wrap: { paddingHorizontal: S.lg, paddingVertical: S.md, gap: S.md },
  h2: { fontFamily: F.serifRegular, fontSize: 30, lineHeight: 36, color: C.ink },
  sub: { fontFamily: F.sans, fontSize: 14, lineHeight: 20, color: C.dim },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderTopWidth: 1, borderTopColor: C.line },
  dot: { width: 9, height: 9, borderRadius: R.full },
  t: { flex: 1, fontFamily: F.serif, fontSize: 17, color: C.ink },
  rep: { fontFamily: F.sansMedium, fontSize: 14, color: C.danger },
  sent: { fontFamily: F.sans, fontSize: 13, color: C.faint },
});
