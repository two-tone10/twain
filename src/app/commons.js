// The commons: what everyone's keeping this week, the stars almost nobody catches, and what's rising.
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WHY } from '../keep/content.mjs';
import { Button, Eyebrow, StillSky, goHome } from '../keep/ui';
import { commonsBoard, commonsOn } from '../lib/commons';
import { C, F, R, S } from '../lib/theme';

const SECTIONS = [
  ['most', 'Most caught', 'This week, across everyone.'],
  ['rare', 'Almost nobody catches', 'The quiet ones. If you keep these, you’re rare.'],
  ['rising', 'Rising', 'Caught more this week than last.'],
];

export default function Commons() {
  const [board, setBoard] = useState(undefined);
  useEffect(() => { commonsBoard().then(setBoard); }, []);

  return (
    <View style={styles.root}>
      <StillSky />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.wrap}>
          <Eyebrow>The commons</Eyebrow>
          <Text style={styles.h2}>Everyone’s <Text style={styles.em}>sky.</Text></Text>
          {!commonsOn && <Text style={styles.empty}>Opening soon. Your rounds stay on your phone until then.</Text>}
          {commonsOn && board === undefined && <Text style={styles.empty}>Looking up…</Text>}
          {commonsOn && board === null && <Text style={styles.empty}>Couldn’t reach the commons. Try again in a bit.</Text>}
          {board && !SECTIONS.some(([key]) => board[key]?.length) && <Text style={styles.empty}>The board fills in as people play. Check back in a few days.</Text>}
          {board && SECTIONS.map(([key, title, sub]) => (board[key]?.length ? (
            <View key={key} style={styles.block}>
              <Eyebrow>{title}</Eyebrow>
              <Text style={styles.sub}>{sub}</Text>
              {board[key].map((m) => (
                <View key={m.t} style={styles.row}>
                  <View style={[styles.dot, { backgroundColor: WHY[m.k]?.color ?? C.gold }]} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.t}>{m.t}</Text>
                    <View style={styles.track}><View style={[styles.bar, { width: `${Math.max(2, Math.min(100, Number(m.pct)))}%`, backgroundColor: WHY[m.k]?.color ?? C.gold }]} /></View>
                  </View>
                  <Text style={styles.pct}>{Math.round(Number(m.pct))}%</Text>
                </View>
              ))}
            </View>
          ) : null))}
          <View style={styles.block}>
            <Text style={styles.sub}>Got a moment of your own? Add it to your stars. It falls only for you.</Text>
            <Button label="Your stars" onPress={() => router.push('/add-star')} />
          </View>
          <Button ghost label="Back" onPress={goHome} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.sky0 },
  wrap: { paddingHorizontal: S.lg, paddingVertical: S.md, gap: S.md },
  h2: { fontFamily: F.serifRegular, fontSize: 32, lineHeight: 38, color: C.ink },
  em: { fontFamily: F.accent, color: C.gold },
  empty: { fontFamily: F.sans, fontSize: 15, lineHeight: 22, color: C.faint },
  block: { gap: 8, borderTopWidth: 1, borderTopColor: C.line, paddingTop: S.md },
  sub: { fontFamily: F.sans, fontSize: 13, color: C.faint },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  t: { fontFamily: F.serif, fontSize: 16, color: C.ink },
  track: { height: 3, borderRadius: 2, backgroundColor: C.line, overflow: 'hidden' },
  bar: { height: 3, borderRadius: R.full, opacity: 0.8 },
  pct: { fontFamily: F.sansMedium, fontSize: 13, color: C.dim, width: 40, textAlign: 'right', fontVariant: ['tabular-nums'] },
});
