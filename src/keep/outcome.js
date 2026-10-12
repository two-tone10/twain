// The end of a solo drop, fast or slow: the final cut, then what the round says about you.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Canvas, Picture } from '@shopify/react-native-skia';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { BASKET, CUT_MS, WHY } from './content.mjs';
import { cutPair, headline, soloLines } from './insight.mjs';
import { SAID_ROUNDS as PATTERN_ROUNDS } from './readings.mjs';
import { WHENS, askAtFor, followUp, rememberPeople, withLabel } from './plans.mjs';
import { drawConstellation, layout, record, useSkyFonts } from './sky';
import { Button, Eyebrow, goHome, Reading, StillSky } from './ui';
import { addToList, loadRounds } from '../lib/storage';
import { loadPeople, savePeople } from '../lib/prefs';
import { C, F, R, S } from '../lib/theme';

export function Outcome({ g, onAgain, againLabel = 'Drop again' }) {
  const [pair] = useState(() => cutPair(g.kept));
  const [keeper, setKeeper] = useState(undefined);
  if (pair && keeper === undefined) return <FinalCut pair={pair} onDone={setKeeper} />;
  return <Results g={{ ...g, pair, keeper: keeper ?? null }} onAgain={onAgain} againLabel={againLabel} />;
}

/* ---------------- final cut ---------------- */

function FinalCut({ pair, onDone }) {
  const [order] = useState(() => (Math.random() < 0.5 ? pair : [pair[1], pair[0]]));
  const [chosen, setChosen] = useState(undefined);
  const bar = useSharedValue(1);
  const barStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: bar.value }] }));

  const done = useRef(false);
  const pick = (m) => {
    if (done.current) return;
    done.current = true;
    setChosen(m);
    if (m) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => onDone(m), 800);
  };

  useEffect(() => {
    bar.set(withTiming(0, { duration: CUT_MS, easing: Easing.linear }));
    const t = setTimeout(() => pick(null), CUT_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.root}>
      <StillSky />
      <SafeAreaView style={styles.cutWrap}>
        <Eyebrow>Final cut</Eyebrow>
        <Text style={styles.h2}>
          Only one <Text style={{ color: C.gold, fontFamily: F.serifItalic }}>makes it.</Text>
        </Text>
        <Text style={styles.sub}>If the day only had room for one.</Text>
        <View style={{ flex: 1 }} />
        {order.map((m, i) => {
          const lost = chosen !== undefined && chosen !== m;
          return (
            <View key={m.t} style={{ gap: S.md }}>
              {i === 1 && <Text style={styles.or}>or</Text>}
              <Pressable accessibilityRole="button" onPress={() => pick(m)} style={[styles.cutCard, chosen === m && styles.cutWin, lost && styles.cutLose]}>
                <View style={styles.cutStar} />
                <Text style={styles.cutText}>{m.t}</Text>
              </Pressable>
            </View>
          );
        })}
        <View style={{ flex: 1 }} />
        <View style={styles.track}>
          <Animated.View style={[styles.fill, barStyle]} />
        </View>
      </SafeAreaView>
    </View>
  );
}

/* ---------------- results ---------------- */

