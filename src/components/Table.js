import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PHRASES, ROLES, SLOTS, TAG_LABEL, TILE } from '../game/content.mjs';
import { OFFER_SIZE, ROUNDS, chooser, goalMet, offerer } from '../game/engine.mjs';
import { C, R, S, roleColor, roleTint } from '../lib/theme';
import { Clues } from './Clues';
import { cap } from './Pick';
import { Button, Eyebrow } from './ui';

function Tags({ id, side }) {
  const tags = TILE[id][side];
  if (!tags.length) return <Text style={[styles.tags, { color: C.muted }]}>—</Text>;
  return <Text style={[styles.tags, { color: side === 'd' ? C.savorer : C.steward }]}>{tags.map((t) => TAG_LABEL[t]).join(' · ')}</Text>;
}

export function Table({ state, seat, dispatch, partnerHere = true, them }) {
  const [picked, setPicked] = useState([]);
  const persp = state.picks[seat];
  const side = ROLES[persp].side === 'delight' ? 'd' : 'g';
  const color = roleColor(persp);
  const slot = SLOTS[state.round - 1];
  const offering = state.step === 'offer' && offerer(state) === seat;
  const taking = state.step === 'choose' && chooser(state) === seat;
  const heard = useMemo(() => [...state.said].reverse().find((m) => m.seat !== seat), [state.said, seat]);

  const toggle = (id) => {
    if (!offering) return;
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id].slice(-OFFER_SIZE)));
  };
  const send = () => {
    dispatch({ type: 'offer', tiles: picked });
    setPicked([]);
  };

  let task;
  if (!partnerHere) task = `Waiting for ${them}…`;
  else if (offering) task = picked.length < OFFER_SIZE ? `Offer two tiles for ${slot.toLowerCase()}` : 'Send your offer';
  else if (taking) task = `Take one for ${slot.toLowerCase()}`;
  else if (state.step === 'offer') task = `${cap(them)} is picking two to offer`;
  else task = `${cap(them)} is taking one`;
  const active = partnerHere && (offering || taking);

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.top}>
        <View style={[styles.chip, { backgroundColor: roleTint(persp) }]}>
          <Text style={[styles.chipText, { color }]}>{ROLES[persp].name}</Text>
        </View>
        <Text style={styles.meta}>Round {state.round} of {ROUNDS}</Text>
      </View>

      <Text style={[styles.task, { color: active ? color : C.muted }]}>{task}</Text>

      {state.offer.length ? (
        <View style={styles.offer}>
          {state.offer.map((id) => (
            <Pressable
              key={id}
              testID={`offer-${id}`}
              accessibilityRole="button"
              disabled={!taking}
              onPress={() => dispatch({ type: 'take', tile: id })}
              style={[styles.offerTile, taking && { borderColor: color }]}
            >
              <Text style={styles.bigEmoji}>{TILE[id].emoji}</Text>
              <Text style={styles.tileName} numberOfLines={2}>{TILE[id].name}</Text>
              <Tags id={id} side={side} />
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.goals}>
        {state.goals[seat].map((g, i) => {
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
        <View style={styles.heard}>
          <Text style={styles.heardWho}>{cap(them)}</Text>
          <Text style={styles.heardText}>“{heard.text}”</Text>
        </View>
      ) : null}

      <Eyebrow>Saturday</Eyebrow>
      <View style={styles.board}>
        {SLOTS.map((label, i) => {
          const id = state.board[i];
          const now = i === state.round - 1 && !id;
          return (
            <View key={label} style={[styles.slot, now && { borderColor: color, borderStyle: 'dashed' }]}>
              <Text style={[styles.slotLabel, now && { color }]}>{label}</Text>
              {id ? (
                <View style={styles.slotTile}>
                  <Text style={styles.emoji}>{TILE[id].emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tileName} numberOfLines={1}>{TILE[id].name}</Text>
                    <Tags id={id} side={side} />
                  </View>
                </View>
              ) : (
                <Text style={styles.empty}>{now ? 'this round' : ' '}</Text>
              )}
            </View>
          );
        })}
      </View>

      <Eyebrow>Tiles</Eyebrow>
      <View style={styles.pool}>
        {state.pool.map((id) => {
          const sel = picked.includes(id);
          const out = state.offer.includes(id);
          return (
            <Pressable
              key={id}
              testID={`tile-${id}`}
              disabled={!offering}
              onPress={() => toggle(id)}
              style={[styles.tile, sel && { borderColor: color, backgroundColor: roleTint(persp) }, out && { opacity: 0.4 }]}
            >
              <Text style={styles.emoji}>{TILE[id].emoji}</Text>
              <Text style={styles.tileName} numberOfLines={2}>{TILE[id].name}</Text>
              <Tags id={id} side={side} />
            </Pressable>
          );
        })}
      </View>

      {offering ? (
        <Button label="Offer these two" color={color} disabled={picked.length !== OFFER_SIZE || !partnerHere} onPress={send} />
      ) : null}

      <Eyebrow>Say</Eyebrow>
      <View style={styles.phrases}>
        {PHRASES.map((p) => (
          <Pressable key={p} onPress={() => dispatch({ type: 'say', text: p })} style={styles.phrase}>
            <Text style={styles.phraseText}>{p}</Text>
          </Pressable>
        ))}
      </View>

      {state.history.length ? (
        <>
          <Eyebrow>Clues so far</Eyebrow>
          <Clues state={state} seat={seat} them={them} />
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: S.md, gap: S.sm, paddingBottom: S.xl * 2, maxWidth: 560, width: '100%', alignSelf: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chip: { borderRadius: R.full, paddingVertical: 6, paddingHorizontal: 12 },
  chipText: { fontWeight: '800', fontSize: 14 },
  meta: { color: C.muted, fontSize: 13, fontWeight: '600' },
  task: { fontSize: 20, fontWeight: '800', marginVertical: S.xs },
  offer: { flexDirection: 'row', gap: S.sm },
  offerTile: {
    flex: 1, borderRadius: R.lg, borderWidth: 2, borderColor: C.border, backgroundColor: C.surface,
    padding: S.md, gap: 4, alignItems: 'flex-start',
  },
  bigEmoji: { fontSize: 36 },
  goals: { gap: 4, marginVertical: S.xs },
  goal: { flexDirection: 'row', gap: S.sm, alignItems: 'center' },
  dot: { fontSize: 14 },
  goalText: { fontSize: 15, color: C.ink, fontWeight: '600' },
  heard: { borderRadius: R.md, padding: S.sm, backgroundColor: C.surface2, flexDirection: 'row', gap: S.sm, alignItems: 'center' },
  heardWho: { fontWeight: '800', fontSize: 13, color: C.ink },
  heardText: { fontSize: 15, color: C.ink, fontStyle: 'italic' },
  board: { gap: 6, marginTop: S.xs, marginBottom: S.sm },
  slot: {
    flexDirection: 'row', alignItems: 'center', minHeight: 52, borderRadius: R.md, borderWidth: 1.5,
    borderColor: C.border, backgroundColor: C.surface, paddingHorizontal: S.sm, gap: S.sm,
  },
  slotLabel: { width: 76, fontSize: 12, color: C.muted, fontWeight: '700' },
  slotTile: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: S.sm },
  empty: { color: C.muted, fontSize: 13 },
  pool: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, marginBottom: S.sm, marginTop: S.xs },
  tile: {
    width: '48.5%', borderRadius: R.md, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.surface, padding: S.sm + 2, gap: 2,
  },
  emoji: { fontSize: 24 },
  tileName: { fontSize: 14, fontWeight: '700', color: C.ink },
  tags: { fontSize: 12, fontWeight: '700' },
  phrases: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, marginBottom: S.sm, marginTop: S.xs },
  phrase: { borderRadius: R.full, borderWidth: 1.5, borderColor: C.ink, paddingVertical: 7, paddingHorizontal: 12 },
  phraseText: { fontSize: 14, fontWeight: '600', color: C.ink },
});
