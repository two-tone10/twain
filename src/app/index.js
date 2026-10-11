import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Button, Eyebrow, StillSky } from '../keep/ui';
import { drawGhosts, drawConstellation, layout } from '../keep/sky';
import { BASKET, WHY } from '../keep/content.mjs';
import { activeList, dayKey } from '../keep/insight.mjs';
import { dueCheckIns, fmtLeft, slowSnapshot } from '../keep/modes.mjs';
import { answerCheckIn, loadList, loadSkies, loadSlow, toggleListItem } from '../lib/storage';
import { C, F, R, S } from '../lib/theme';

export default function Home() {
  const [skies, setSkies] = useState([]);
  const [list, setList] = useState([]);
  const [slow, setSlow] = useState(null);
  const [glad, setGlad] = useState(null); // the item we just heard you did
  const [note, setNote] = useState('');
  const [now, setNow] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30e3);
    return () => clearInterval(id);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setNow(Date.now());
      loadSkies().then(setSkies);
      loadList().then(setList);
      loadSlow().then(setSlow);
    }, []),
  );

  const flash = (msg) => { setNote(msg); setTimeout(() => setNote(''), 2200); };

  const toggle = async (id) => {
    const { all, item } = await toggleListItem(id);
    setList(all);
    if (item?.done) { Haptics.selectionAsync(); flash(`Done. A ${WHY[item.k].name.toLowerCase()} moment.`); }
  };

  const answer = async (it, didIt) => {
    setList(await answerCheckIn(it.id, { didIt }));
    if (didIt) setGlad(it);
    else flash('That’s fine. It’ll keep.');
  };
  const answerGlad = async (yes) => {
    setList(await answerCheckIn(glad.id, { glad: yes }));
    setGlad(null);
    flash(yes ? 'Good. Noted in your sky.' : 'Noted. Worth knowing too.');
  };

  const today = dayKey(now);
  const due = now ? dueCheckIns(list, now)[0] : null;
  const shown = activeList(list, now).filter((it) => it.didIt == null && it.id !== due?.id);
  const snap = slow && !slow.recorded && now ? slowSnapshot(slow, now, BASKET) : null;
  const slowLine = !snap ? 'Or a slow drop, all day ›'
    : snap.done ? 'Your slow drop is done. See how it went ›'
    : `Slow drop · ${slow.kept.length} of ${BASKET} kept · ${snap.live.length ? `${snap.live.length} falling now` : `next in ${fmtLeft(snap.next.spawnAt - now)}`} ›`;

  return (
    <View style={styles.root}>
      <StillSky
        version={skies.length}
        draw={(c, w, h) => {
          if (!skies.length) return;
          const box = { x: 24, y: h * 0.1, w: w - 48, h: h * 0.22 };
          drawGhosts(c, skies.slice(0, -1), box);
          const last = skies[skies.length - 1];
          drawConstellation(c, last, layout(last, box), { alpha: 0.55, labels: false });
        }}
      />
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.wrap}>
          {skies.length > 0 ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Open your sky" onPress={() => router.push('/sky')} style={styles.skyTap}>
              <Text style={styles.skyLink}>YOUR SKY ›</Text>
            </Pressable>
          ) : (
            <View style={{ flex: 1, minHeight: 180 }} />
          )}
          <Text style={styles.title}>
            Keep<Text style={{ color: C.gold }}>.</Text>
          </Text>
          <Text style={styles.tag}>Moments fall like stars. Tap the ones you’d keep. Your sky holds five.</Text>
          <Text style={styles.hint}>Don’t think. It gets faster.</Text>
          <View style={{ flex: 1, minHeight: 28 }} />

          {due && !glad && (
            <View style={styles.card}>
              <Text style={styles.ask}>
                {dayKey(due.at) === dayKey(now - 864e5) ? 'Yesterday' : 'Earlier this week'} you picked <Text style={styles.em}>{due.t.toLowerCase()}</Text>. Did you get to it?
              </Text>
              <View style={styles.answers}>
                <Button small label="Yes" onPress={() => answer(due, true)} style={{ flex: 1 }} />
                <Button small ghost label="Not this time" onPress={() => answer(due, false)} style={{ flex: 1.4 }} />
              </View>
            </View>
          )}
          {glad && (
            <View style={styles.card}>
              <Text style={styles.ask}>Glad you did?</Text>
              <View style={styles.answers}>
                <Button small label="Yes" onPress={() => answerGlad(true)} style={{ flex: 1 }} />
                <Button small ghost label="Not really" onPress={() => answerGlad(false)} style={{ flex: 1.4 }} />
              </View>
            </View>
          )}

          {shown.length > 0 && (
            <View style={styles.card}>
              <Eyebrow>From your sky</Eyebrow>
              <Text style={styles.todayHint}>Try one if the day allows.</Text>
              {shown.map((it, i) => (
                <Pressable key={it.id} onPress={() => toggle(it.id)} accessibilityRole="checkbox" accessibilityState={{ checked: it.done }} style={[styles.todo, i > 0 && styles.todoLine]}>
                  <View style={[styles.tick, { borderColor: WHY[it.k].color }, it.done && { backgroundColor: WHY[it.k].color }]}>
                    {it.done && <Text style={styles.tickMark}>✓</Text>}
                  </View>
                  <Text style={[styles.todoText, it.done && { color: C.faint }]}>{it.t}</Text>
                  {dayKey(it.at) !== today && <Text style={styles.day}>{new Date(it.at).toLocaleDateString(undefined, { weekday: 'short' })}</Text>}
                </Pressable>
              ))}
            </View>
          )}

          <View style={{ gap: S.sm + 2 }}>
            <Button label="Drop" onPress={() => router.push('/play')} />
            <View style={{ flexDirection: 'row', gap: S.sm + 2 }}>
              <Button ghost label="Drift" onPress={() => router.push('/drift')} style={{ flex: 1 }} />
              <Button ghost label="Duel" onPress={() => router.push('/duel')} style={{ flex: 1 }} />
            </View>
            <Pressable accessibilityRole="button" onPress={() => router.push('/slow')} style={styles.slow}>
              <Text style={[styles.slowText, snap && !snap.done && { color: C.gold }]}>{slowLine}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
      {note ? <Text style={styles.toast}>{note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.sky0 },
  safe: { flex: 1 },
  wrap: { flexGrow: 1, paddingHorizontal: S.lg, paddingBottom: S.sm, gap: S.sm },
  skyTap: { flex: 1, minHeight: 180, paddingTop: S.sm },
  skyLink: { fontFamily: F.sansMedium, fontSize: 10, letterSpacing: 3, color: C.gold, opacity: 0.85 },
  title: { fontFamily: F.serifRegular, fontSize: 76, lineHeight: 84, color: C.ink },
  tag: { fontFamily: F.sans, fontSize: 17, lineHeight: 24, color: C.dim, maxWidth: 300 },
  hint: { fontFamily: F.sans, fontSize: 15, color: C.faint },
  card: { backgroundColor: 'rgba(20,25,56,0.75)', borderColor: C.line, borderWidth: 1, borderRadius: R.xl, padding: S.md, marginBottom: S.sm, gap: 2 },
  ask: { fontFamily: F.serifRegular, fontSize: 18, lineHeight: 25, color: C.ink, marginBottom: S.sm },
  em: { fontFamily: F.serifItalic, color: C.gold },
  answers: { flexDirection: 'row', gap: S.sm },
  todayHint: { fontFamily: F.sans, fontSize: 13, color: C.faint, marginBottom: 6 },
  todo: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  todoLine: { borderTopWidth: 1, borderTopColor: C.line },
  tick: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  tickMark: { fontSize: 12, color: C.dark, fontFamily: F.sansBold },
  todoText: { flex: 1, fontFamily: F.serif, fontSize: 17, color: C.ink },
  day: { fontFamily: F.sans, fontSize: 11, color: C.faint },
  slow: { alignItems: 'center', paddingVertical: 10 },
  slowText: { fontFamily: F.sans, fontSize: 14, color: C.dim },
  toast: { position: 'absolute', bottom: 48, alignSelf: 'center', backgroundColor: C.sky1, borderColor: C.line, borderWidth: 1, color: C.ink, fontFamily: F.sans, fontSize: 14, paddingVertical: 10, paddingHorizontal: 16, borderRadius: R.full, overflow: 'hidden' },
});
