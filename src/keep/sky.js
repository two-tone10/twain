// Skia drawing for the night sky: falling stars, their labels, and the constellations you keep.
import { useEffect, useLayoutEffect, useRef } from 'react';
import { BlurStyle, PaintStyle, Skia, TileMode, createPicture, useFont } from '@shopify/react-native-skia';
import { skyPoint, spread } from './insight.mjs';
import { C } from '../lib/theme';

export const FILES = {
  serif: require('@expo-google-fonts/bodoni-moda/500Medium/BodoniModa_500Medium.ttf'),
  accent: require('@expo-google-fonts/raleway/600SemiBold/Raleway_600SemiBold.ttf'),
  sans: require('@expo-google-fonts/jost/500Medium/Jost_500Medium.ttf'),
};

export function useSkyFonts() {
  const label = useFont(FILES.serif, 17);
  const small = useFont(FILES.serif, 11);
  const accent = useFont(FILES.accent, 13);
  const caps = useFont(FILES.sans, 9);
  const title = useFont(FILES.serif, 28);
  const huge = useFont(FILES.serif, 40);
  return label && small && accent && caps && title && huge ? { label, small, accent, caps, title, huge } : null;
}

export const EMPTY = createPicture(() => {});

// Calls onFrame(dt, now) every frame while active. The latest callback always runs.
export function useLoop(onFrame, active) {
  const cb = useRef(onFrame);
  useLayoutEffect(() => { cb.current = onFrame; });
  useEffect(() => {
    if (!active) return undefined;
    let raf;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(50, now - last);
      last = now;
      cb.current(dt, now);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);
}

export const record = (w, h, draw) => createPicture(draw, { width: w, height: h });

function make(color, { stroke, blur } = {}) {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setColor(Skia.Color(color));
  if (stroke) { p.setStyle(PaintStyle.Stroke); p.setStrokeWidth(stroke); }
  if (blur) p.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, blur, true));
  return p;
}

let P = null;
function paints() {
  if (!P) {
    P = {
      fill: make('#000'),
      dot: make(C.field),
      star: make(C.star),
      glow: make(C.glow, { blur: 7 }),
      halo: make(C.glow, { blur: 16 }),
      trail: make(C.glow, { stroke: 2 }),
      line: make(C.gold, { stroke: 1 }),
      ink: make(C.ink),
      shade: make(C.shade, { blur: 5 }),
      gold: make(C.gold),
      faint: make(C.field),
      dash: make(C.field, { stroke: 1 }),
    };
    P.dash.setPathEffect(Skia.PathEffect.MakeDash([2, 4], 0));
  }
  return P;
}
const a = (p, alpha) => { p.setAlphaf(Math.max(0, Math.min(1, alpha))); return p; };

export function starfield(w, h, n = 110) {
  return Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1 + 0.25, p: Math.random() * Math.PI * 2 }));
}

export function drawSky(c, w, h, field, T) {
  const p = paints();
  p.fill.setShader(Skia.Shader.MakeLinearGradient({ x: 0, y: 0 }, { x: 0, y: h }, [Skia.Color(C.sky0), Skia.Color(C.sky1)], null, TileMode.Clamp));
  c.drawRect(Skia.XYWHRect(0, 0, w, h), p.fill);
  p.fill.setShader(null);
  for (const s of field) c.drawCircle(s.x, s.y, s.r, a(p.dot, 0.2 + 0.45 * (0.5 + 0.5 * Math.sin(T * 0.002 + s.p))));
}

export const textWidth = (font, s) => font.measureText(s).width;

export function wrap(font, text, maxW) {
  const lines = [];
  let cur = '';
  for (const word of text.split(' ')) {
    const t = cur ? `${cur} ${word}` : word;
    if (textWidth(font, t) > maxW && cur) { lines.push(cur); cur = word; } else cur = t;
  }
  lines.push(cur);
  return { lines, mw: Math.max(...lines.map((l) => textWidth(font, l))) };
}

