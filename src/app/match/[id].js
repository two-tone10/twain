// One match: play it if you were sent it, wait for your friend, guess three of theirs, then the card.
// The other player can be hidden or reported from any screen that shows their name.
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WHY } from '../../keep/content.mjs';
import { fmtSpeed, skyName } from '../../keep/fun.mjs';
import { Field } from '../../keep/field';
import { recordRound } from '../../keep/records';
import { matchCard, matchDeal, matchFieldRng } from '../../keep/together.mjs';
import { GuessPicker, MiniSky, More, NameGate, personMenu } from '../../keep/together-ui';
import { Button, Eyebrow, Reading, StillSky, goHome } from '../../keep/ui';
import { getMatch, guessMatch, matchLink, playMatch } from '../../lib/together';
import { loadMyName } from '../../lib/storage';
import { C, F, R, S } from '../../lib/theme';

export default function Match() {
  const { id } = useLocalSearchParams();
  const [v, setV] = useState(undefined);
  const [name, setName] = useState(undefined);
  const [playing, setPlaying] = useState(false);
  const load = useCallback(() => getMatch(String(id)).then(setV), [id]);
  useEffect(() => { load(); loadMyName().then(setName); }, [load]);

  if (v === undefined) return <Shell />;
  if (!v) return <Shell><Text style={styles.h2}>That match link didn’t come through.</Text><Button label="Home" onPress={goHome} /></Shell>;

  const deal = matchDeal(Number(v.seed), v.deck);
  if (playing) {
    return (
      <Field cards={deal} rng={matchFieldRng(Number(v.seed))} who={`${v.other?.name ?? 'Match'}’s drop`}
        onDone={async (g) => {
          const extra = await recordRound({ ...g, deckKey: v.deck }, 'challenge');
          setV(await playMatch(v.id, g.kept, extra.speed));
          setPlaying(false);
        }} />
    );
  }

  // Sent to me, not played yet.
  if (!v.mine) {
    if (v.expired) return <Shell><Text style={styles.h2}>This match has ended.</Text><Button label="Start your own" onPress={() => router.replace('/match')} /></Shell>;
    return (
      <Shell>
        <View style={styles.head}>
          <Eyebrow>Match</Eyebrow>
          {v.other && <More label={`Hide or report ${v.other.name}`} onPress={() => personMenu({ name: v.other.name, where: { match: v.id }, onDone: () => router.replace('/match') })} />}
        </View>
        <Text style={styles.h2}>{v.other?.name ?? 'A friend'} sent you a drop.</Text>
        <Text style={styles.sub}>Same 21 stars, falling the same way. Keep five. Then you each guess three of the other’s.</Text>
        {v.other?.speed != null && <Text style={styles.sub}>Their speed: {fmtSpeed(v.other.speed)}</Text>}
        <NameGate name={name} onSaved={setName} />
        <View style={{ flex: 1 }} />
        {name ? <Button label="Play" onPress={() => setPlaying(true)} /> : null}
        <Button ghost label="Not now" onPress={goHome} />
      </Shell>
    );
  }

  const menu = (after) => v.other && <More label={`Hide or report ${v.other.name}`} onPress={() => personMenu({ name: v.other.name, where: { match: v.id }, onDone: after })} />;
  const send = () => Share.share({ message: `I caught five stars in Keep. Catch the same ones and let’s see how close our skies land: ${matchLink(v.id)}` }).catch(() => {});

  // Waiting for a friend.
  if (!v.other) {
    return (
      <Shell>
        <Eyebrow>Match · sent</Eyebrow>
        <Text style={styles.h2}>{v.expired ? 'Nobody played this one.' : v.to ? `Sent to ${v.to}.` : 'Now send it to a friend.'}</Text>
        <MiniSky items={matchCard(v).mine} small={false} h={200} />
        <Text style={styles.sub}>{v.to ? `It’s waiting in ${v.to}’s Match list for a week. You’ll each guess three of the other’s five once they’ve played.` : 'They get the same 21 stars. The link works for a week. You’ll each guess three of the other’s five once they’ve played.'}</Text>
        <View style={{ flex: 1 }} />
        {!v.expired && !v.to && <Button label="Send to a friend" onPress={send} />}
        <Button ghost label="Check again" onPress={load} />
        <Button ghost label="Your matches" onPress={() => router.replace('/match')} />
      </Shell>
    );
  }

  // Both played: guess first.
  if (!v.mine.guesses) {
    return (
      <Shell>
        <View style={styles.head}><Eyebrow>Before you see {v.other.name}’s sky</Eyebrow>{menu(() => router.replace('/match'))}</View>
        <Text style={styles.h2}>Which three did {v.other.name} keep?</Text>
        <GuessPicker options={deal.map((m) => m.t)} onDone={async (g) => setV(await guessMatch(v.id, g))} />
      </Shell>
    );
  }

  const c = matchCard(v);
  const rows = [
    ['Same stars kept', `${c.same} of ${Math.max(c.mine.length, c.theirs.length)}`],
    ['In sync', `${c.sync}%`],
    [`You read ${v.other.name}`, `${c.iRead} of 3`],
    [`${v.other.name} read you`, v.other.guessed ? `${c.theyRead} of 3` : 'not yet'],
    ['Quicker', c.quicker === 'you' ? `You, ${fmtSpeed(v.mine.speed)}` : c.quicker === 'them' ? `${v.other.name}, ${fmtSpeed(v.other.speed)}` : '—'],
  ];
  return (
    <Shell>
      <View style={styles.head}><Eyebrow>You and {v.other.name}</Eyebrow>{menu(() => router.replace('/match'))}</View>
      <View style={styles.pairRow}>
        {[['You', c.mine], [v.other.name, c.theirs]].map(([who, items]) => (
          <View key={who} style={{ flex: 1, gap: 4 }}>
            <Text style={styles.who}>{who.toUpperCase()}</Text>
            <MiniSky items={items} />
            <Text style={styles.sky}>{skyName(items) ?? '—'}</Text>
            <View style={styles.dots}>{items.map((m, i) => <View key={i} style={[styles.dot, { backgroundColor: WHY[m.k].color }]} />)}</View>
          </View>
        ))}
      </View>
      <View>
        {rows.map(([l, val]) => (
          <View key={l} style={styles.stat}><Text style={styles.statL}>{l}</Text><Text style={styles.statV}>{val}</Text></View>
        ))}
      </View>
      {c.lines.map((l, i) => <Reading key={i} line={l} />)}
      <View style={{ flex: 1 }} />
      <Button label="New match" onPress={() => router.replace('/match')} />
      <Button ghost label="Home" onPress={goHome} />
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
  h2: { fontFamily: F.serifRegular, fontSize: 30, lineHeight: 36, color: C.ink },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sub: { fontFamily: F.sans, fontSize: 14, lineHeight: 20, color: C.dim },
  pairRow: { flexDirection: 'row', gap: S.md },
  who: { fontFamily: F.sansMedium, fontSize: 10, letterSpacing: 2, color: C.faint },
  sky: { fontFamily: F.serif, fontSize: 15, color: C.ink },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: 10, height: 10, borderRadius: R.full },
  stat: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderTopWidth: 1, borderTopColor: C.line },
  statL: { fontFamily: F.sans, fontSize: 14, color: C.dim },
  statV: { fontFamily: F.serif, fontSize: 17, color: C.ink },
});
