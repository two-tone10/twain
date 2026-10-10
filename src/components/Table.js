import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PERSPECTIVES, PHRASES, ROLES, SLOTS, TAG_LABEL, TILE } from '../game/content.mjs';
import { PICK_COUNT, ROUNDS, ROUND_NAME, due, goalMet, kindOf } from '../game/engine.mjs';
import { C, R, S, roleColor, roleTint } from '../lib/theme';
import { Clues } from './Clues';
import { cap } from './Pick';
import { Button, Eyebrow } from './ui';

const HOW = {
  offer: 'One offers two. The other takes one.',
  veto: 'One shows three. The other strikes one. The first places one.',
  turn: 'Keep your side or switch. Nobody is told.',
  blind: 'Pick at the same time. Match and it lands; miss and it’s a coin flip.',
  last: 'One cuts a tile for good. The other fills the night.',
};
const SEND = { offer: 'Offer these two', show: 'Show these three', blind: 'Lock it in', cut: 'Cut it', fill: 'Place it' };

function Tags({ id, side }) {
  const tags = TILE[id][side];
  if (!tags.length) return <Text style={[styles.tags, { color: C.muted }]}>—</Text>;
  return <Text style={[styles.tags, { color: side === 'd' ? C.savorer : C.steward }]}>{tags.map((t) => TAG_LABEL[t]).join(' · ')}</Text>;
}

function task(state, step, mine, slot, them) {
  const T = cap(them);
  if (!mine && (step === 'turn' || step === 'blind')) return `Waiting for ${them}…`;
  switch (step) {
    case 'offer': return mine ? `Offer two for ${slot}` : `${T} is picking two to offer`;
    case 'take': return mine ? `Take one for ${slot}` : `${T} is taking one`;
    case 'show': return mine ? `Show three for ${slot}` : `${T} is picking three to show`;
    case 'strike': return mine ? 'Strike one' : `${T} is striking one`;
    case 'place': return mine ? `Place one for ${slot}` : `${T} is placing one`;
    case 'turn': return 'The Turn';
    case 'blind': return `Pick one for ${slot}, blind`;
    case 'cut': return mine ? 'Cut one tile for good' : `${T} is cutting a tile`;
    case 'fill': return mine ? `Fill ${slot}` : `${T} is filling ${slot}`;
    default: return '';
  }
}

export function Table({ state, seat, dispatch, partnerHere = true, them }) {
  const [sel, setSel] = useState({ k: '', ids: [] });
  const persp = state.now[seat];
  const side = ROLES[persp].side === 'delight' ? 'd' : 'g';
  const color = roleColor(persp);
  const kind = kindOf(state);
  const { step } = state;
  const slot = SLOTS[state.round - 1].toLowerCase();
  const mine = partnerHere && due(state).includes(seat);
  const need = mine ? PICK_COUNT[step] || 0 : 0;
  const heard = useMemo(() => [...state.said].reverse().find((m) => m.seat !== seat), [state.said, seat]);
  const flipTo = PERSPECTIVES.find((p) => p !== persp);

  const stepKey = `${state.round}-${step}`;
  const picked = sel.k === stepKey ? sel.ids : [];
  const setPicked = (f) => setSel({ k: stepKey, ids: typeof f === 'function' ? f(picked) : f });

  const toggle = (id) => {
    if (!need) return;
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id].slice(-need)));
  };
  const send = () => {
    dispatch(need > 1 ? { type: step, tiles: picked } : { type: step, tile: picked[0] });
    setPicked([]);
  };
  const tapOffer = (id) => {
    if (!mine) return;
    if (step === 'take' || step === 'strike') dispatch({ type: step, tile: id });
    if (step === 'place' && id !== state.struck) dispatch({ type: 'place', tile: id });
  };

  const text = partnerHere ? task(state, step, mine, slot, them) : `Waiting for ${them}…`;

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.top}>
        <View style={[styles.chip, { backgroundColor: roleTint(persp) }]}>
          <Text style={[styles.chipText, { color }]}>{ROLES[persp].name}</Text>
        </View>
        <Text style={styles.meta}>Round {state.round} of {ROUNDS} · {ROUND_NAME[kind]}</Text>
      </View>

      <Text style={[styles.task, { color: mine ? color : C.muted }]}>{text}</Text>
      <Text style={styles.how}>{HOW[kind]}</Text>

      {step === 'turn' && mine ? (
        <View style={{ gap: S.sm }}>
          <Button label={`Keep ${ROLES[persp].name}`} color={color} onPress={() => dispatch({ type: 'turn', switch: false })} />
          <Button label={`Switch to ${ROLES[flipTo].name}`} color={roleColor(flipTo)} outline onPress={() => dispatch({ type: 'turn', switch: true })} />
          <Text style={styles.how}>Switch and you get two new goals and a new Mask.</Text>
        </View>
      ) : null}

      {step === 'blind' && state.blind[seat] ? (
        <Text style={styles.how}>You locked in {TILE[state.blind[seat]].emoji} {TILE[state.blind[seat]].name}.</Text>
      ) : null}

      {state.offer.length ? (
        <View style={styles.offer}>
          {state.offer.map((id) => {
            const struck = id === state.struck;
            const live = mine && !struck && ['take', 'strike', 'place'].includes(step);
            return (
              <Pressable
                key={id}
                testID={`offer-${id}`}
                accessibilityRole="button"
                disabled={!live}
                onPress={() => tapOffer(id)}
                style={[styles.offerTile, live && { borderColor: color }, struck && { opacity: 0.35 }]}
              >
                <Text style={styles.bigEmoji}>{TILE[id].emoji}</Text>
                <Text style={[styles.tileName, struck && styles.strike]} numberOfLines={2}>{TILE[id].name}</Text>
                <Tags id={id} side={side} />
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={styles.goals}>
        {state.goals[seat].map((g, i) => {
          const met = goalMet(g, state.board);
          return (
            <View key={i} style={styles.goal}>
              <Text style={[styles.dot, { color: met ? color : C.border }]}>{met ? '●' : '○'}</Text>
              <Text style={[styles.goalText, met && { color }]}>{g.text}</Text>
              {g.mask ? <Text style={styles.mask}>Mask</Text> : null}
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
              disabled={!need}
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

      {need ? <Button label={SEND[step]} color={color} disabled={picked.length !== need} onPress={send} /> : null}

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
  task: { fontSize: 20, fontWeight: '800', marginTop: S.xs },
  how: { fontSize: 13, color: C.muted, marginBottom: S.xs },
  offer: { flexDirection: 'row', gap: S.sm },
  offerTile: {
    flex: 1, borderRadius: R.lg, borderWidth: 2, borderColor: C.border, backgroundColor: C.surface,
    padding: S.md, gap: 4, alignItems: 'flex-start',
  },
  strike: { textDecorationLine: 'line-through' },
  bigEmoji: { fontSize: 36 },
  goals: { gap: 4, marginVertical: S.xs },
  goal: { flexDirection: 'row', gap: S.sm, alignItems: 'center' },
  dot: { fontSize: 14 },
  goalText: { fontSize: 15, color: C.ink, fontWeight: '600', flexShrink: 1 },
  mask: { fontSize: 11, fontWeight: '800', color: C.muted, borderWidth: 1, borderColor: C.border, borderRadius: R.full, paddingHorizontal: 6, paddingVertical: 1 },
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
