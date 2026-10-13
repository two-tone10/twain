// Kept: everything you've done and everything you've reached for, from your first round on.
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Canvas, Picture } from '@shopify/react-native-skia';
import { WHYS, WHY } from '../../keep/content.mjs';
import { CHANGE_ROUNDS, change, codex, holdsUp, monthLabel, monthlyMix, timeline, totals } from '../../keep/kept.mjs';
import { withLabel } from '../../keep/plans.mjs';
import { ALL_NAMES, signFor } from '../../keep/fun.mjs';
import { shareCard } from '../../keep/share';
import { drawBands, drawCaps, drawDot, record, useSkyFonts } from '../../keep/sky';
import { Eyebrow, Reading, StillSky, WhyChip } from '../../keep/ui';
import { loadList, loadNamed, loadRounds } from '../../lib/storage';
import { exportBackup, pickBackup, restoreBackup } from '../../lib/backup';
import { loadPrefs } from '../../lib/prefs';
import { C, F, R, S } from '../../lib/theme';

const KEYS = WHYS.map((w) => w.key);
const COLORS = Object.fromEntries(WHYS.map((w) => [w.key, w.color]));
const RANGES = [['4 weeks', 4], ['Since you started', null]];
const day = (t) => new Date(t).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

export default function Kept() {
  const { width: W } = useWindowDimensions();
  const fonts = useSkyFonts();
  const [data, setData] = useState(null);
  const [weeks, setWeeks] = useState(null);

  const reload = useCallback(() => {
    Promise.all([loadRounds(), loadList(), loadNamed()]).then(([rounds, list, named]) => setData({ rounds, list, named, now: Date.now() }));
  }, []);
  useFocusEffect(reload);

  const backUp = () => exportBackup().catch(() => Alert.alert('Couldn’t make a backup', 'Try again in a moment.'));
  const restore = async () => {
    let b;
    try { b = await pickBackup(); } catch { Alert.alert('That isn’t a Keep backup', 'Pick a file named “Keep backup” that you saved from this screen.'); return; }
    if (!b) return;
    const when = new Date(b.at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
    Alert.alert('Restore this backup?', `From ${when}: ${b.done} moments done, ${b.rounds} rounds. It replaces what’s on this phone now.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Restore', style: 'destructive', onPress: async () => { await restoreBackup(b.backup); await loadPrefs(); reload(); } },
    ]);
  };

  const cw = W - 2 * S.lg;
  const tl = useMemo(() => (data ? timeline(data.list, data.now, weeks) : null), [data, weeks]);
  const mix = useMemo(() => (data ? monthlyMix(data.rounds) : []), [data]);

  const timePic = useMemo(() => {
    if (!fonts || !tl?.points.length) return null;
    const H = 230, left = 92, rowH = (H - 22) / 7;
    return record(cw, H, (c) => {
      KEYS.forEach((k, i) => drawCaps(c, WHY[k].name, 0, rowH * (i + 0.5) + 3, fonts.caps, WHY[k].color, 0.9, 'left', 1.2));
      tl.points.forEach((p, i) => {
        const row = KEYS.indexOf(p.k);
        const jitter = ((i * 37) % 9 - 4) / 4 * rowH * 0.22;
        drawDot(c, left + p.x * (cw - left - 8) + 4, rowH * (row + 0.5) + jitter, WHY[p.k].color, p.glad);
      });
      const fmt = (t) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      drawCaps(c, fmt(tl.from), left + 4, H - 4, fonts.caps, C.faint, 1, 'left', 1);
      drawCaps(c, 'Now', cw - 14, H - 4, fonts.caps, C.faint, 1, 'center', 1);
    });
  }, [fonts, tl, cw]);

  const bandPic = useMemo(() => {
    if (!fonts || mix.length < 2) return null;
    const H = 170;
    return record(cw, H, (c) => {
      drawBands(c, mix.map((m) => m.mix), KEYS, COLORS, { x: 4, y: 4, w: cw - 8, h: H - 26 });
      mix.forEach((m, i) => {
        const x = 4 + (i / (mix.length - 1)) * (cw - 8);
        const label = monthLabel(m.key, data.now).slice(0, 3);
        drawCaps(c, label, i === 0 ? x : i === mix.length - 1 ? x - 22 : x - 10, H - 6, fonts.caps, C.faint, 1, 'left', 1);
      });
    });
  }, [fonts, mix, cw, data]);

  if (!data) return <View style={styles.root} />;
  const t = totals(data);
  const ch = change(data.rounds);
  const h = holdsUp(data);
  const groups = codex(data.list);
  const since = t.since ? new Date(t.since).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : null;
  const names = Object.entries(data.named).sort((a, b) => b[1].n - a[1].n);
  const sign = signFor(data.rounds);
  const shareStats = () => fonts && shareCard('kept', { since, done: t.done, glad: t.glad, people: t.people, sign: sign.name }, fonts, `${t.done} things done, ${t.glad} I was glad about ✦ Keep`).catch(() => {});

  return (
    <View style={styles.root}>
      <StillSky />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.wrap}>
          <Eyebrow>Kept{since ? ` · since ${since}` : ''}</Eyebrow>
          <View style={styles.headRow}>
            <Text style={styles.h2}>{t.done ? 'Look at all you did.' : 'It all lands here.'}</Text>
            {t.done > 0 && (
              <Pressable accessibilityRole="button" accessibilityLabel="Share your totals" hitSlop={10} onPress={shareStats}>
                <Text style={styles.shareT}>↗</Text>
              </Pressable>
            )}
          </View>
          <View style={styles.stats}>
            {[[t.caught, 'stars caught'], [t.done, 'moments done'], [t.glad, 'glad you did'], [t.people, t.people === 1 ? 'person' : 'people']].map(([n, l]) => (
              <View key={l} style={styles.stat}>
                <Text style={styles.statN}>{n}</Text>
                <Text style={styles.statL}>{l.toUpperCase()}</Text>
              </View>
            ))}
          </View>

          {/* 1. the plot of you */}
          <View style={styles.block}>
            <View style={styles.blockHead}>
              <Eyebrow>Everything you did</Eyebrow>
              <View style={styles.seg}>
                {RANGES.map(([l, v]) => (
                  <Pressable key={l} accessibilityRole="radio" accessibilityState={{ selected: weeks === v }} onPress={() => setWeeks(v)} style={[styles.segB, weeks === v && styles.segOn]}>
                    <Text style={[styles.segT, weeks === v && { color: C.dark }]}>{l}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            {timePic ? (
              <>
                <Canvas style={{ width: cw, height: 230 }}>
                  <Picture picture={timePic} />
                </Canvas>
                <Text style={styles.note}>Gold ring: glad you did.</Text>
              </>
            ) : (
              <Text style={styles.empty}>{weeks && t.done ? 'Nothing in the last four weeks.' : 'Tick something off your list and its star lands here.'}</Text>
            )}
          </View>

          {/* 2. how you've changed */}
          <View style={styles.block}>
            <Eyebrow>How you’ve changed</Eyebrow>
            {bandPic && (
              <Canvas style={{ width: cw, height: 170 }}>
                <Picture picture={bandPic} />
              </Canvas>
            )}
            {ch ? <Reading line={ch.line} style={styles.big} /> : null}
            {!bandPic && !ch && <Text style={styles.empty}>Shows up after {CHANGE_ROUNDS * 2} rounds.</Text>}
            {ch && (
              <View style={styles.thenNow}>
                {[['THEN', ch.then], ['NOW', ch.now]].map(([l, ks]) => (
                  <View key={l} style={styles.tnRow}>
                    <Text style={styles.tnL}>{l}</Text>
                    {ks.map((k, i) => <View key={i} style={[styles.tnDot, { backgroundColor: WHY[k].color }]} />)}
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* 3. what holds up */}
          {(h.always.length > 0 || h.catching.length > 0 || h.company.length > 0) && (
            <View style={styles.block}>
              <Eyebrow>What holds up</Eyebrow>
              {h.always.length > 0 && (
                <View style={styles.sub}>
                  <Text style={styles.subL}>{h.everyTime ? 'GLAD EVERY TIME' : 'GLAD YOU DID'}</Text>
                  {h.always.map((e) => <Row key={e.t} k={e.k} t={e.t} right={h.everyTime ? `${e.glad} of ${e.asked}` : ''} />)}
                </View>
              )}
              {h.catching.length > 0 && (
                <View style={styles.sub}>
                  <Text style={styles.subL}>YOU KEEP CATCHING</Text>
                  {h.catching.map((e) => <Row key={e.t} k={e.k} t={e.t} right={`${e.n}×`} />)}
                </View>
              )}
              {h.company.length > 0 && (
                <View style={styles.sub}>
                  <Text style={styles.subL}>YOUR GOOD MOMENTS INCLUDE</Text>
                  <View style={styles.people}>
                    {h.company.map(([n, c]) => (
                      <View key={n} style={styles.person}><Text style={styles.personN}>{n}</Text><Text style={styles.personC}>{c}</Text></View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* skies you've named */}
          <View style={styles.block}>
            <Eyebrow>Skies you’ve drawn · {names.length} of {ALL_NAMES}</Eyebrow>
            {names.length ? (
              <View style={styles.people}>
                {names.map(([n, v]) => (
                  <View key={n} style={styles.person}><Text style={styles.skyN}>{n.replace(/^The /, '')}</Text>{v.n > 1 && <Text style={styles.personC}>{v.n}</Text>}</View>
                ))}
              </View>
            ) : <Text style={styles.empty}>Each round’s shape gets a name. Catch them all.</Text>}
          </View>

          {/* 4. the codex */}
          <View style={styles.block}>
            <Eyebrow>Your codex</Eyebrow>
            {!groups.length && <Text style={styles.empty}>Everything you do, by month.</Text>}
            {groups.map((g) => (
              <View key={g.key} style={{ gap: 2 }}>
                <Text style={styles.month}>{monthLabel(g.key, data.now).toUpperCase()}</Text>
                {g.items.map((it) => (
                  <View key={it.id} style={styles.entry}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.entryT}>{it.t}</Text>
                      <Text style={styles.entryM}>
                        {day(it.doneAt ?? it.at)}{it.with?.length ? ` · with ${withLabel(it.with)}` : ''}
                        {it.glad ? <Text style={styles.glad}>  glad you did</Text> : null}
                      </Text>
                      {it.note ? <Text style={styles.noteT}>“{it.note}”</Text> : null}
                    </View>
                    <WhyChip k={it.k} />
                  </View>
                ))}
              </View>
            ))}
          </View>
          {/* 5. keeping it safe */}
          <View style={styles.block}>
            <Eyebrow>Keep it safe</Eyebrow>
            <Text style={styles.empty}>All of this lives on this phone. Save a copy now and then.</Text>
            <View style={styles.safeRow}>
              <Pressable accessibilityRole="button" onPress={backUp} style={styles.safeB}><Text style={styles.safeT}>Back up</Text></Pressable>
              <Pressable accessibilityRole="button" onPress={restore} style={styles.safeB}><Text style={styles.safeT}>Restore from a backup</Text></Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Row({ k, t, right }) {
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: WHY[k].color }]} />
      <Text style={styles.rowT}>{t}</Text>
      <Text style={styles.rowR}>{right}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.sky0 },
  wrap: { paddingHorizontal: S.lg, paddingVertical: S.md, gap: S.md },
  h2: { fontFamily: F.serifRegular, fontSize: 30, lineHeight: 36, color: C.ink, flex: 1 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  shareT: { fontFamily: F.sansMedium, fontSize: 22, color: C.gold },
  skyN: { fontFamily: F.serifItalic, fontSize: 14, color: C.ink },
  big: { fontSize: 20, lineHeight: 28 },
  stats: { flexDirection: 'row', gap: 6 },
  stat: { flex: 1, gap: 1 },
  statN: { fontFamily: F.serifRegular, fontSize: 30, color: C.ink, fontVariant: ['tabular-nums'] },
  statL: { fontFamily: F.sansMedium, fontSize: 9, letterSpacing: 1, color: C.faint },
  block: { gap: 10, borderTopWidth: 1, borderTopColor: C.line, paddingTop: S.md },
  blockHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  seg: { flexDirection: 'row', gap: 6 },
  segB: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: R.full, borderWidth: 1, borderColor: C.line },
  segOn: { backgroundColor: C.ink, borderColor: C.ink },
  segT: { fontFamily: F.sansMedium, fontSize: 11, color: C.faint },
  note: { fontFamily: F.sans, fontSize: 12, lineHeight: 17, color: C.faint },
  empty: { fontFamily: F.sans, fontSize: 14, lineHeight: 20, color: C.faint },
  thenNow: { gap: 8, marginTop: 4 },
  tnRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tnL: { width: 40, fontFamily: F.sansMedium, fontSize: 9, letterSpacing: 2, color: C.faint },
  tnDot: { width: 10, height: 10, borderRadius: 5 },
  sub: { gap: 4 },
  subL: { fontFamily: F.sansMedium, fontSize: 9, letterSpacing: 2, color: C.faint, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
  rowT: { flex: 1, fontFamily: F.serif, fontSize: 16, color: C.ink },
  rowR: { fontFamily: F.sansMedium, fontSize: 12, color: C.dim, fontVariant: ['tabular-nums'] },
  people: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  person: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingVertical: 4, paddingHorizontal: 11, borderRadius: R.full, borderWidth: 1, borderColor: C.line },
  personN: { fontFamily: F.sansMedium, fontSize: 13, color: C.ink },
  personC: { fontFamily: F.sans, fontSize: 12, color: C.faint },
  month: { fontFamily: F.sansMedium, fontSize: 10, letterSpacing: 2.5, color: C.faint, marginTop: 8, marginBottom: 2 },
  entry: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 9, borderTopWidth: 1, borderTopColor: C.line },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  entryT: { fontFamily: F.serif, fontSize: 17, color: C.ink },
  entryM: { fontFamily: F.sans, fontSize: 12, color: C.faint },
  glad: { fontFamily: F.serifItalic, color: C.gold, fontSize: 13 },
  safeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  safeB: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: R.full, borderWidth: 1, borderColor: C.line },
  safeT: { fontFamily: F.sansMedium, fontSize: 14, color: C.ink },
  noteT: { fontFamily: F.serifItalic, fontSize: 14, color: C.dim, marginTop: 2 },
});
