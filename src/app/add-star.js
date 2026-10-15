// Your stars: moments you add yourself. They fall in your drops, mixed in with the rest, and only for you.
// They never leave the phone (they aren't counted, shared, or sent anywhere).
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { WHYS, WHY, setOwn } from '../keep/content.mjs';
import { Button, Eyebrow, StillSky, goHome } from '../keep/ui';
import { loadMyStars, saveMyStars } from '../lib/storage';
import { C, F, R, S } from '../lib/theme';

export default function YourStars() {
  const [items, setItems] = useState([]);
  const [t, setT] = useState('');
  const [k, setK] = useState(null);
  useEffect(() => { loadMyStars().then(setItems); }, []);
  const clean = t.trim();

  const put = async (next) => { setItems(next); setOwn(next); await saveMyStars(next); };
  const add = async () => {
    if (clean.length < 3 || !k || items.some((m) => m.t === clean)) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await put([{ t: clean, k }, ...items]);
    setT(''); setK(null);
  };

  return (
    <View style={styles.root}>
      <StillSky />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
            <Eyebrow>Your stars</Eyebrow>
            <Text style={styles.h2}>A moment you’d keep.</Text>
            <Text style={styles.sub}>It falls in your drops, mixed in with the rest. Only on this phone, only for you.</Text>
            <TextInput value={t} onChangeText={setT} placeholder="A long walk after rain" placeholderTextColor={C.faint} maxLength={30} style={styles.input} />
            <Text style={styles.count}>{clean.length}/30</Text>
            <View style={styles.chips}>
              {WHYS.map((w) => (
                <Pressable key={w.key} accessibilityRole="radio" accessibilityState={{ selected: k === w.key }} onPress={() => setK(w.key)} style={[styles.chip, k === w.key && { backgroundColor: w.color, borderColor: w.color }]}>
                  <Text style={[styles.chipT, k === w.key && { color: C.dark }]}>{w.name}</Text>
                </Pressable>
              ))}
            </View>
            <Button label="Add it" disabled={clean.length < 3 || !k} onPress={add} />

            {items.length > 0 && (
              <View style={styles.block}>
                {items.map((m) => (
                  <View key={m.t} style={styles.row}>
                    <View style={[styles.dot, { backgroundColor: WHY[m.k]?.color ?? C.faint }]} />
                    <Text style={styles.t}>{m.t}</Text>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${m.t}`} hitSlop={8} onPress={() => put(items.filter((x) => x.t !== m.t))}>
                      <Text style={styles.remove}>Remove</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
            <Button ghost label="Done" onPress={goHome} />
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
  sub: { fontFamily: F.sans, fontSize: 14, lineHeight: 20, color: C.dim },
  input: { borderWidth: 1, borderColor: C.gold, backgroundColor: C.card, borderRadius: R.lg, paddingVertical: 14, paddingHorizontal: 14, color: C.ink, fontFamily: F.serif, fontSize: 20 },
  count: { fontFamily: F.sans, fontSize: 12, color: C.faint, textAlign: 'right', marginTop: -8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 13, borderRadius: R.full, borderWidth: 1, borderColor: C.line },
  chipT: { fontFamily: F.sansMedium, fontSize: 13, color: C.dim },
  block: { borderTopWidth: 1, borderTopColor: C.line, paddingTop: S.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  dot: { width: 9, height: 9, borderRadius: R.full },
  t: { flex: 1, fontFamily: F.serif, fontSize: 17, color: C.ink },
  remove: { fontFamily: F.sansMedium, fontSize: 13, color: C.faint },
});
