import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ROLES, SLOTS, TAG_LABEL, TILE } from '../game/content.mjs';
import { goalMet, score } from '../game/engine.mjs';
import { C, R, S, roleColor, serif } from '../lib/theme';
import { Button, Card, Eyebrow } from './ui';

function Goals({ state, role }) {
  const color = roleColor(role);
  return (
    <Card style={{ flex: 1, gap: 6 }}>
      <Text style={{ color, fontWeight: '800' }}>{ROLES[role].name}</Text>
      {state.goals[role].map((g, i) => {
        const met = goalMet(g, state.board);
        return (
          <Text key={i} style={[styles.goal, met && { color }]}>
            {met ? '● ' : '○ '}
            {g.text}
          </Text>
        );
      })}
    </Card>
  );
}

export function Reveal({ state, onNext, nextLabel }) {
  const s = score(state);
  const title = s.full ? 'A full day.' : s.win ? 'A good Saturday.' : 'Not quite yet.';
  const tally = `Delight ${s.delight}/3 · Growth ${s.growth}/3`;
  const sub = s.win ? `${tally}. Saved to your album.` : `${tally}. You need 2 on each side.`;
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Eyebrow>Round {state.round}</Eyebrow>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.sub}>{sub}</Text>
      <View style={styles.row}>
        <Goals state={state} role="savorer" />
        <Goals state={state} role="steward" />
      </View>
      <Eyebrow>What each of you saw</Eyebrow>
      <View style={{ gap: 6 }}>
        {SLOTS.map((label, i) => {
          const id = state.board[i];
          if (!id) return null;
          const t = TILE[id];
          return (
            <View key={label} style={styles.slot}>
              <Text style={styles.slotLabel}>{label}</Text>
              <Text style={styles.emoji}>{t.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{t.name}</Text>
                <Text style={styles.tags}>
                  <Text style={{ color: C.savorer }}>{t.d.map((x) => TAG_LABEL[x]).join(' · ')}</Text>
                  {t.d.length && t.g.length ? '   ' : ''}
                  <Text style={{ color: C.steward }}>{t.g.map((x) => TAG_LABEL[x]).join(' · ')}</Text>
                </Text>
              </View>
            </View>
          );
        })}
      </View>
      <Text style={styles.swap}>Next round, you swap.</Text>
      <Button label={nextLabel || (s.win ? 'Next Saturday' : 'Try another Saturday')} onPress={onNext} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: S.md, gap: S.md, paddingBottom: S.xl * 2, maxWidth: 560, width: '100%', alignSelf: 'center' },
  title: { fontFamily: serif, fontSize: 36, color: C.ink, fontWeight: '600' },
  sub: { fontSize: 15, color: C.muted, marginTop: -S.sm },
  row: { flexDirection: 'row', gap: S.sm },
  goal: { fontSize: 14, color: C.muted, fontWeight: '600' },
  slot: {
    flexDirection: 'row', alignItems: 'center', gap: S.sm, backgroundColor: C.surface,
    borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.sm,
  },
  slotLabel: { width: 84, fontSize: 12, color: C.muted, fontWeight: '700' },
  emoji: { fontSize: 22 },
  name: { fontSize: 14, fontWeight: '700', color: C.ink },
  tags: { fontSize: 12, fontWeight: '700' },
  swap: { textAlign: 'center', color: C.muted, fontFamily: serif, fontStyle: 'italic', fontSize: 16 },
});
