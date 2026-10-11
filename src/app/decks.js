// Pick which moments fall. Every deck carries all seven whys.
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { DECKS, WHYS, poolFor } from '../keep/content.mjs';
import { Button, Eyebrow, StillSky, goHome } from '../keep/ui';
import { deckNow, setDeck } from '../lib/prefs';
import { C, F, R, S } from '../lib/theme';

export default function Decks() {
  const [deck, pick] = useState(deckNow());
  const pool = poolFor(deck);
  const choose = (d) => { Haptics.selectionAsync(); pick(d); setDeck(d); };

  return (
    <View style={styles.root}>
      <StillSky />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.wrap}>
          <Eyebrow>Your sky</Eyebrow>
          <Text style={styles.h2}>Which moments should fall?</Text>
          <View style={{ gap: 8 }}>
            {DECKS.map((d) => {
              const on = deck === d.key;
              return (
                <Pressable key={d.key} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => choose(d.key)} style={[styles.deck, on && styles.deckOn]}>
                  <Text style={[styles.name, on && { color: C.gold }]}>{d.name}</Text>
                  <Text style={styles.who}>{d.who}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.sample}>
            <Eyebrow color={C.faint}>A few from this deck</Eyebrow>
            {WHYS.map((w) => (
              <View key={w.key} style={styles.row}>
                <View style={[styles.dot, { backgroundColor: w.color }]} />
                <Text style={styles.t}>{pool[w.key][0]}</Text>
              </View>
            ))}
          </View>
          <Button label="Done" onPress={goHome} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.sky0 },
  wrap: { paddingHorizontal: S.lg, paddingVertical: S.md, gap: S.md },
  h2: { fontFamily: F.serifRegular, fontSize: 30, lineHeight: 36, color: C.ink },
  deck: { paddingVertical: 13, paddingHorizontal: 14, borderRadius: R.lg, borderWidth: 1, borderColor: C.line, gap: 2 },
  deckOn: { borderColor: C.gold, backgroundColor: 'rgba(216,180,106,0.08)' },
  name: { fontFamily: F.serif, fontSize: 17, color: C.ink },
  who: { fontFamily: F.sans, fontSize: 13, color: C.faint },
  sample: { gap: 2, borderTopWidth: 1, borderTopColor: C.line, paddingTop: S.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  t: { fontFamily: F.serif, fontSize: 16, color: C.ink },
});