// Read the round, then make one star real: pick it, say when and with whom, and it lands on your list.
function Results({ g, onAgain, againLabel }) {
  const [step, setStep] = useState('read');
  const order = g.keeper ? [g.keeper, ...g.kept.filter((m) => m !== g.keeper)] : g.kept;
  const [pick, setPick] = useState(null);
  const [plan, setPlan] = useState(null);

  if (step === 'pick') {
    return (
      <Shell>
        <Eyebrow>Make one real</Eyebrow>
        <Text style={styles.h2}>Which of these could actually happen this week?</Text>
        <View style={{ gap: 8 }}>
          {order.map((m) => (
            <Pressable key={m.t} accessibilityRole="button" onPress={() => { Haptics.selectionAsync(); setPick(m); setStep('plan'); }} style={({ pressed }) => [styles.card, pressed && styles.cardOn]}>
              <View style={[styles.dot, { backgroundColor: WHY[m.k].color }]} />
              <Text style={styles.cardText}>{m.t}</Text>
              {m === g.keeper && <Text style={styles.cutTag}>FINAL CUT</Text>}
            </Pressable>
          ))}
        </View>
        <Button ghost label="Just playing today" onPress={() => setStep('skip')} />
      </Shell>
    );
  }
  if (step === 'plan') return <MakePlan m={pick} onBack={() => setStep('pick')} onDone={(p) => { setPlan(p); setStep('done'); }} />;
  if (step === 'done' || step === 'skip') {
    return (
      <Shell>
        {plan ? (
          <>
            <Eyebrow>On your list</Eyebrow>
            <View style={styles.plan}>
              <Text style={styles.planWhen}>{WHENS.find((w) => w.key === plan.when).label.toUpperCase()}</Text>
              <Text style={styles.planText}>{plan.t}</Text>
              {plan.with.length > 0 && <Text style={styles.small}>with {withLabel(plan.with)}</Text>}
            </View>
            <Text style={styles.sub}>{followUp(plan.when)}{plan.when !== 'someday' ? ' If you’re glad you did, it shows up on Sky.' : ''}</Text>
          </>
        ) : (
          <>
            <Eyebrow>Just playing</Eyebrow>
            <Text style={styles.h2}>Fine by me. Your constellation is saved in your sky.</Text>
          </>
        )}
        <View style={{ flex: 1 }} />
        {onAgain && <Button label={againLabel} onPress={onAgain} />}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button ghost label="Home" onPress={() => goHome()} style={{ flex: 1 }} />
          <Button ghost label="Your sky" onPress={() => router.navigate('/sky')} style={{ flex: 1 }} />
        </View>
      </Shell>
    );
  }
  return <Reading1 g={g} onNext={g.kept.length ? () => setStep('pick') : null} onAgain={onAgain} againLabel={againLabel} />;
}

function Shell({ children }) {
  return (
    <View style={styles.root}>
      <StillSky />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[styles.results, { flexGrow: 1 }]} keyboardShouldPersistTaps="handled">{children}</ScrollView>
      </SafeAreaView>
    </View>
  );
}

