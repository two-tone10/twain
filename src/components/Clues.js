import { StyleSheet, Text, View } from 'react-native';
import { SLOTS, TILE } from '../game/content.mjs';
import { C, R, S } from '../lib/theme';
import { cap } from './Pick';

const t = (id) => `${TILE[id].emoji} ${TILE[id].name}`;

function line(h, seat, them) {
  const name = (s) => (s === seat ? 'you' : them);
  const Name = (s) => cap(name(s));
  switch (h.kind) {
    case 'veto': {
      const kept = h.shown.find((id) => id !== h.took && id !== h.struck);
      return `${Name(h.striker)} struck ${t(h.struck)}. ${Name(h.by)} took it over ${t(kept)}`;
    }
    case 'blind': {
      if (h.sync) return 'You both picked it blind';
      const mine = h.picks[seat];
      const theirs = h.picks[seat === 'a' ? 'b' : 'a'];
      return `Blind: you picked ${t(mine)}, ${them} picked ${t(theirs)}. Coin flip`;
    }
    case 'last':
      return `${Name(h.cutter)} cut ${t(h.cut)}. ${Name(h.by)} filled night`;
    default: {
      const passed = h.offer.find((id) => id !== h.took);
      return `${Name(h.to)} took it over ${t(passed)}${h.kind === 'turn' ? ' (after the Turn)' : ''}`;
    }
  }
}

// Every round leaves a clue: what was shown, struck, picked, or cut.
export function Clues({ state, seat, them }) {
  if (!state.history.length) return null;
  return (
    <View style={{ gap: 6 }}>
      {state.history.map((h) => (
        <View key={h.round} style={styles.row}>
          <Text style={styles.slot}>{SLOTS[h.round - 1]}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.line} numberOfLines={1}>
              {TILE[h.took].emoji} <Text style={styles.took}>{TILE[h.took].name}</Text>
            </Text>
            <Text style={styles.passed}>{line(h, seat, them)}</Text>
          </View>
        </View>
      ))}
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