// Centered lines, top of the first line at y, with a soft shadow so they read over stars.
export function drawLines(c, lines, x, y, font, lh, alpha = 1, color) {
  const p = paints();
  const ink = a(color ? tint(color) : p.ink, alpha);
  lines.forEach((l, i) => {
    const w = textWidth(font, l), by = y + lh * (i + 0.75);
    c.drawText(l, x - w / 2, by + 1, a(p.shade, alpha), font);
    c.drawText(l, x - w / 2, by, a(p.shade, alpha), font);
    c.drawText(l, x - w / 2, by, ink, font);
  });
}

const tinted = {};
const tint = (color) => (tinted[color] ||= make(color));

// Letter-spaced uppercase, drawn a glyph at a time.
export function drawCaps(c, text, x, y, font, color = C.gold, alpha = 1, align = 'left', spacing = 2.2) {
  const chars = text.toUpperCase().split('');
  const widths = chars.map((ch) => (ch === ' ' ? textWidth(font, ' ') + spacing * 2 : textWidth(font, ch)));
  const total = widths.reduce((s, w) => s + w, 0) + spacing * (chars.length - 1);
  let cx = align === 'center' ? x - total / 2 : x;
  const p = a(tint(color), alpha);
  chars.forEach((ch, i) => { c.drawText(ch, cx, y, p, font); cx += widths[i] + spacing; });
}

export function drawBar(c, x, y, w, h, color) {
  c.drawRect({ x, y, width: w, height: h }, a(tint(color), 1));
}

export function drawStar(c, x, y, r = 4, alpha = 1, bright = false) {
  const p = paints();
  if (bright) c.drawCircle(x, y, r * 3.2, a(p.halo, alpha * 0.55));
  c.drawCircle(x, y, r * 2, a(p.glow, alpha * 0.8));
  c.drawCircle(x, y, r, a(p.star, alpha));
}

const trails = {};
export function drawTrail(c, trail, alpha = 1, color) {
  const paint = color ? (trails[color] ||= make(color, { stroke: 2 })) : paints().trail;
  for (let i = 1; i < trail.length; i++) {
    const f = 1 - i / trail.length;
    paint.setStrokeWidth(3 * f + 0.5);
    c.drawLine(trail[i - 1][0], trail[i - 1][1], trail[i][0], trail[i][1], a(paint, f * 0.55 * alpha));
  }
}

// A star in a why's color, with a soft halo of the same color.
const halos = {};
export function drawGlowStar(c, x, y, r, color, alpha = 1) {
  c.drawCircle(x, y, r * 3.4, a((halos[color] ||= make(color, { blur: 14 })), alpha * 0.55));
  c.drawCircle(x, y, r, a(tint(color), alpha));
}

// Absolute star positions for a set of kept moments inside a box.
export function layout(items, box) {
  return spread(items.map(skyPoint)).map((p) => ({ x: box.x + p.x * box.w, y: box.y + p.y * box.h }));
}

export function drawConstellation(c, items, pts, { font, alpha = 1, labels = true, bright = false, box, T = 0, hidden = -1 } = {}) {
  const p = paints();
  const shown = pts.map((pt, i) => (i === hidden ? null : pt));
  let prev = null;
  p.line.setStrokeWidth(bright ? 1.4 : 1);
  for (const pt of shown) {
    if (!pt) continue;
    if (prev) c.drawLine(prev.x, prev.y, pt.x, pt.y, a(p.line, (bright ? 0.75 : 0.45) * alpha));
    prev = pt;
  }
  shown.forEach((pt, i) => { if (pt) drawStar(c, pt.x, pt.y, 3.4 * (1 + Math.sin(T * 0.003 + i) * 0.15), alpha, bright); });
  if (!labels || !font) return;
  // Each label tries below its star, then above, then further below, and takes the first spot that's clear.
  const placed = [];
  const hits = (r) => placed.some((q) => r.x < q.x + q.w && q.x < r.x + r.w && r.y < q.y + q.h && q.y < r.y + r.h)
    || shown.some((o) => o && o.x > r.x - 4 && o.x < r.x + r.w + 4 && o.y > r.y - 4 && o.y < r.y + r.h + 4);
  shown.forEach((pt, i) => {
    if (!pt) return;
    const t = items[i].t, w = textWidth(font, t);
    const x = box ? Math.min(Math.max(pt.x, box.x + w / 2 + 2), box.x + box.w - w / 2 - 2) : pt.x;
    const spots = [pt.y + 7, pt.y - 22, pt.y + 21, pt.y - 36];
    const y = spots.find((sy) => !hits({ x: x - w / 2, y: sy, w, h: 13 })) ?? spots[0];
    placed.push({ x: x - w / 2, y, w, h: 13 });
    drawLines(c, [t], x, y, font, 13, alpha * 0.92);
  });
}

