import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ROLES, SLOTS, TAG_LABEL, TILE } from '../game/content.mjs';
import { goalMet, score } from '../game/engine.mjs';
import { C, R, S, roleColor, serif } from '../lib/theme';
import { cap } from './Pick';
import { Button, Card, Eyebrow } from './ui';

const mark = (ok) => (ok ? '✓' : '✗');

function Player({ state, seat, name, read, partner }) {
  const start = state.picks[seat];
  const end = state.now[seat];
  const color = roleColor(end);
  const mask = TILE[state.masks[seat]];
  return (
    <Card style={{ flex: 1, gap: 6 }}>
      <Eyebrow>{name}</Eyebrow>
      <Text style={{ color, fontWeight: '800', fontSize: 16 }}>{ROLES[end].name}</Text>
      <Text style={styles.small}>{state.switched[seat] ? `Switched from ${ROLES[start].name}` : 'Stayed all day'}</Text>
      <Text style={styles.small}>Mask: {mask.emoji} {mask.name}</Text>
      {state.goals[seat].map((g, i) => {
        const met = goalMet(g, state.board);
        return (
          <Text key={i} style={[styles.goal, met && { color }]}>
            {met ? '● ' : '○ '}
            {g.text}
          </Text>
        );
      })}
      <Text style={styles.read}>Read {partner}: {read.n}/3</Text>
      <Text style={styles.small}>Side {mark(read.side)} · Turn {mark(read.switched)} · Mask {mark(read.mask)}</Text>
    </Card>
  );
}

// `names` maps each seat to how it's addressed on this screen, e.g. { a: 'You', b: 'your partner' }.
export function Reveal({ state, names, onAgain }) {
  const s = score(state);
  const title = s.full ? 'A full day.' : s.win ? 'A good Saturday.' : 'Not quite yet.';
  const reads = s.reads.a.n + s.reads.b.n;
  const sub = `Reads ${reads}/6. ${s.win ? 'Saved to your album.' : 'A good day needs 2 goals each.'}`;
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Eyebrow>Saturday {state.game}</Eyebrow>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.sub}>{sub}</Text>
      <View style={styles.row}>
        <Player state={state} seat="a" name={cap(names.a)} read={s.reads.a} partner={names.b} />
        <Player state={state} seat="b" name={cap(names.b)} read={s.reads.b} partner={names.a} />
      </View>
      <Eyebrow>What each side saw</Eyebrow>
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
      <Text style={styles.again}>Next Saturday, pick again.</Text>
      <Button label="Play again" onPress={onAgain} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: S.md, gap: S.md, paddingBottom: S.xl * 2, maxWidth: 560, width: '100%', alignSelf: 'center' },
  title: { fontFamily: serif, fontSize: 36, color: C.ink, fontWeight: '600' },
  sub: { fontSize: 15, color: C.muted, marginTop: -S.sm },
  row: { flexDirection: 'row', gap: S.sm },
  small: { fontSize: 12, color: C.muted, fontWeight: '600' },
  goal: { fontSize: 14, color: C.muted, fontWeight: '600' },
  read: { fontSize: 13, fontWeight: '800', marginTop: S.xs, color: C.ink },
  slot: {
    flexDirection: 'row', alignItems: 'center', gap: S.sm, backgroundColor: C.surface,
    borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.sm,
  },
  slotLabel: { width: 72, fontSize: 12, color: C.muted, fontWeight: '700' },
  emoji: { fontSize: 22 },
  name: { fontSize: 14, fontWeight: '700', color: C.ink },
  tags: { fontSize: 12, fontWeight: '700' },
  again: { textAlign: 'center', color: C.muted, fontFamily: serif, fontStyle: 'italic', fontSize: 16 },
});
