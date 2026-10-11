import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { WHY } from '../../keep/content.mjs';
import { activeList, dayKey } from '../../keep/insight.mjs';
import { dueCheckIns } from '../../keep/modes.mjs';
import { Button, Eyebrow, StillSky, WhyChip } from '../../keep/ui';
import { answerCheckIn, loadList, toggleListItem } from '../../lib/storage';
import { loadEvening, saveEvening } from '../../lib/prefs';
import { allowReminders, scheduleEvening } from '../../keep/notify';
import { C, F, R, S } from '../../lib/theme';

const shortDay = (t, today) => (dayKey(t) === today ? 'Today' : new Date(t).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }));

export default function List() {
  const [list, setList] = useState([]);
  const [now, setNow] = useState(0);
  const [glad, setGlad] = useState(null);
  const [note, setNote] = useState('');
  const [evening, setEvening] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60e3);
    return () => clearInterval(id);
  }, []);
  useFocusEffect(useCallback(() => { setNow(Date.now()); loadList().then(setList); loadEvening().then(setEvening); }, []));

  // Any change to the list re-picks tonight's star.
  const update = (all) => { setList(all); scheduleEvening(all, evening); };
  const toggleEvening = async (on) => {
    if (on && !(await allowReminders())) { flash('Notifications are off for Keep in Settings.'); return; }
    setEvening(on);
    await saveEvening(on);
    scheduleEvening(list, on);
    if (on) flash('Tonight at 6, one moment from your list.');
  };

  const flash = (msg) => { setNote(msg); setTimeout(() => setNote(''), 2200); };
  const toggle = async (id) => {
    const { all, item } = await toggleListItem(id);
    update(all);
    if (item?.done) { Haptics.selectionAsync(); flash(`Done. A ${WHY[item.k].name.toLowerCase()} moment.`); }
  };
  const answer = async (it, didIt) => {
    update(await answerCheckIn(it.id, { didIt }));
    if (didIt) setGlad(it);
    else flash('That’s fine. It’ll keep.');
  };
  const answerGlad = async (yes) => {
    update(await answerCheckIn(glad.id, { glad: yes }));
    setGlad(null);
    flash(yes ? 'Good. Noted in your sky.' : 'Noted. Worth knowing too.');
  };

  const today = dayKey(now);
  const due = now ? dueCheckIns(list, now)[0] : null;
  const open = activeList(list, now).filter((it) => !it.done && it.didIt == null && it.id !== due?.id);
  const todays = open.filter((it) => dayKey(it.at) === today);
  const week = open.filter((it) => dayKey(it.at) !== today);
  const done = list.filter((it) => it.done || it.didIt).sort((a, b) => (b.doneAt ?? b.at) - (a.doneAt ?? a.at));

  const row = (it, i) => (
    <Pressable key={it.id} onPress={() => toggle(it.id)} accessibilityRole="checkbox" accessibilityState={{ checked: false }} style={[styles.todo, i > 0 && styles.line]}>
      <View style={[styles.tick, { borderColor: WHY[it.k].color }]} />
      <Text style={styles.todoText}>{it.t}</Text>
      {dayKey(it.at) !== today && <Text style={styles.day}>{new Date(it.at).toLocaleDateString(undefined, { weekday: 'short' })}</Text>}
    </Pressable>
  );

  return (
    <View style={styles.root}>
      <StillSky />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.wrap}>
          <Eyebrow>Your list</Eyebrow>
          <Text style={styles.h2}>
            Moments you might{'\n'}
            <Text style={styles.em}>actually do.</Text>
          </Text>

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

          {!todays.length && !week.length && !done.length && !due && (
            <Text style={styles.empty}>Nothing here yet. After a round, pick a moment to bring into today and it will wait here for a week.</Text>
          )}

          {todays.length > 0 && (
            <View style={styles.section}>
              <Eyebrow>Today</Eyebrow>
              <Text style={styles.hint}>Try one if the day allows.</Text>
              {todays.map(row)}
            </View>
          )}

          {week.length > 0 && (
            <View style={styles.section}>
              <Eyebrow>This week</Eyebrow>
              {week.map(row)}
            </View>
          )}

          {done.length > 0 && (
            <View style={styles.section}>
              <Eyebrow>What you’ve done</Eyebrow>
              {done.map((it, i) => (
                <Pressable key={it.id} disabled={!it.done} onPress={() => toggle(it.id)} accessibilityRole={it.done ? 'checkbox' : undefined} accessibilityState={{ checked: true }} style={[styles.doneRow, i > 0 && styles.line]}>
                  <View style={[styles.tick, { borderColor: WHY[it.k].color, backgroundColor: WHY[it.k].color }]}>
                    <Text style={styles.mark}>✓</Text>
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={styles.todoText}>{it.t}</Text>
                    <View style={styles.meta}>
                      <WhyChip k={it.k} />
                      <Text style={styles.day}>{shortDay(it.doneAt ?? it.at, today)}</Text>
                      {it.glad && <Text style={styles.glad}>glad you did</Text>}
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
          <View style={[styles.section, styles.evening]}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.todoText}>Tonight’s star</Text>
              <Text style={styles.hint}>A quiet note at 6pm with one moment from your list. Only on days the list has something.</Text>
            </View>
            <Switch value={evening} onValueChange={toggleEvening} trackColor={{ true: C.gold, false: C.line }} thumbColor={C.ink} accessibilityLabel="Tonight’s star" />
          </View>
        </ScrollView>
      </SafeAreaView>
      {note ? <Text style={styles.toast}>{note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.sky0 },
  wrap: { paddingHorizontal: S.lg, paddingVertical: S.md, gap: S.md },
  h2: { fontFamily: F.serifRegular, fontSize: 30, lineHeight: 36, color: C.ink },
  em: { fontFamily: F.serifItalic, color: C.gold },
  card: { backgroundColor: 'rgba(20,25,56,0.8)', borderColor: 'rgba(216,180,106,0.4)', borderWidth: 1, borderRadius: R.xl, padding: S.md },
  ask: { fontFamily: F.serifRegular, fontSize: 18, lineHeight: 25, color: C.ink, marginBottom: S.sm },
  answers: { flexDirection: 'row', gap: S.sm },
  empty: { fontFamily: F.sans, fontSize: 15, lineHeight: 22, color: C.faint },
  section: { gap: 2, borderTopWidth: 1, borderTopColor: C.line, paddingTop: S.md },
  evening: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  hint: { fontFamily: F.sans, fontSize: 13, color: C.faint, marginBottom: 4, marginTop: 4 },
  todo: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  doneRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12 },
  line: { borderTopWidth: 1, borderTopColor: C.line },
  tick: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  mark: { fontSize: 12, color: C.dark, fontFamily: F.sansBold },
  todoText: { flex: 1, fontFamily: F.serif, fontSize: 17, color: C.ink },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  day: { fontFamily: F.sans, fontSize: 12, color: C.faint },
  glad: { fontFamily: F.serifItalic, fontSize: 13, color: C.gold },
  toast: { position: 'absolute', bottom: 24, alignSelf: 'center', backgroundColor: C.sky1, borderColor: C.line, borderWidth: 1, color: C.ink, fontFamily: F.sans, fontSize: 14, paddingVertical: 10, paddingHorizontal: 16, borderRadius: R.full, overflow: 'hidden' },
});
