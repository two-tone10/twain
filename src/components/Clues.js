import { StyleSheet, Text, View } from 'react-native';
import { SLOTS, TILE } from '../game/content.mjs';
import { C, R, S } from '../lib/theme';
import { cap } from './Pick';

// Every round leaves a clue: what was offered, and what got taken over what.
export function Clues({ state, seat, them }) {
  if (!state.history.length) return null;
  return (
    <View style={{ gap: 6 }}>
      {state.history.map((h) => {
        const passed = h.offer.find((id) => id !== h.took);
        const taker = h.offerer === seat ? cap(them) : 'You';
        return (
          <View key={h.round} style={styles.row}>
            <Text style={styles.slot}>{SLOTS[h.round - 1]}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.line} numberOfLines={1}>
                {TILE[h.took].emoji} <Text style={styles.took}>{TILE[h.took].name}</Text>
              </Text>
              <Text style={styles.passed} numberOfLines={1}>
                {taker} took it over {TILE[passed].emoji} {TILE[passed].name}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: S.sm, backgroundColor: C.surface,
    borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.sm,
  },
  slot: { width: 72, fontSize: 12, color: C.muted, fontWeight: '700' },
  line: { fontSize: 14, color: C.ink },
  took: { fontWeight: '700' },
  passed: { fontSize: 12, color: C.muted, marginTop: 2 },
});
