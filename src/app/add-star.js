// Add a star to the commons: one short moment and its why. Reviewed before anyone else sees it.
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { WHYS } from '../keep/content.mjs';
import { Button, Eyebrow, StillSky, goHome } from '../keep/ui';
import { submitStar } from '../lib/commons';
import { C, F, R, S } from '../lib/theme';

const REASONS = {
  too_short: 'A few more words.',
  too_long: 'Keep it under 30 characters so it fits on a star.',
  not_allowed: 'That one can’t go up. Try another.',
  slow_down: 'That’s plenty for today. Try again tomorrow.',
  offline: 'Couldn’t reach the commons. Try again in a bit.',
};

export default function AddStar() {
  const [t, setT] = useState('');
  const [k, setK] = useState(null);
  const [state, setState] = useState(null);
  const clean = t.trim();
  const ready = clean.length >= 3 && clean.length <= 30 && k;

  const send = async () => {
    setState('sending');
    const r = await submitStar({ t: clean, k });
    if (r?.ok) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); setState('sent'); }
    else setState(REASONS[r?.reason] ?? REASONS.offline);
  };

  if (state === 'sent') {
    return (
      <View style={styles.root}>
        <StillSky />
        <SafeAreaView style={styles.wrap}>
          <Eyebrow>Sent</Eyebrow>
          <Text style={styles.h2}>“{clean}” is on its way up.</Text>
          <Text style={styles.sub}>Every star is read before it falls for anyone else. If it’s caught often, it may join the main sky.</Text>
          <View style={{ flex: 1 }} />
          <Button label="Add another" onPress={() => { setT(''); setK(null); setState(null); }} />
          <Button ghost label="Done" onPress={goHome} />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StillSky />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
            <Eyebrow>Add a star</Eyebrow>
            <Text style={styles.h2}>A moment you’d keep.</Text>
            <TextInput value={t} onChangeText={setT} placeholder="A long walk after rain" placeholderTextColor={C.faint} maxLength={30} style={styles.input} />
            <Text style={styles.count}>{clean.length}/30</Text>
            <Text style={styles.sub}>Why it matters</Text>
            <View style={styles.chips}>
              {WHYS.map((w) => (
                <Pressable key={w.key} accessibilityRole="radio" accessibilityState={{ selected: k === w.key }} onPress={() => setK(w.key)} style={[styles.chip, k === w.key && { backgroundColor: w.color, borderColor: w.color }]}>
                  <Text style={[styles.chipT, k === w.key && { color: C.dark }]}>{w.name}</Text>
                </Pressable>
              ))}
            </View>
            {typeof state === 'string' && state !== 'sending' && <Text style={styles.err}>{state}</Text>}
            <Button label={state === 'sending' ? 'Sending…' : 'Send it up'} disabled={!ready || state === 'sending'} onPress={send} />
            <Text style={styles.sub}>Short and everyday works best. No names or links. Every star is reviewed first.</Text>
            <Button ghost label="Cancel" onPress={goHome} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.sky0 },
  wrap: { flexGrow: 1, paddingHorizontal: S.lg, paddingVertical: S.md, gap: S.md },
  h2: { fontFamily: F.serifRegular, fontSize: 30, lineHeight: 36, color: C.ink },
  sub: { fontFamily: F.sans, fontSize: 13, lineHeight: 19, color: C.faint },
  input: { borderWidth: 1, borderColor: C.gold, backgroundColor: C.card, borderRadius: R.lg, paddingVertical: 14, paddingHorizontal: 14, color: C.ink, fontFamily: F.serif, fontSize: 20 },
  count: { fontFamily: F.sans, fontSize: 12, color: C.faint, textAlign: 'right', marginTop: -8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 13, borderRadius: R.full, borderWidth: 1, borderColor: C.line },
  chipT: { fontFamily: F.sansMedium, fontSize: 13, color: C.dim },
  err: { fontFamily: F.sans, fontSize: 14, color: '#e79a7a' },
});
