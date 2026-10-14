// Pass it around: two to six people, one phone. Each plays a short drop on their own deck,
// then everyone's constellations land in one family sky and the table picks one thing to do together.
import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Canvas, Picture } from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';
import { DECK, DECKS, deckReady, WHY } from '../keep/content.mjs';
import { skyPoint } from '../keep/insight.mjs';
import { WHENS, askAtFor, followUp } from '../keep/plans.mjs';
import { tableSummary } from '../keep/table.mjs';
import { shareCard } from '../keep/share';
import { Field } from '../keep/field';
import { drawColored, drawLines, drawStar, record, useSkyFonts } from '../keep/sky';
import { Button, Eyebrow, Reading, StillSky, goHome } from '../keep/ui';
import { addToList, load, save } from '../lib/storage';
import { deckNow } from '../lib/prefs';
import { C, F, R, S } from '../lib/theme';

const PASS_MS = 30000;
const MAX = 6;
const COLORS = ['#f3b98a', '#7fb2f0', '#ef8f9f', '#a7c48a', '#b79be0', '#6fd0d8'];

export default function Pass() {
  const [phase, setPhase] = useState('setup');
  const [players, setPlayers] = useState(null);
  const [turn, setTurn] = useState(0);
  const [kept, setKept] = useState([]);
  const [round, setRound] = useState(0);

  useEffect(() => { load('keep:table', null).then((t) => setPlayers(t ?? [{ name: '', deck: deckNow() }, { name: '', deck: deckNow() }])); }, []);

  if (!players) return <View style={styles.root} />;
  const table = players.map((p, i) => ({ ...p, name: p.name.trim() || `Player ${i + 1}`, color: COLORS[i] }));

  const start = () => {
    const clean = players.map((p) => ({ ...p, name: p.name.trim() })).filter((p, i) => p.name || i < 2);
    save('keep:table', clean);
    setPlayers(clean);
    setKept([]);
    setTurn(0);
    setRound((r) => r + 1);
    setPhase('hand');
  };
  const finishTurn = (g) => {
    const next = [...kept, g.kept.map(({ t, k }) => ({ t, k }))];
    setKept(next);
    if (next.length < table.length) { setTurn(next.length); setPhase('hand'); } else setPhase('sky');
  };

  if (phase === 'setup') return <Setup players={players} setPlayers={setPlayers} onStart={start} />;
  if (phase === 'hand') return <Handoff p={table[turn]} first={turn === 0} onGo={() => setPhase('play')} />;
  if (phase === 'play') return <Field key={`${round}-${turn}`} roundMs={PASS_MS} deck={table[turn].deck} who={table[turn].name} onDone={finishTurn} />;
  const done = table.map((p, i) => ({ ...p, kept: kept[i] ?? [] }));
  return <Together players={done} onAgain={start} onSetup={() => setPhase('setup')} />;
}

/* ---------------- setup ---------------- */

