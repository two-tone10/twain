// One circle: today (who's played, the circle's sky, guessing each other) and the week's awards.
// Each member can be hidden or reported; the circle's owner can also remove them.
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { dailyDeal, dayNumber } from '../../keep/fun.mjs';
import { tableSummary } from '../../keep/table.mjs';
import { toItems, weekAwards } from '../../keep/together.mjs';
import { GroupSky, GuessPicker, More, NameGate, personColor, personMenu } from '../../keep/together-ui';
import { Button, Eyebrow, Reading, StillSky, goHome } from '../../keep/ui';
import { circleDay, circleGuess, circlePreview, circleLink, circleWeek, joinCircle, leaveCircle, myCircles } from '../../lib/together';
import { loadMyName } from '../../lib/storage';
import { C, F, R, S } from '../../lib/theme';

export default function Circle() {
  const code = String(useLocalSearchParams().code ?? '').toUpperCase();
  const [day] = useState(() => dayNumber());
  const [info, setInfo] = useState(undefined);
  const [title, setTitle] = useState('');
  const [week, setWeek] = useState(null);
  const [name, setName] = useState(undefined);
  const [guessing, setGuessing] = useState(null);
  const [preview, setPreview] = useState(null);

  const load = useCallback(async () => {
    const [d, mine] = await Promise.all([circleDay(code, day), myCircles()]);
    setInfo(d);
    if (!d) circlePreview(code).then(setPreview);
    setTitle(mine.find((c) => c.code === code)?.name ?? 'Circle');
    if (d) circleWeek(code, day).then(setWeek);
  }, [code, day]);
  useFocusEffect(useCallback(() => { load(); loadMyName().then(setName); }, [load]));

  if (info === undefined) return <Shell />;

  // Not a member yet (opened from an invite).
  if (!info) {
    return (
      <Shell>
        <Eyebrow>Circle · {code}</Eyebrow>
        <Text style={styles.h2}>{preview?.name ? `You’re invited to ${preview.name}.` : 'You’re invited to a circle.'}</Text>
        {preview?.members ? <Text style={styles.sub}>{preview.members} {preview.members === 1 ? 'person is' : 'people are'} in it.</Text> : null}
        <Text style={styles.sub}>Everyone plays the same daily drop and sees each other’s skies after playing.</Text>
        <NameGate name={name} onSaved={setName} />
        {name ? <Button label="Join" onPress={async () => { const r = await joinCircle(code); if (r?.code) load(); else Alert.alert('Couldn’t join', r?.error === 'full' ? 'That circle is full.' : 'Check the code and try again.'); }} /> : null}
        <Button ghost label="Not now" onPress={goHome} />
      </Shell>
    );
  }

  const members = info.members;
  const played = members.filter((m) => m.played && m.kept);
  const people = played.map((m) => ({ name: m.me ? 'You' : m.name, items: toItems(m.kept, m.whys) }));
  const summary = people.length >= 2 ? tableSummary(people.map((p) => ({ name: p.name, kept: p.items }))) : null;
  const awards = week ? weekAwards(members, week.plays, week.guesses) : [];

  if (guessing) {
    return (
      <Shell>
        <Eyebrow>Before you see {guessing.name}’s sky</Eyebrow>
        <Text style={styles.h2}>Which three did {guessing.name} keep today?</Text>
        <GuessPicker options={dailyDeal(day).map((m) => m.t)} onDone={async (g) => { await circleGuess(code, day, guessing.mid, g); setGuessing(null); load(); }} />
        <Button ghost label="Cancel" onPress={() => setGuessing(null)} />
      </Shell>
    );
  }

  const invite = () => Share.share({ message: `Join my Keep circle “${title}”: one sky a day, together. ${circleLink(code)}  (code ${code})` }).catch(() => {});
  const leave = () => Alert.alert('Leave this circle?', 'You can rejoin with the code.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Leave', style: 'destructive', onPress: async () => { await leaveCircle(code); router.replace('/circles'); } },
  ]);

  return (
    <Shell>
      <Eyebrow>{title} · today</Eyebrow>
      {info.played ? (
        <>
          {people.length > 0 && <GroupSky people={people} />}
          <View style={styles.legend}>{played.map((m, i) => <View key={m.mid} style={styles.legendItem}><View style={[styles.legendLine, { backgroundColor: personColor(i) }]} /><Text style={styles.legendT}>{m.me ? 'You' : m.name}</Text></View>)}</View>
          {summary ? summary.lines.map((l, i) => <Reading key={i} line={l} />) : <Text style={styles.sub}>You’re the first today. The circle’s sky fills in as others play.</Text>}
        </>
      ) : (
        <>
          <Text style={styles.h2}>Play today’s drop to see the circle’s sky.</Text>
          <Button label="Today’s drop" onPress={() => router.push('/daily')} />
        </>
      )}

      <View style={styles.block}>
        {members.map((m) => (
          <View key={m.mid} style={styles.member}>
            <View style={styles.who}>
              <Text style={styles.mName}>{m.me ? `${m.name} (you)` : m.name}</Text>
              {!m.me && <More label={`Hide, report or remove ${m.name}`} onPress={() => personMenu({ name: m.name, where: { code, mid: m.mid }, canRemove: info.owner, onDone: load })} />}
            </View>
            {m.me ? <Text style={styles.meta}>{m.played ? 'played' : 'not yet'}</Text>
              : !m.played ? <Text style={styles.meta}>not yet</Text>
              : !info.played ? <Text style={styles.meta}>played · hidden</Text>
              : m.myGuess != null ? <Text style={styles.meta}>you read {m.myGuess} of 3</Text>
              : <Pressable accessibilityRole="button" onPress={() => setGuessing(m)}><Text style={styles.guess}>Guess their three ›</Text></Pressable>}
          </View>
        ))}
      </View>

      {awards.length > 0 && (
        <View style={styles.block}>
          <Eyebrow>This week</Eyebrow>
          {awards.map(([l, v]) => <View key={l} style={styles.member}><Text style={styles.mName}>{l}</Text><Text style={styles.meta}>{v}</Text></View>)}
        </View>
      )}

      <View style={styles.block}>
        <Text style={styles.meta}>Code {code}</Text>
        <Button label="Invite someone" onPress={invite} />
        <Button ghost small label="Leave circle" onPress={leave} />
      </View>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <View style={styles.root}>
      <StillSky />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[styles.wrap, { flexGrow: 1 }]}>{children}</ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.sky0 },
  wrap: { paddingHorizontal: S.lg, paddingVertical: S.md, gap: S.md },
  h2: { fontFamily: F.serifRegular, fontSize: 28, lineHeight: 34, color: C.ink },
  sub: { fontFamily: F.sans, fontSize: 14, lineHeight: 20, color: C.dim },
  block: { gap: 4, borderTopWidth: 1, borderTopColor: C.line, paddingTop: S.md },
  member: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  mName: { fontFamily: F.serif, fontSize: 17, color: C.ink },
  meta: { fontFamily: F.sans, fontSize: 13, color: C.faint },
  guess: { fontFamily: F.sansMedium, fontSize: 13, color: C.gold },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendLine: { width: 16, height: 2, borderRadius: R.full },
  legendT: { fontFamily: F.sans, fontSize: 13, color: C.dim },
});
