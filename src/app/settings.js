// The few settings Keep has: calm mode, the daily reminder, your name for challenges, and the deck.
import { useEffect, useState } from 'react';
import { DevSettings, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import * as Updates from 'expo-updates';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DECK } from '../keep/content.mjs';
import { dayNumber } from '../keep/fun.mjs';
import { allowReminders, scheduleDailyDrop } from '../keep/notify';
import { Button, Eyebrow, StillSky, goHome } from '../keep/ui';
import { calmNow, deckNow, loadDailyHour, saveDailyHour, setCalm } from '../lib/prefs';
import { loadDailies, loadMyName, saveMyName } from '../lib/storage';
import { C, F, R, S, THEME_CHOICE, THEME_CHOICES, saveThemeChoice } from '../lib/theme';

const HOURS = [[null, 'Off'], [8, '8 am'], [12, 'Noon'], [18, '6 pm'], [21, '9 pm']];

export default function Settings() {
  const [calm, setCalmState] = useState(calmNow());
  const [hour, setHour] = useState(undefined);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  useEffect(() => { loadDailyHour().then(setHour); loadMyName().then(setName); }, []);

  // The theme is read at launch, so switching saves the choice and restarts the app.
  const pickTheme = (k) => {
    if (k === THEME_CHOICE) return;
    try { saveThemeChoice(k); } catch { return; }
    Updates.reloadAsync().catch(() => DevSettings.reload());
  };

  const pickHour = async (h) => {
    if (h != null && !(await allowReminders())) { setNote('Notifications are off for Keep in Settings.'); return; }
    setHour(h);
    await saveDailyHour(h);
    const done = !!(await loadDailies())[dayNumber()];
    await scheduleDailyDrop(h, done);
    setNote(h == null ? '' : 'You’ll get one quiet note a day. Skip it anytime.');
  };

  return (
    <View style={styles.root}>
      <StillSky />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
          <Eyebrow>Settings</Eyebrow>

          <View style={[styles.block, { borderTopWidth: 0, paddingTop: 0 }]}>
            <Text style={styles.t}>Theme</Text>
            <View style={styles.chips}>
              {THEME_CHOICES.map(([k, l]) => (
                <Pressable key={k} accessibilityRole="radio" accessibilityState={{ selected: THEME_CHOICE === k }} onPress={() => pickTheme(k)} style={[styles.chip, THEME_CHOICE === k && styles.chipOn]}>
                  <Text style={[styles.chipT, THEME_CHOICE === k && { color: C.dark }]}>{l}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.s}>Auto matches your phone: Daylight by day, Charcoal at night. Keep restarts to switch.</Text>
          </View>

          <View style={[styles.row, styles.block]}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.t}>Calm mode</Text>
              <Text style={styles.s}>Slower stars, a gentler comet.</Text>
            </View>
            <Switch value={calm} onValueChange={(v) => { setCalmState(v); setCalm(v); }} trackColor={{ true: C.gold, false: C.line }} thumbColor={C.ink} accessibilityLabel="Calm mode" />
          </View>

          <View style={styles.block}>
            <Text style={styles.t}>Today’s drop reminder</Text>
            <View style={styles.chips}>
              {HOURS.map(([h, l]) => (
                <Pressable key={l} accessibilityRole="radio" accessibilityState={{ selected: hour === h }} onPress={() => pickHour(h)} style={[styles.chip, hour === h && styles.chipOn]}>
                  <Text style={[styles.chipT, hour === h && { color: C.dark }]}>{l}</Text>
                </Pressable>
              ))}
            </View>
            {note ? <Text style={styles.s}>{note}</Text> : null}
          </View>

          <View style={styles.block}>
            <Text style={styles.t}>Your name</Text>
            <Text style={styles.s}>Shown to friends when you send a drop.</Text>
            <TextInput value={name} onChangeText={setName} onEndEditing={() => saveMyName(name.trim())} placeholder="First name" placeholderTextColor={C.faint} maxLength={20} style={styles.input} returnKeyType="done" />
          </View>

          <Pressable accessibilityRole="button" onPress={() => router.push('/decks')} style={[styles.row, styles.block]}>
            <Text style={[styles.t, { flex: 1 }]}>Deck</Text>
            <Text style={styles.v}>{DECK[deckNow()].name} ›</Text>
          </Pressable>

          <Button ghost label="Done" onPress={() => { saveMyName(name.trim()); goHome(); }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.sky0 },
  wrap: { paddingHorizontal: S.lg, paddingVertical: S.md, gap: S.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  block: { gap: 8, borderTopWidth: 1, borderTopColor: C.line, paddingTop: S.md },
  t: { fontFamily: F.serif, fontSize: 18, color: C.ink },
  s: { fontFamily: F.sans, fontSize: 13, color: C.faint },
  v: { fontFamily: F.sansMedium, fontSize: 14, color: C.gold },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: R.full, borderWidth: 1, borderColor: C.line },
  chipOn: { backgroundColor: C.ink, borderColor: C.ink },
  chipT: { fontFamily: F.sansMedium, fontSize: 13, color: C.dim },
  input: { borderWidth: 1, borderColor: C.line, backgroundColor: C.card, borderRadius: R.lg, paddingVertical: 12, paddingHorizontal: 14, color: C.ink, fontFamily: F.sans, fontSize: 16 },
});
