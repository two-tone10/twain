// You: your name, how Keep looks and reminds you, your deck, the intro again, and your data:
// what stays on the phone, what goes to Keep's server, backups, and deleting it all.
import { useEffect, useState } from 'react';
import { Alert, DevSettings, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import * as Updates from 'expo-updates';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DECK } from '../keep/content.mjs';
import { dayNumber } from '../keep/fun.mjs';
import { allowReminders, scheduleDailyDrop } from '../keep/notify';
import { Button, Eyebrow, StillSky, goHome } from '../keep/ui';
import { calmNow, deckNow, loadDailyHour, loadPrefs, saveDailyHour, setCalm } from '../lib/prefs';
import { exportBackup, pickBackup, restoreBackup } from '../lib/backup';
import { commonsOn } from '../lib/commons';
import { eraseEverything, forgetMe } from '../lib/safety';
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

  const restart = () => Updates.reloadAsync().catch(() => DevSettings.reload());

  const backUp = () => exportBackup().catch(() => Alert.alert('Couldn’t make a backup', 'Try again in a moment.'));
  const restore = async () => {
    let b;
    try { b = await pickBackup(); } catch { Alert.alert('That isn’t a Keep backup', 'Pick a file named “Keep backup” that you saved from here.'); return; }
    if (!b) return;
    const when = new Date(b.at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
    Alert.alert('Restore this backup?', `From ${when}: ${b.done} moments done, ${b.rounds} rounds. It replaces what’s on this phone now.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Restore', style: 'destructive', onPress: async () => { await restoreBackup(b.backup); await loadPrefs(); restart(); } },
    ]);
  };

  const forget = () => Alert.alert('Delete your data from Keep’s server?', 'Your counts, matches, circles and any stars waiting for review are deleted. You’ll leave your circles. Everything on this phone stays.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => {
      const ok = await forgetMe();
      Alert.alert(ok ? 'Done' : 'Couldn’t reach Keep’s server', ok ? 'Keep’s server has nothing from this phone now.' : 'Nothing was deleted. Try again when you’re online.');
    } },
  ]);
  const erase = () => Alert.alert('Erase everything?', 'Your skies, list, plans and notes on this phone, and everything on Keep’s server. This can’t be undone. Back up first if you might want it.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Erase', style: 'destructive', onPress: async () => {
      if (await eraseEverything()) restart();
      else Alert.alert('Couldn’t reach Keep’s server', 'Nothing was erased. Try again when you’re online.');
    } },
  ]);

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
          <Eyebrow>You</Eyebrow>

          <View style={{ gap: 8 }}>
            <TextInput value={name} onChangeText={setName} onEndEditing={() => saveMyName(name.trim())} placeholder="Your first name" placeholderTextColor={C.faint} maxLength={20} style={styles.name} returnKeyType="done" accessibilityLabel="Your first name" />
            <Text style={styles.s}>Only people you play with see it, in Matches and Circles.</Text>
          </View>

          <Pressable accessibilityRole="button" onPress={() => router.push('/welcome')} style={styles.intro}>
            <Text style={styles.introT}>✦  Replay the intro</Text>
            <Text style={styles.v}>›</Text>
          </Pressable>

          <View style={styles.block}>
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

          <Pressable accessibilityRole="button" onPress={() => router.push('/decks')} style={[styles.row, styles.block]}>
            <Text style={[styles.t, { flex: 1 }]}>Deck</Text>
            <Text style={styles.v}>{DECK[deckNow()].name} ›</Text>
          </Pressable>

          <View style={[styles.block, { gap: 12, marginTop: S.md }]}>
            <Eyebrow>Your data</Eyebrow>
            <Text style={styles.h}>No account. No email. No phone number.</Text>
            <View style={styles.data}>
              <Text style={styles.dataK}>ON THIS PHONE ONLY</Text>
              <Text style={styles.dataV}>Your skies, sign, list, plans and notes.</Text>
            </View>
            <View style={styles.data}>
              <Text style={styles.dataK}>ON KEEP’S SERVER</Text>
              <Text style={styles.dataV}>Which stars get caught, counted without names. Your first name and kept stars in Matches and Circles. Stars you send up.</Text>
              <Text style={styles.s}>All of it is tied to a random code made on this phone, not to you.</Text>
            </View>
            <View style={styles.pills}>
              <Pressable accessibilityRole="button" onPress={backUp} style={styles.pill}><Text style={styles.pillT}>Back up</Text></Pressable>
              <Pressable accessibilityRole="button" onPress={restore} style={styles.pill}><Text style={styles.pillT}>Restore</Text></Pressable>
            </View>
            <Text style={styles.s}>A backup is a file you keep (Files, iCloud Drive, AirDrop). Keep never sees it.</Text>
            {commonsOn && (
              <Pressable accessibilityRole="button" onPress={forget} style={styles.danger}>
                <Text style={styles.dangerT}>Delete my data from Keep’s server</Text>
              </Pressable>
            )}
            <Pressable accessibilityRole="button" onPress={erase} style={styles.danger}>
              <Text style={styles.dangerT}>Erase everything</Text>
            </Pressable>
            <Text style={styles.s}>Privacy policy: lipurposefe.com/keep/privacy{'\n'}Questions or a problem: hello@lipurposefe.com</Text>
          </View>

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
  name: { fontFamily: F.serifRegular, fontSize: 30, color: C.ink, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: C.line },
  h: { fontFamily: F.serifRegular, fontSize: 22, lineHeight: 28, color: C.ink },
  data: { gap: 4 },
  dataK: { fontFamily: F.sansMedium, fontSize: 10, letterSpacing: 2.5, color: C.gold },
  dataV: { fontFamily: F.sans, fontSize: 15, lineHeight: 21, color: C.dim },
  pills: { flexDirection: 'row', gap: 8 },
  pill: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: R.full, borderWidth: 1, borderColor: C.line },
  pillT: { fontFamily: F.sansMedium, fontSize: 14, color: C.ink },
  danger: { paddingVertical: 12 },
  intro: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderRadius: R.xl, borderWidth: 1, borderColor: C.cardLine, backgroundColor: C.accentWash },
  introT: { fontFamily: F.serif, fontSize: 18, color: C.ink },
  dangerT: { fontFamily: F.sansMedium, fontSize: 15, color: C.danger },
});