// The short reading: constellation, headline, a line or two, and how far along your pattern is.
function Reading1({ g, onNext, onAgain, againLabel }) {
  const { width: W } = useWindowDimensions();
  const fonts = useSkyFonts();
  const [played, setPlayed] = useState(null);
  useEffect(() => { loadRounds().then((r) => setPlayed(r.filter((x) => x.items?.length).length)); }, []);

  const lines = soloLines({ kept: g.kept, gone: g.gone, swaps: g.swaps, pair: g.pair, keeper: g.keeper ?? null }).slice(0, 2);
  const heroH = 200;
  const hero = useMemo(() => {
    if (!fonts) return null;
    const box = { x: S.lg, y: 22, w: W - 2 * S.lg, h: heroH - 44 };
    return record(W, heroH, (c) => drawConstellation(c, g.kept, layout(g.kept, box), { font: fonts.small, box, bright: true }));
  }, [fonts, W, g.kept]);

  return (
    <Shell>
      <Eyebrow>Your constellation · {g.kept.length} of {BASKET}</Eyebrow>
      {hero && g.kept.length > 0 && (
        <Canvas style={{ width: W, height: heroH, marginHorizontal: -S.lg, backgroundColor: 'transparent' }}>
          <Picture picture={hero} />
        </Canvas>
      )}
      <Text style={styles.h2}>{headline(g.kept)}</Text>
      <View style={{ gap: 10 }}>
        {lines.map((l, i) => <Reading key={i} line={l} />)}
      </View>
      {played != null && (played < PATTERN_ROUNDS ? (
        <View style={styles.progress}>
          <View style={styles.slots}>
            {Array.from({ length: PATTERN_ROUNDS }, (_, i) => <View key={i} style={[styles.slot, i < played && styles.slotOn]} />)}
          </View>
          <Text style={styles.small}>One round is a snapshot. Your pattern shows up after {PATTERN_ROUNDS}.</Text>
        </View>
      ) : (
        <Pressable onPress={() => router.navigate('/sky')} style={styles.progress}>
          <Text style={styles.small}>This round is in your sky now. <Text style={{ color: C.gold }}>See what it adds ›</Text></Text>
        </Pressable>
      ))}
      <View style={{ flex: 1 }} />
      {onNext ? <Button label="Make one real" onPress={onNext} /> : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button ghost label="Home" onPress={() => goHome()} style={{ flex: 1 }} />
        {onAgain && <Button ghost={!!onNext} label={againLabel} onPress={onAgain} style={{ flex: 1.4 }} />}
      </View>
    </Shell>
  );
}

// Two taps make a generic star yours: when, and with whom.
function MakePlan({ m, onBack, onDone }) {
  const [when, setWhen] = useState('weekend');
  const [people, setPeople] = useState([]);
  const [chosen, setChosen] = useState([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  useEffect(() => { loadPeople().then(setPeople); }, []);

  const toggle = (n) => { Haptics.selectionAsync(); setChosen((c) => (c.includes(n) ? c.filter((x) => x !== n) : [...c, n])); };
  const addName = () => {
    const n = name.trim();
    if (n) { setPeople((p) => (p.includes(n) ? p : [n, ...p])); setChosen((c) => (c.includes(n) ? c : [...c, n])); }
    setName('');
    setAdding(false);
  };
  const save = async () => {
    const p = { t: m.t, k: m.k, when, with: chosen, askAt: askAtFor(when) };
    await addToList([p]);
    if (chosen.length) await savePeople(rememberPeople(people, chosen));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onDone(p);
  };

  return (
    <Shell>
      <Eyebrow>Make it yours</Eyebrow>
      <View style={styles.titleRow}>
        <View style={[styles.dot, { backgroundColor: WHY[m.k].color }]} />
        <Text style={styles.h2}>{m.t}</Text>
      </View>
      <Text style={styles.label}>WHEN</Text>
      <View style={styles.picks}>
        {WHENS.map((w) => (
          <Pressable key={w.key} accessibilityRole="radio" accessibilityState={{ selected: when === w.key }} onPress={() => { Haptics.selectionAsync(); setWhen(w.key); }} style={[styles.pick, when === w.key && styles.pickOn]}>
            <Text style={[styles.pickText, when === w.key && { color: C.dark }]}>{w.label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>WITH</Text>
      <View style={styles.picks}>
        <Pressable accessibilityRole="radio" accessibilityState={{ selected: !chosen.length }} onPress={() => setChosen([])} style={[styles.pick, !chosen.length && styles.pickOn]}>
          <Text style={[styles.pickText, !chosen.length && { color: C.dark }]}>Just me</Text>
        </Pressable>
        {people.map((n) => (
          <Pressable key={n} accessibilityRole="checkbox" accessibilityState={{ checked: chosen.includes(n) }} onPress={() => toggle(n)} style={[styles.pick, chosen.includes(n) && styles.pickOn]}>
            <Text style={[styles.pickText, chosen.includes(n) && { color: C.dark }]}>{n}</Text>
          </Pressable>
        ))}
        {!adding && (
          <Pressable accessibilityRole="button" onPress={() => setAdding(true)} style={styles.pick}>
            <Text style={styles.pickText}>+ Someone</Text>
          </Pressable>
        )}
      </View>
      {adding && (
        <TextInput autoFocus value={name} onChangeText={setName} onSubmitEditing={addName} onBlur={addName} returnKeyType="done" placeholder="Their name" placeholderTextColor={C.faint} maxLength={24} style={styles.input} />
      )}
      <View style={{ flex: 1 }} />
      <Button label="Put it on my list" onPress={save} />
      <Button ghost label="Pick a different one" onPress={onBack} />
    </Shell>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.sky0 },
  quit: { position: 'absolute', right: 18, width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  quitText: { color: C.faint, fontSize: 16 },
  h2: { fontFamily: F.serifRegular, fontSize: 30, lineHeight: 35, color: C.ink },
  sub: { fontFamily: F.sans, fontSize: 15, color: C.dim },
  cutWrap: { flex: 1, paddingHorizontal: S.lg, paddingVertical: S.md, gap: S.sm },
  cutCard: { borderRadius: R.xl, borderWidth: 1, borderColor: 'rgba(255,230,166,0.35)', backgroundColor: 'rgba(20,25,56,0.8)', paddingVertical: 28, paddingHorizontal: S.md, alignItems: 'center', gap: 12 },
  cutWin: { borderColor: C.glow, shadowColor: C.glow, shadowOpacity: 0.6, shadowRadius: 18, transform: [{ scale: 1.03 }] },
  cutLose: { opacity: 0.15, transform: [{ scale: 0.95 }] },
  cutStar: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.star, shadowColor: C.glow, shadowOpacity: 1, shadowRadius: 8 },
  cutText: { fontFamily: F.serifRegular, fontSize: 27, lineHeight: 32, color: C.ink, textAlign: 'center' },
  or: { textAlign: 'center', fontFamily: F.serifItalic, color: C.faint, fontSize: 16 },
  track: { height: 3, borderRadius: 2, backgroundColor: C.line, overflow: 'hidden' },
  fill: { height: 3, backgroundColor: C.gold, width: '100%', transformOrigin: 'left' },
  results: { paddingHorizontal: S.lg, paddingVertical: S.md, gap: S.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  rowText: { flex: 1, fontFamily: F.serif, fontSize: 16, color: C.ink },
  cutTag: { fontFamily: F.sansMedium, fontSize: 9, letterSpacing: 2, color: C.gold },
  bring: { gap: 10, borderTopWidth: 1, borderTopColor: 'rgba(216,180,106,0.3)', paddingTop: S.md },
  small: { fontFamily: F.sans, fontSize: 13, color: C.faint },
  picks: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pick: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: R.full, borderWidth: 1, borderColor: C.line },
  pickOn: { borderColor: C.ink, backgroundColor: C.ink },
  pickText: { fontFamily: F.sansMedium, fontSize: 14, color: C.dim },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15, paddingHorizontal: 16, borderRadius: R.xl, borderWidth: 1, borderColor: C.line, backgroundColor: 'rgba(20,25,56,0.75)' },
  cardOn: { borderColor: C.glow },
  cardText: { flex: 1, fontFamily: F.serif, fontSize: 19, color: C.ink },
  dot: { width: 9, height: 9, borderRadius: 5 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { fontFamily: F.sansMedium, fontSize: 10, letterSpacing: 2.5, color: C.faint, marginTop: 4 },
  input: { borderWidth: 1, borderColor: C.gold, backgroundColor: 'rgba(20,25,56,0.8)', borderRadius: R.lg, paddingVertical: 12, paddingHorizontal: 14, color: C.ink, fontFamily: F.sans, fontSize: 16 },
  plan: { gap: 4, padding: S.md, borderRadius: R.xl, borderWidth: 1, borderColor: 'rgba(216,180,106,0.45)', backgroundColor: 'rgba(20,25,56,0.8)' },
  planWhen: { fontFamily: F.sansMedium, fontSize: 10, letterSpacing: 2.5, color: C.gold },
  planText: { fontFamily: F.serifRegular, fontSize: 26, lineHeight: 31, color: C.ink },
  progress: { gap: 8, borderTopWidth: 1, borderTopColor: C.line, paddingTop: S.md },
  slots: { flexDirection: 'row', gap: 10 },
  slot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: 'rgba(239,230,214,0.4)', borderStyle: 'dashed' },
  slotOn: { backgroundColor: C.star, borderWidth: 0, shadowColor: C.glow, shadowOpacity: 1, shadowRadius: 5 },
  tallyItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 10, borderRadius: R.full, borderWidth: 1, borderColor: C.line },
  tallyN: { fontFamily: F.sansMedium, fontSize: 12, color: C.ink },
});

