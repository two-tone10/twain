// Circles: small groups that share the daily drop. Create one, join with a code, or open one you're in.
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NameGate } from '../keep/together-ui';
import { Button, Eyebrow, StillSky, goHome } from '../keep/ui';
import { commonsOn, createCircle, joinCircle, myCircles } from '../lib/together';
import { loadMyName } from '../lib/storage';
import { C, F, R, S } from '../lib/theme';

export default function Circles() {
  const [list, setList] = useState(null);
  const [name, setName] = useState(undefined);
  const [newName, setNewName] = useState('');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  useFocusEffect(useCallback(() => { myCircles().then(setList); loadMyName().then(setName); }, []));

  const create = async () => {
    const c = await createCircle(newName.trim() || 'My circle');
    if (c?.code) router.push(`/circle/${c.code}`); else setMsg(c?.error === 'too_many' ? 'You’re in ten circles already.' : 'Couldn’t make it. Try again.');
  };
  const join = async () => {
    const c = await joinCircle(code.trim());
    if (c?.code) router.push(`/circle/${c.code}`);
    else setMsg({ not_found: 'No circle with that code.', full: 'That circle is full.', too_many: 'You’re in ten circles already.' }[c?.error] ?? 'Couldn’t join. Try again.');
  };

  return (
    <View style={styles.root}>
      <StillSky />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
          <Eyebrow>Circles</Eyebrow>
          <Text style={styles.h2}>Your people, <Text style={styles.em}>one sky a day.</Text></Text>
          <Text style={styles.sub}>Everyone in a circle plays the same daily drop. You see each other’s skies once you’ve played.</Text>
          {!commonsOn && <Text style={styles.sub}>Circles need a connection to Keep’s server. Try again later.</Text>}
          {commonsOn && <NameGate name={name} onSaved={setName} />}

          {(list ?? []).length > 0 && (
            <View style={styles.block}>
              {list.map((c) => (
                <Pressable key={c.code} accessibilityRole="button" onPress={() => router.push(`/circle/${c.code}`)} style={styles.row}>
                  <Text style={styles.rowT}>{c.name}</Text>
                  <Text style={styles.meta}>{c.members} {c.members === 1 ? 'person' : 'people'} ›</Text>
                </Pressable>
              ))}
            </View>
          )}

          {commonsOn && name ? (
            <>
              <View style={styles.block}>
                <Text style={styles.label}>START A CIRCLE</Text>
                <TextInput value={newName} onChangeText={setNewName} placeholder="The family, the team, the roommates…" placeholderTextColor={C.faint} maxLength={30} style={styles.input} />
                <Button label="Create" onPress={create} />
              </View>
              <View style={styles.block}>
                <Text style={styles.label}>JOIN WITH A CODE</Text>
                <TextInput value={code} onChangeText={(t) => setCode(t.toUpperCase())} placeholder="6 letters" placeholderTextColor={C.faint} autoCapitalize="characters" maxLength={6} style={styles.input} />
                <Button ghost label="Join" disabled={code.trim().length !== 6} onPress={join} />
              </View>
            </>
          ) : null}
          {msg ? <Text style={styles.err}>{msg}</Text> : null}
          <Button ghost label="Home" onPress={goHome} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.sky0 },
  wrap: { paddingHorizontal: S.lg, paddingVertical: S.md, gap: S.md },
  h2: { fontFamily: F.serifRegular, fontSize: 30, lineHeight: 36, color: C.ink },
  em: { fontFamily: F.serifItalic, color: C.gold },
  sub: { fontFamily: F.sans, fontSize: 14, lineHeight: 20, color: C.dim },
  block: { gap: 8, borderTopWidth: 1, borderTopColor: C.line, paddingTop: S.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  rowT: { fontFamily: F.serif, fontSize: 19, color: C.ink },
  meta: { fontFamily: F.sans, fontSize: 13, color: C.faint },
  label: { fontFamily: F.sansMedium, fontSize: 10, letterSpacing: 2.5, color: C.faint },
  input: { borderWidth: 1, borderColor: C.line, backgroundColor: C.inset, borderRadius: R.lg, paddingVertical: 12, paddingHorizontal: 14, color: C.ink, fontFamily: F.sans, fontSize: 16 },
  err: { fontFamily: F.sans, fontSize: 14, color: C.gold },
});
