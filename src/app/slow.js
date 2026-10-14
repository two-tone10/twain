import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Canvas, Picture } from '@shopify/react-native-skia';
import { useSharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { BASKET } from '../keep/content.mjs';
import { deal } from '../keep/insight.mjs';
import { SLOW, fmtLeft, keepSlow, slowOutcome, slowSchedule, slowSnapshot } from '../keep/modes.mjs';
import { allowReminders, scheduleReminders } from '../keep/notify';
import { Outcome } from '../keep/outcome';
import { EMPTY, drawCaps, drawConstellation, drawLines, drawSky, drawStar, layout, record, starfield, useLoop, useSkyFonts, wrap } from '../keep/sky';
import { Button, Eyebrow, goHome, StillSky } from '../keep/ui';
import { loadSlow, saveSlow } from '../lib/storage';
import { recordRound } from '../keep/records';
import { C, F, S } from '../lib/theme';
import { deckNow } from '../lib/prefs';

const clock = (t) => new Date(t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

export default function Slow() {
  // `?quick=1` squeezes the day into a few minutes, for trying it out.
  const { quick } = useLocalSearchParams();
  const [state, setState] = useState(undefined);
  const [now, setNow] = useState(0);
  useEffect(() => { loadSlow().then((s) => { setNow(Date.now()); setState(s); }); }, []);

  const begin = async (wantsReminders) => {
    const opts = quick ? { spanMs: 4 * 60e3, fallMs: 70e3 } : {};
    const notify = wantsReminders ? await allowReminders() : false;
    const s = { ...slowSchedule(Date.now(), deal(SLOW.perWhy, Math.random, deckNow()), opts), seenMissed: 0, recorded: false, notify };
    saveSlow(s);
    scheduleReminders(s);
    setNow(Date.now());
    setState(s);
  };
  const update = (s) => { saveSlow(s); scheduleReminders(s); setNow(Date.now()); setState(s); };

  if (state === undefined) return <View style={styles.root} />;
  if (!state) return <Intro onStart={begin} />;
  const snap = slowSnapshot(state, now, BASKET);
  if (snap.done) return <Finished s={state} onRecorded={update} onNew={() => { saveSlow(null); scheduleReminders(null); setState(null); }} />;
  return <Day s={state} onChange={update} />;
}

function Intro({ onStart }) {
  const [remind, setRemind] = useState(false);
  return (
    <View style={styles.root}>
      <StillSky />
      <SafeAreaView style={styles.intro}>
        <Eyebrow>A slow drop</Eyebrow>
        <Text style={styles.h2}>
          One drop,{'\n'}
          <Text style={{ color: C.gold, fontFamily: F.serifItalic }}>all day long.</Text>
        </Text>
        <Text style={styles.sub}>Fourteen moments fall across the next twelve hours. Each one takes about three hours to cross your screen. Look in now and then, or some will fall past while you’re away.</Text>
        <Text style={styles.sub}>Your sky still holds five.</Text>
        <View style={styles.remind}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.remindTitle}>Remind me before one falls past</Text>
            <Text style={styles.remindSub}>A few quiet notifications through the day. Never more than one every two hours.</Text>
          </View>
          <Switch value={remind} onValueChange={setRemind} trackColor={{ true: C.gold }} accessibilityLabel="Remind me before a star falls past" />
        </View>
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button ghost label="Back" onPress={() => goHome()} style={{ flex: 1 }} />
          <Button label="Start the day" onPress={() => onStart(remind)} style={{ flex: 2 }} />
        </View>
      </SafeAreaView>
    </View>
  );
}

function Day({ s, onChange }) {
  const { width: W, height: H } = useWindowDimensions();
  const ins = useSafeAreaInsets();
  const fonts = useSkyFonts();
  const pic = useSharedValue(EMPTY);
  const field = useMemo(() => starfield(W, H), [W, H]);
  const geo = useMemo(() => {
    const sky = { x: 22, y: H - ins.bottom - 214, w: W - 44, h: 190 };
    return { top: ins.top + 76, fadeY: sky.y - 8, sky };
  }, [W, H, ins.top, ins.bottom]);
  const live = useRef(s);
  useEffect(() => { live.current = s; }, [s]);

  // What fell past while you were away, said once.
  const [away] = useState(() => slowSnapshot(s, Date.now(), BASKET).missed.length - (s.seenMissed || 0));
  useEffect(() => {
    const missed = slowSnapshot(s, Date.now(), BASKET).missed.length;
    if (missed !== (s.seenMissed || 0)) onChange({ ...s, seenMissed: missed });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pos = (m) => {
    const { lines, mw } = wrap(fonts.label, m.t, Math.min(170, W * 0.48));
    const pad = mw / 2 + 12;
    return { lines, mw, x: Math.min(Math.max(m.x * W, pad), W - pad), y: geo.top + m.f * (geo.fadeY - geo.top) };
  };

  const onTouch = (e) => {
    if (!fonts) return;
    const { locationX: x, locationY: y } = e.nativeEvent;
    const now = Date.now(), cur = live.current;
    const snap = slowSnapshot(cur, now, BASKET);
    if (snap.full) return;
    for (const m of snap.live) {
      const p = pos(m);
      if (Math.hypot(x - p.x, y - p.y) < 30 || (Math.abs(x - p.x) < p.mw / 2 + 10 && y > p.y && y < p.y + 40 + p.lines.length * 21)) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onChange(keepSlow(cur, m.t, now));
        return;
      }
    }
  };

  const draw = (c, T) => {
    const now = Date.now(), cur = live.current, f = fonts;
    const snap = slowSnapshot(cur, now, BASKET);
    drawSky(c, W, H, field, T);
    drawCaps(c, `Slow drop · ${cur.kept.length} of ${BASKET} kept`, 22, ins.top + 20, f.caps, C.gold, 0.95);
    const status = snap.next ? `Next star in ${fmtLeft(snap.next.spawnAt - now)}` : 'The last stars are falling';
    drawLines(c, [`${status}  ·  ends ${clock(cur.end)}`], W / 2, ins.top + 30, f.small, 14, 0.6);
    if (away > 0 && T < 6000) drawLines(c, [`${away} fell past while you were away`], W / 2, ins.top + 48, f.italic, 16, Math.min(1, (6000 - T) / 1500), C.gold);

    const pts = layout(cur.kept, geo.sky);
    if (cur.kept.length) drawConstellation(c, cur.kept, pts, { font: f.small, box: geo.sky, T });
    else drawLines(c, ['your sky'], W / 2, geo.sky.y + geo.sky.h / 2 - 10, f.italic, 16, 0.35);

    for (const m of snap.live) {
      const p = pos(m);
      const fade = Math.max(0, Math.min(1, (geo.fadeY - p.y) / 70));
      drawStar(c, p.x, p.y, 4.5, fade);
      drawLines(c, p.lines, p.x, p.y + 10, f.label, 21, fade);
      drawLines(c, [`falls past in ${fmtLeft(m.endAt - now)}`], p.x, p.y + 14 + p.lines.length * 21, f.small, 13, fade * 0.55, C.gold);
    }
  };

  const clockT = useRef(0);
  const ended = useRef(false);
  useLoop((dt) => {
    clockT.current += dt;
    pic.value = record(W, H, (c) => draw(c, clockT.current));
    // Once the day's stars are kept or gone, hand back so the results show.
    if (!ended.current && slowSnapshot(live.current, Date.now(), BASKET).done) { ended.current = true; onChange({ ...live.current }); }
  }, !!fonts);

  return (
    <View style={styles.root} onTouchStart={onTouch}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Picture picture={pic} />
      </Canvas>
      <Pressable accessibilityRole="button" accessibilityLabel="Back home" onPress={() => goHome()} hitSlop={12} style={[styles.quit, { top: ins.top + 6 }]}>
        <Text style={styles.quitText}>✕</Text>
      </Pressable>
    </View>
  );
}

function Finished({ s, onRecorded, onNew }) {
  const [g] = useState(() => slowOutcome(s, Date.now()));
  useEffect(() => {
    if (s.recorded) return;
    recordRound({ kept: s.kept }, 'slow');
    onRecorded({ ...s, recorded: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <Outcome g={g} onAgain={onNew} againLabel="New slow drop" />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.sky0 },
  intro: { flex: 1, paddingHorizontal: S.lg, paddingVertical: S.md, gap: S.md },
  h2: { fontFamily: F.serifRegular, fontSize: 30, lineHeight: 36, color: C.ink },
  sub: { fontFamily: F.sans, fontSize: 16, lineHeight: 23, color: C.dim },
  remind: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md, borderRadius: 16, borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
  remindTitle: { fontFamily: F.sansMedium, fontSize: 15, color: C.ink },
  remindSub: { fontFamily: F.sans, fontSize: 12, lineHeight: 17, color: C.faint },
  quit: { position: 'absolute', right: 18, width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  quitText: { color: C.faint, fontSize: 16 },
});