function Setup({ players, setPlayers, onStart }) {
  const set = (i, patch) => setPlayers((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const cycleDeck = (i) => {
    const ready = DECKS.filter((d) => deckReady(d.key));
    const at = ready.findIndex((d) => d.key === players[i].deck);
    set(i, { deck: ready[(at + 1) % ready.length].key });
    Haptics.selectionAsync();
  };
  return (
    <View style={styles.root}>
      <StillSky />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
            <Eyebrow>Pass it around</Eyebrow>
            <Text style={styles.h2}>Who’s playing?</Text>
            <Text style={styles.sub}>Each of you plays one 30-second drop, then hands the phone on. Nobody sees a basket until the end. Tap a deck to change it.</Text>
            <View style={{ gap: 8 }}>
              {players.map((p, i) => (
                <View key={i} style={styles.player}>
                  <View style={[styles.swatch, { backgroundColor: COLORS[i] }]} />
                  <TextInput value={p.name} onChangeText={(name) => set(i, { name })} placeholder={`Player ${i + 1}`} placeholderTextColor={C.faint} maxLength={18} style={styles.input} returnKeyType="done" />
                  <Pressable accessibilityRole="button" accessibilityLabel={`Deck: ${DECK[p.deck].name}. Change`} onPress={() => cycleDeck(i)} style={styles.deck}>
                    <Text style={styles.deckText}>{DECK[p.deck].name}</Text>
                  </Pressable>
                  {players.length > 2 && (
                    <Pressable accessibilityRole="button" accessibilityLabel="Remove player" hitSlop={8} onPress={() => setPlayers((ps) => ps.filter((_, j) => j !== i))}>
                      <Text style={styles.remove}>✕</Text>
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
            {players.length < MAX && (
              <Pressable accessibilityRole="button" onPress={() => setPlayers((ps) => [...ps, { name: '', deck: deckNow() }])} style={styles.addRow}>
                <Text style={styles.addText}>+ Add someone</Text>
              </Pressable>
            )}
            <View style={{ flex: 1 }} />
            <Button label={`Start with ${players[0].name.trim() || 'Player 1'}`} onPress={onStart} />
            <Button ghost label="Home" onPress={goHome} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

/* ---------------- between turns ---------------- */

function Handoff({ p, first, onGo }) {
  return (
    <View style={styles.root}>
      <StillSky />
      <SafeAreaView style={[styles.wrap, { flex: 1 }]}>
        <View style={{ flex: 1 }} />
        <Eyebrow color={C.faint}>{first ? 'First up' : 'Pass the phone to'}</Eyebrow>
        <Text style={[styles.name, { color: p.color }]}>{p.name}</Text>
        <Text style={styles.sub}>{DECK[p.deck].name} deck · 30 seconds · keep five</Text>
        <View style={{ flex: 1 }} />
        <Button label={`I’m ${p.name}. Go`} onPress={onGo} />
        <Button ghost label="Stop" onPress={goHome} />
      </SafeAreaView>
    </View>
  );
}

/* ---------------- the family sky and the plan ---------------- */

function Together({ players, onAgain, onSetup }) {
  const { width: W } = useWindowDimensions();
  const fonts = useSkyFonts();
  const [step, setStep] = useState('sky');
  const [pick, setPick] = useState(0);
  const [when, setWhen] = useState('weekend');
  const s = useMemo(() => tableSummary(players), [players]);

  const H = 300;
  const sky = useMemo(() => {
    if (!fonts) return null;
    const box = { x: S.lg + 6, y: 24, w: W - 2 * S.lg - 12, h: H - 60 };
    const at = (m) => { const p = skyPoint(m); return { x: box.x + p.x * box.w, y: box.y + p.y * box.h }; };
    return record(W, H, (c) => {
      players.forEach((p) => drawColored(c, p.kept.map(at), p.color));
      s.shared.forEach((m) => {
        const pt = at(m);
        drawStar(c, pt.x, pt.y, 3.2 + m.who.length, 1, true);
        drawLines(c, [m.t], pt.x, pt.y + 12, fonts.small, 13, 0.95);
      });
    });
  }, [fonts, W, players, s]);

  const legend = (
    <View style={styles.legend}>
      {players.map((p) => (
        <View key={p.name} style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: p.color }]} />
          <Text style={styles.legendText}>{p.name}</Text>
        </View>
      ))}
    </View>
  );

  const body = (() => {
    if (step === 'sky') {
      return (
        <>
          <Eyebrow>Your family sky</Eyebrow>
          {sky && (
            <Canvas style={{ width: W, height: H, marginHorizontal: -S.lg }}>
              <Picture picture={sky} />
            </Canvas>
          )}
          {legend}
          <View style={{ gap: 8 }}>{s.lines.map((l, i) => <Reading key={i} line={l} style={i ? null : styles.big} />)}</View>
          <View style={{ flex: 1 }} />
          <Button label="What you share" onPress={() => setStep('share')} />
        </>
      );
    }
    if (step === 'share') {
      return (
        <>
          <Eyebrow>What you share</Eyebrow>
          {s.shared.length ? (
            <View style={{ gap: 8 }}>
              <Text style={styles.small}>Kept by more than one of you</Text>
              {s.shared.map((m) => (
                <View key={m.t} style={styles.card}>
                  <View style={[styles.dot, { backgroundColor: WHY[m.k].color }]} />
                  <Text style={styles.cardText}>{m.t}</Text>
                  <Text style={styles.who}>{m.who.join(', ')}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.sub}>No moment landed in two baskets. {s.everyone.length ? `But every one of you kept something with ${WHY[s.everyone[0]].name.toLowerCase()} in it.` : 'Everyone went their own way.'}</Text>
          )}
          {s.solos.length > 0 && (
            <View style={styles.block}>
              <Text style={styles.small}>Only one of you went for it</Text>
              {s.solos.map((x) => (
                <Text key={x.name} style={styles.solo}>
                  <Text style={{ color: players.find((p) => p.name === x.name).color }}>{x.name}</Text>  {x.t}
                </Text>
              ))}
              {s.ask && <Reading line={s.ask} style={styles.ask} />}
            </View>
          )}
          <View style={{ flex: 1 }} />
          <Button label="Do one together" onPress={() => setStep('pick')} />
        </>
      );
    }
    if (step === 'pick') {
      return (
        <>
          <Eyebrow>Do one together</Eyebrow>
          <Text style={styles.h2}>Pick one for the {players.length === 2 ? 'two of you' : 'family'}.</Text>
          <View style={{ gap: 8 }}>
            {s.menu.map((m, i) => (
              <Pressable key={m.t} accessibilityRole="radio" accessibilityState={{ selected: pick === i }} onPress={() => { Haptics.selectionAsync(); setPick(i); }} style={[styles.card, pick === i && styles.cardOn]}>
                <View style={[styles.dot, { backgroundColor: WHY[m.k].color }]} />
                <Text style={styles.cardText}>{m.t}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>WHEN</Text>
          <View style={styles.chips}>
            {WHENS.map((w) => (
              <Pressable key={w.key} accessibilityRole="radio" accessibilityState={{ selected: when === w.key }} onPress={() => setWhen(w.key)} style={[styles.chip, when === w.key && styles.chipOn]}>
                <Text style={[styles.chipText, when === w.key && { color: C.dark }]}>{w.label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ flex: 1 }} />
          <Button
            label="Put it on the list"
            onPress={async () => {
              const m = s.menu[pick];
              await addToList([{ t: m.t, k: m.k, when, with: players.map((p) => p.name), askAt: askAtFor(when) }]);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setStep('done');
            }}
          />
          <Button ghost label="Not this time" onPress={() => setStep('done-skip')} />
        </>
      );
    }
    const m = s.menu[pick];
    return (
      <>
        <Eyebrow>{step === 'done' ? 'On the list' : 'Good game'}</Eyebrow>
        {step === 'done' ? (
          <>
            <View style={styles.plan}>
              <Text style={styles.planWhen}>{WHENS.find((w) => w.key === when).label.toUpperCase()}</Text>
              <Text style={styles.planText}>{m.t}</Text>
              <Text style={styles.small}>with {players.map((p) => p.name).join(', ')}</Text>
            </View>
            <Text style={styles.sub}>{followUp(when)}</Text>
          </>
        ) : (
          <Text style={styles.h2}>The family sky was the point. See you next round.</Text>
        )}
        {legend}
        {fonts && <Button small ghost label="Share our sky" onPress={() => shareCard('family', { players, line: s.lines[0].map((x) => (typeof x === 'string' ? x : x.em)).join('') }, fonts, 'Our sky ✦ Keep').catch(() => {})} />}
        <View style={{ flex: 1 }} />
        <Button label="Play again" onPress={onAgain} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button ghost label="Home" onPress={goHome} style={{ flex: 1 }} />
          <Button ghost label="Change players" onPress={onSetup} style={{ flex: 1.4 }} />
        </View>
      </>
    );
  })();

  return (
    <View style={styles.root}>
      <StillSky />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[styles.wrap, { flexGrow: 1 }]}>{body}</ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.sky0 },
  wrap: { paddingHorizontal: S.lg, paddingVertical: S.md, gap: S.md },
  h2: { fontFamily: F.serifRegular, fontSize: 30, lineHeight: 36, color: C.ink },
  big: { fontSize: 22, lineHeight: 30 },
  sub: { fontFamily: F.sans, fontSize: 15, lineHeight: 22, color: C.dim },
  small: { fontFamily: F.sans, fontSize: 13, color: C.faint },
  name: { fontFamily: F.serifRegular, fontSize: 58, lineHeight: 66 },
  player: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  swatch: { width: 10, height: 10, borderRadius: 5 },
  input: { flex: 1, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, borderRadius: R.lg, paddingVertical: 11, paddingHorizontal: 12, color: C.ink, fontFamily: F.sans, fontSize: 16 },
  deck: { paddingVertical: 8, paddingHorizontal: 11, borderRadius: R.full, borderWidth: 1, borderColor: C.line },
  deckText: { fontFamily: F.sansMedium, fontSize: 12, color: C.gold },
  remove: { color: C.faint, fontSize: 14, paddingHorizontal: 4 },
  addRow: { paddingVertical: 8 },
  addText: { fontFamily: F.sansMedium, fontSize: 14, color: C.dim },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendLine: { width: 16, height: 2, borderRadius: 1 },
  legendText: { fontFamily: F.sans, fontSize: 13, color: C.dim },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14, borderRadius: R.xl, borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
  cardOn: { borderColor: C.glow },
  cardText: { flex: 1, fontFamily: F.serif, fontSize: 17, color: C.ink },
  who: { fontFamily: F.sans, fontSize: 11, color: C.faint, maxWidth: 120, textAlign: 'right' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  block: { gap: 6, borderTopWidth: 1, borderTopColor: C.line, paddingTop: S.md },
  solo: { fontFamily: F.serif, fontSize: 16, color: C.ink },
  ask: { fontSize: 16, color: C.dim, marginTop: 4 },
  label: { fontFamily: F.sansMedium, fontSize: 10, letterSpacing: 2.5, color: C.faint },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: R.full, borderWidth: 1, borderColor: C.line },
  chipOn: { backgroundColor: C.ink, borderColor: C.ink },
  chipText: { fontFamily: F.sansMedium, fontSize: 14, color: C.dim },
  plan: { gap: 4, padding: S.md, borderRadius: R.xl, borderWidth: 1, borderColor: C.cardLine, backgroundColor: C.card },
  planWhen: { fontFamily: F.sansMedium, fontSize: 10, letterSpacing: 2.5, color: C.gold },
  planText: { fontFamily: F.serifRegular, fontSize: 26, lineHeight: 31, color: C.ink },
});
