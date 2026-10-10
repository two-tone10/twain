import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PERSPECTIVES, ROLES, TILE } from '../game/content.mjs';
import { seenTiles } from '../game/engine.mjs';
import { C, R, S, roleColor, roleTint, serif } from '../lib/theme';
import { Clues } from './Clues';
import { Waiting, cap } from './Pick';
import { Button, Eyebrow } from './ui';

function Choice({ label, on, onPress, color = C.ink, tint = C.surface2, testID }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={[styles.choice, on && { borderColor: color, backgroundColor: tint }]}
    >
      <Text style={[styles.choiceText, on && { color }]}>{label}</Text>
    </Pressable>
  );
}

export function Guess({ state, seat, dispatch, them, label }) {
  const [side, setSide] = useState(null);
  const [switched, setSwitched] = useState(null);
  const [mask, setMask] = useState(null);
  if (state.guesses[seat]) return <Waiting title={`Waiting for ${them} to read you…`} />;
  const ready = side && switched !== null && mask;
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Eyebrow>{label ? `${label} · the read` : 'The read'}</Eyebrow>
      <Text style={styles.title}>Read {them}.</Text>
      <Clues state={state} seat={seat} them={them} />

      <Text style={styles.q}>1. Which side did {them} end on?</Text>
      <View style={styles.row}>
        {PERSPECTIVES.map((p) => (
          <Choice key={p} testID={`side-${p}`} label={ROLES[p].name} on={side === p} onPress={() => setSide(p)} color={roleColor(p)} tint={roleTint(p)} />
        ))}
      </View>

      <Text style={styles.q}>2. Did they switch at the Turn?</Text>
      <View style={styles.row}>
        <Choice testID="switched-yes" label="Switched" on={switched === true} onPress={() => setSwitched(true)} />
        <Choice testID="switched-no" label="Stayed" on={switched === false} onPress={() => setSwitched(false)} />
      </View>

      <Text style={styles.q}>3. Which tile was their Mask?</Text>
      <Text style={styles.sub}>A tile from the side they didn’t end on that they had to get on the day.</Text>
      <View style={styles.wrap}>
        {seenTiles(state).map((id) => (
          <Choice key={id} testID={`mask-${id}`} label={`${TILE[id].emoji} ${TILE[id].name}`} on={mask === id} onPress={() => setMask(id)} />
        ))}
        <Choice testID="mask-none" label="Never came up" on={mask === 'none'} onPress={() => setMask('none')} />
      </View>

      <Button
        label="Lock in my read"
        disabled={!ready}
        onPress={() => dispatch({ type: 'guess', side, switched, mask })}
        style={{ marginTop: S.sm }}
      />
      <Text style={styles.sub}>{cap(them)} is reading you too.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: S.lg, gap: S.sm, paddingBottom: S.xl * 2, maxWidth: 560, width: '100%', alignSelf: 'center' },
  title: { fontFamily: serif, fontSize: 32, color: C.ink, fontWeight: '600', marginBottom: S.xs },
  q: { fontSize: 16, fontWeight: '800', color: C.ink, marginTop: S.md },
  sub: { fontSize: 13, color: C.muted },
  row: { flexDirection: 'row', gap: S.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  choice: { borderRadius: R.full, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface, paddingVertical: 9, paddingHorizontal: 14 },
  choiceText: { fontSize: 14, fontWeight: '700', color: C.ink },
});