// One person's constellation in their own color, for the family sky. Positions come from skyPoint
// without spreading, so a moment two people kept lands on the same spot.
const strokes = {};
export function drawColored(c, pts, color, alpha = 0.85) {
  const line = (strokes[color] ||= make(color, { stroke: 1.3 }));
  pts.forEach((pt, i) => { if (i) c.drawLine(pts[i - 1].x, pts[i - 1].y, pt.x, pt.y, a(line, alpha * 0.8)); });
  pts.forEach((pt) => { c.drawCircle(pt.x, pt.y, 5.5, a(tint(color), alpha * 0.35)); drawStar(c, pt.x, pt.y, 2.4, alpha); });
}

// A small colored star, with a gold ring when you were glad. Used in Kept's timeline.
const rings = {};
export function drawDot(c, x, y, color, glad = false, alpha = 1) {
  c.drawCircle(x, y, 6, a(tint(color), alpha * 0.3));
  drawStar(c, x, y, 2.2, alpha);
  if (glad) c.drawCircle(x, y, 5.5, a((rings.gold ||= make(C.gold, { stroke: 1 })), alpha * 0.9));
}

// Stacked bands of color, one per why, across a row of columns (each a {why: count} mix).
export function drawBands(c, cols, keys, colors, box) {
  if (cols.length < 2) return;
  const xs = cols.map((_, i) => box.x + (i / (cols.length - 1)) * box.w);
  const tops = cols.map(() => box.y);
  const totals = cols.map((m) => keys.reduce((n, k) => n + m[k], 0) || 1);
  keys.forEach((k) => {
    const y1 = cols.map((m, i) => tops[i] + (m[k] / totals[i]) * box.h);
    const path = Skia.Path.Make();
    xs.forEach((x, i) => (i ? path.lineTo(x, tops[i]) : path.moveTo(x, tops[i])));
    for (let i = xs.length - 1; i >= 0; i--) path.lineTo(xs[i], y1[i]);
    path.close();
    c.drawPath(path, a(tint(colors[k]), 0.62));
    y1.forEach((y, i) => (tops[i] = y));
  });
}

export function drawGhosts(c, skies, box) {
  const p = paints();
  skies.slice(-3).reverse().forEach((items, n) => {
    const pts = layout(items, box), al = [0.14, 0.09, 0.05][n];
    pts.forEach((pt, i) => { if (i) c.drawLine(pts[i - 1].x, pts[i - 1].y, pt.x, pt.y, a(p.line, al)); });
    pts.forEach((pt) => c.drawCircle(pt.x, pt.y, 1.8, a(p.faint, al * 2)));
  });
}

export function drawSlotHints(c, n, box) {
  // Faint dashed rings: how many stars your sky still has room for.
  const p = paints();
  for (let i = 0; i < n; i++) c.drawCircle(box.x + box.w * (0.2 + i * 0.15), box.y + box.h * 0.92, 4, a(p.dash, 0.35));
}

export const lerp = (x, y, t) => x + (y - x) * t;
export const ease = (t) => 1 - Math.pow(1 - t, 3);
