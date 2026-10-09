import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { OTHER, PHRASES, ROLES, SLOTS, TAG_LABEL, TILE } from '../game/content.mjs';
import { canFinish, goalMet } from '../game/engine.mjs';
import { C, R, S, roleColor, roleTint } from '../lib/theme';
import { Button, Eyebrow } from './ui';

const sideKey = (role) => (role === 'savorer' ? 'd' : 'g');

function Tags({ id, role }) {
  const tags = TILE[id][sideKey(role)];
  if (!tags.length) return <Text style={[styles.tags, { color: C.muted }]}>—</Text>;
  return <Text style={[styles.tags, { color: roleColor(role) }]}>{tags.map((t) => TAG_LABEL[t]).join(' · ')}</Text>;
}

function Marks({ marks, role }) {
  const other = OTHER[role];
  if (!marks?.[other]) return null;
  return <Text style={[styles.partnerMark, { color: roleColor(other) }]}>{ROLES[other].mark}</Text>;
}

export function Table({ state, role, dispatch, partnerHere = true, local }) {
  const [picked, setPicked] = useState(null);
  const other = OTHER[role];
  const myTurn = state.turn === role;
  const color = roleColor(role);
  const heard = useMemo(() => [...state.said].reverse().find((m) => m.role === other), [state.said, other]);
  const ready = state.ready[role];
  const finishable = canFinish(state);

  const place = (slot) => {
    if (!picked || !myTurn) return;
    dispatch({ type: 'place', tile: picked, slot });
    setPicked(null);
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.top}>
        <View style={[styles.chip, { backgroundColor: roleTint(role) }]}>
          <Text style={[styles.chipText, { color }]}>{ROLES[role].name}</Text>
        </View>
        <Text style={styles.meta}>
          Round {state.round} · {state.movesLeft} moves
        </Text>
      </View>

      <Text style={[styles.turn, { color: myTurn ? color : C.muted }]}>
        {!partnerHere && !local
          ? 'Waiting for your partner…'
          : myTurn
            ? picked
              ? 'Tap a time to place it'
              : 'Your move: pick a tile'
            : `${ROLES[other].name} is moving`}
      </Text>

      <View style={styles.goals}>
        {state.goals[role].map((g, i) => {
          const met = goalMet(g, state.board);
          return (
            <View key={i} style={styles.goal}>
              <Text style={[styles.dot, { color: met ? color : C.border }]}>{met ? '●' : '○'}</Text>
              <Text style={[styles.goalText, met && { color }]}>{g.text}</Text>
            </View>
          );
        })}
      </View>

      {heard ? (
        <View style={[styles.heard, { backgroundColor: roleTint(other) }]}>
          <Text style={[styles.heardWho, { color: roleColor(other) }]}>{ROLES[other].name}</Text>
          <Text style={styles.heardText}>“{heard.text}”</Text>
        </View>
      ) : null}

      <Eyebrow>Saturday</Eyebrow>
      <View style={styles.board}>
        {SLOTS.map((label, i) => {
          const id = state.board[i];
          const target = picked && myTurn;
          return (
            <Pressable
              key={label}
              onPress={() => place(i)}
              style={[styles.slot, target && { borderColor: color, borderStyle: 'dashed' }]}
            >
              <Text style={styles.slotLabel}>{label}</Text>
              {id ? (
                <View style={styles.slotTile}>
                  <Text style={styles.emoji}>{TILE[id].emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tileName} numberOfLines={1}>{TILE[id].name}</Text>
                    <Tags id={id} role={role} />
                  </View>
                  <Marks marks={state.marks[id]} role={role} />
                </View>
              ) : (
                <Text style={styles.empty}>{target ? 'place here' : ' '}</Text>
              )}
            </Pressable>
          );
        })}
      </View>

      <Eyebrow>Tiles</Eyebrow>
      <View style={styles.pool}>
        {state.pool.map((id) => {
          const sel = picked === id;
          const mine = state.marks[id]?.[role];
          return (
            <Pressable
              key={id}
              onPress={() => setPicked(sel ? null : id)}
              style={[styles.tile, sel && { borderColor: color, backgroundColor: roleTint(role) }]}
            >
              <View style={styles.tileHead}>
                <Text style={styles.emoji}>{TILE[id].emoji}</Text>
                <Marks marks={state.marks[id]} role={role} />
                <Pressable
                  hitSlop={10}
                  accessibilityLabel={`Signal ${TILE[id].name}`}
                  onPress={() => dispatch({ type: 'mark', tile: id })}
                  style={[styles.markBtn, mine && { backgroundColor: color, borderColor: color }]}
                >
                  <Text style={[styles.markText, { color: mine ? C.surface : color }]}>{ROLES[role].mark}</Text>
                </Pressable>
              </View>
              <Text style={styles.tileName} numberOfLines={2}>{TILE[id].name}</Text>
              <Tags id={id} role={role} />
            </Pressable>
          );
        })}
      </View>

      <Eyebrow>Say</Eyebrow>
      <View style={styles.phrases}>
        {PHRASES[role].map((p) => (
          <Pressable key={p} onPress={() => dispatch({ type: 'say', text: p })} style={[styles.phrase, { borderColor: color }]}>
            <Text style={[styles.phraseText, { color }]}>{p}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.footer}>
        <Button label="Pass" outline color={C.muted} disabled={!myTurn} onPress={() => dispatch({ type: 'pass' })} style={{ flex: 1 }} />
        <Button
          label={local ? 'We’re set' : ready ? 'Waiting…' : 'We’re set'}
          color={color}
          disabled={!finishable}
          onPress={() => dispatch({ type: 'ready', both: local })}
          style={{ flex: 2 }}
        />
      </View>
      {!local && state.ready[other] && !ready ? (
        <Text style={styles.hint}>{ROLES[other].name} is set.</Text>
      ) : null}
      {!finishable ? <Text style={styles.hint}>Fill every time to finish.</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: S.md, paddingBottom: S.xl * 2, gap: S.sm, maxWidth: 560, width: '100%', alignSelf: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chip: { borderRadius: R.full, paddingVertical: 6, paddingHorizontal: S.md },
  chipText: { fontWeight: '800', fontSize: 14 },
  meta: { color: C.muted, fontSize: 13, fontWeight: '600' },
  turn: { fontSize: 20, fontWeight: '800', marginTop: S.sm },
  goals: { gap: 6, marginVertical: S.sm },
  goal: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  dot: { fontSize: 16, width: 18 },
  goalText: { fontSize: 16, color: C.ink, fontWeight: '600' },
  heard: { borderRadius: R.lg, padding: S.md, marginBottom: S.sm },
  heardWho: { fontSize: 12, fontWeight: '800' },
  heardText: { fontSize: 16, color: C.ink, marginTop: 2 },
  board: { gap: 6, marginBottom: S.md, marginTop: S.xs },
  slot: {
    flexDirection: 'row', alignItems: 'center', minHeight: 54, borderRadius: R.md,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface, paddingHorizontal: S.md,
  },
  slotLabel: { width: 96, fontSize: 13, color: C.muted, fontWeight: '700' },
  slotTile: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: S.sm },
  empty: { color: C.muted, fontSize: 13 },
  pool: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, marginBottom: S.md, marginTop: S.xs },
  tile: {
    width: '48.5%', borderRadius: R.md, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.surface, padding: S.sm + 2, gap: 2,
  },
  tileHead: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  emoji: { fontSize: 24 },
  tileName: { fontSize: 14, fontWeight: '700', color: C.ink },
  tags: { fontSize: 12, fontWeight: '700' },
  partnerMark: { fontSize: 18, fontWeight: '800' },
  markBtn: {
    marginLeft: 'auto', width: 30, height: 30, borderRadius: R.full, borderWidth: 1.5,
    borderColor: C.border, alignItems: 'center', justifyContent: 'center',
  },
  markText: { fontSize: 15, fontWeight: '800' },
  phrases: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, marginBottom: S.md, marginTop: S.xs },
  phrase: { borderRadius: R.full, borderWidth: 1.5, paddingVertical: 7, paddingHorizontal: 12 },
  phraseText: { fontSize: 14, fontWeight: '600' },
  footer: { flexDirection: 'row', gap: S.sm, marginTop: S.sm },
  hint: { textAlign: 'center', color: C.muted, fontSize: 13, marginTop: S.xs },
});
