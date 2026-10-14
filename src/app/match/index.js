// Match: play a drop and send it to one friend, or play again with someone you've matched (no link needed).
// Your matches, the people you match with, and drops friends have sent you.
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Field } from '../../keep/field';
import { recordRound } from '../../keep/records';
import { matchCard, matchDeal, matchFieldRng, newSeed, pairs } from '../../keep/together.mjs';
import { NameGate } from '../../keep/together-ui';
import { Button, Eyebrow, StillSky, goHome } from '../../keep/ui';
import { commonsOn, createMatch, myMatches, rematch } from '../../lib/together';
import { loadMyName } from '../../lib/storage';
import { deckNow } from '../../lib/prefs';
import { C, F, S } from '../../lib/theme';

export default function Matches() {
  const [views, setViews] = useState(null);
  const [name, setName] = useState(undefined);
  const [seed, setSeed] = useState(null);
  const [busy, setBusy] = useState(false);
  const [again, setAgain] = useState(null);

  useFocusEffect(useCallback(() => { myMatches().then(setViews); loadMyName().then(setName); }, []));

  if (seed != null) {
    const deck = deckNow();
    return (
      <Field
        cards={matchDeal(seed, deck)}
        rng={matchFieldRng(seed)}
        who={again ? `Match · ${again.who}` : 'Match'}
        onDone={async (g) => {
          setBusy(true);
          const extra = await recordRound({ ...g, deckKey: deck }, 'challenge');
          const v = again ? await rematch(again.last, seed, deck, g.kept, extra.speed) : await createMatch(seed, deck, g.kept, extra.speed);
          setSeed(null);
          setAgain(null);
          setBusy(false);
          if (v?.id) router.push(`/match/${v.id}`);
        }}
      />
    );
  }

  const ps = pairs(views ?? []);
  const list = (views ?? []).filter(Boolean);

  return (
    <View style={styles.root}>
      <StillSky />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.wrap}>
          <Eyebrow>Match</Eyebrow>
          <Text style={styles.h2}>Send a sky. <Text style={styles.em}>Guess theirs.</Text></Text>
          <Text style={styles.sub}>Play a drop, then send it. Your friend catches the same stars on their phone, and you each guess three of the other’s five.</Text>
          {!commonsOn ? <Text style={styles.sub}>Matches need a connection to Keep’s server. Try again later.</Text> : (
            <>
              <NameGate name={name} onSaved={setName} />
              {name ? <Button label={busy ? 'Sending…' : 'Start a match'} disabled={busy} onPress={() => { setAgain(null); setSeed(newSeed()); }} /> : null}
            </>
          )}

          {ps.length > 0 && (
            <View style={styles.block}>
              <Eyebrow>Your people</Eyebrow>
              {ps.map((p) => (
                <View key={p.who} style={styles.pair}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.who}>{p.who}</Text>
                    <Text style={styles.meta}>{p.matches} {p.matches === 1 ? 'match' : 'matches'}{p.iReadOf ? ` · you read ${p.iRead} of ${p.iReadOf}` : ''}{p.meet ? ` · meet on ${p.meet}` : ''}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <Text style={styles.sync}>{p.sync}%</Text>
                    {name ? <Pressable accessibilityRole="button" hitSlop={8} onPress={() => { setAgain(p); setSeed(newSeed()); }}><Text style={styles.again}>Play again ›</Text></Pressable> : null}
                  </View>
                </View>
              ))}
            </View>
          )}

          {list.length > 0 && (
            <View style={styles.block}>
              <Eyebrow>Matches</Eyebrow>
              {list.map((v) => {
                const c = matchCard(v);
                const status = !v.mine ? 'Sent you a drop' : !v.other ? (v.expired ? 'Ended without a reply' : v.to ? 'Waiting' : 'Waiting for a friend') : !v.mine.guesses ? 'Your turn to guess' : c.sync != null ? `${c.sync}% in sync` : '';
                const yours = status === 'Your turn to guess' || status === 'Sent you a drop';
                return (
                  <Pressable key={v.id} accessibilityRole="button" onPress={() => router.push(`/match/${v.id}`)} style={styles.row}>
                    <Text style={styles.rowT}>{v.other?.name ?? v.to ?? 'Sent'}</Text>
                    <Text style={[styles.meta, yours && { color: C.gold }]}>{status} ›</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          <Button ghost label="Home" onPress={goHome} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.sky0 },
  wrap: { paddingHorizontal: S.lg, paddingVertical: S.md, gap: S.md },
  h2: { fontFamily: F.serifRegular, fontSize: 30, lineHeight: 36, color: C.ink },
  em: { fontFamily: F.serifItalic, color: C.gold },
  sub: { fontFamily: F.sans, fontSize: 14, lineHeight: 20, color: C.dim },
  block: { gap: 4, borderTopWidth: 1, borderTopColor: C.line, paddingTop: S.md },
  pair: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  who: { fontFamily: F.serif, fontSize: 18, color: C.ink },
  meta: { fontFamily: F.sans, fontSize: 12, color: C.faint },
  sync: { fontFamily: F.serifRegular, fontSize: 26, color: C.gold },
  again: { fontFamily: F.sansMedium, fontSize: 12, color: C.gold },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, borderTopWidth: 1, borderTopColor: C.line },
  rowT: { fontFamily: F.serif, fontSize: 16, color: C.ink },
});
