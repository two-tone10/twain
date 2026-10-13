import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { WHY } from '../../keep/content.mjs';
import { activeList, dayKey } from '../../keep/insight.mjs';
import { dueCheckIns } from '../../keep/modes.mjs';
import { checkInAsk, planMeta } from '../../keep/plans.mjs';
import { Button, Eyebrow, Reading, StillSky, WhyChip } from '../../keep/ui';
import { answerCheckIn, loadList, toggleListItem } from '../../lib/storage';
import { loadEvening, saveEvening } from '../../lib/prefs';
import { allowReminders, scheduleEvening } from '../../keep/notify';
import { C, F, R, S } from '../../lib/theme';

const shortDay = (t, today) => (dayKey(t) === today ? 'Today' : new Date(t).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }));

export default function List() {
  const [list, setList] = useState([]);
  const [now, setNow] = useState(0);
  const [glad, setGlad] = useState(null);
  const [noteFor, setNoteFor] = useState(null);
  const [noteText, setNoteText] = useState('');
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
    if (yes) setNoteFor(glad);
    else flash('Noted. Worth knowing too.');
    setGlad(null);
  };
  // One optional line for the codex. Asked once, easy to skip.
  const saveNote = async () => {
    const n = noteText.trim();
    if (n) update(await answerCheckIn(noteFor.id, { note: n }));
    setNoteFor(null);
    setNoteText('');
    flash(n ? 'Kept, with your note.' : 'Kept.');
  };

  const today = dayKey(now);
  const due = now ? dueCheckIns(list, now)[0] : null;
  const open = activeList(list, now).filter((it) => !it.done && it.didIt == null && it.id !== due?.id);
  const todays = open.filter((it) => (it.when ? it.when === 'tonight' && dayKey(it.at) === today : dayKey(it.at) === today));
  const someday = open.filter((it) => it.when === 'someday');
  const week = open.filter((it) => !todays.includes(it) && !someday.includes(it));
  const done = list.filter((it) => it.done || it.didIt).sort((a, b) => (b.doneAt ?? b.at) - (a.doneAt ?? a.at));

  const row = (it, i) => (
    <Pressable key={it.id} onPress={() => toggle(it.id)} accessibilityRole="checkbox" accessibilityState={{ checked: false }} style={[styles.todo, i > 0 && styles.line]}>
      <View style={[styles.tick, { borderColor: WHY[it.k].color }]} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.todoText}>{it.t}</Text>
        {planMeta(it, now) ? <Text style={styles.day}>{planMeta(it, now)}</Text> : null}
      </View>
      {!it.when && dayKey(it.at) !== today && <Text style={styles.day}>{new Date(it.at).toLocaleDateString(undefined, { weekday: 'short' })}</Text>}
    </Pressable>
  );

  return (
    <View style={styles.root}>
      <StillSky />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.wrap}>
          <Eyebrow>Your list</Eyebrow>
          <Text style={styles.h2}>Up <Text style={styles.em}>next.</Text></Text>

          {due && !glad && !noteFor && (
            <View style={styles.card}>
              <Reading line={checkInAsk(due, now)} style={styles.ask} />
              <View style={styles.answers}>
                <Button small label="Yes" onPress={() => answer(due, true)} style={{ flex: 1 }} />
                <Button small ghost label="Not this time" onPress={() => answer(due, false)} style={{ flex: 1.4 }} />
              </View>
            </View>
          )}
          {noteFor && (
            <View style={styles.card}>
              <Text style={styles.ask}>What made it good?</Text>
              <TextInput value={noteText} onChangeText={setNoteText} placeholder="One line for your codex (optional)" placeholderTextColor={C.faint} maxLength={120} style={styles.noteIn} returnKeyType="done" onSubmitEditing={saveNote} />
              <View style={styles.answers}>
                <Button small label={noteText.trim() ? 'Keep it' : 'Skip'} onPress={saveNote} style={{ flex: 1 }} />
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

          {!todays.length && !week.length && !someday.length && !done.length && !due && (
            <Text style={styles.empty}>Empty. After a round, tap “Make one real.”</Text>
          )}

          {todays.length > 0 && (
            <View style={styles.section}>
              <Eyebrow>Today</Eyebrow>
              {todays.map(row)}
            </View>
          )}

          {week.length > 0 && (
            <View style={styles.section}>
              <Eyebrow>This week</Eyebrow>
              {week.map(row)}
            </View>
          )}

          {someday.length > 0 && (
            <View style={styles.section}>
              <Eyebrow>Someday</Eyebrow>
              {someday.map(row)}
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
              <Text style={styles.hint}>A 6pm note with one thing from your list.</Text>
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
  noteIn: { borderWidth: 1, borderColor: C.line, backgroundColor: 'rgba(5,6,15,0.5)', borderRadius: R.lg, paddingVertical: 11, paddingHorizontal: 12, color: C.ink, fontFamily: F.serifItalic, fontSize: 16, marginBottom: S.sm },
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
