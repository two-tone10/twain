// Share cards: one look for every screen. Each card is drawn off screen at 360×450, scaled up 3×,
// saved as a PNG and handed to the share sheet with a line of text (and a link, for the daily).
import { Share } from 'react-native';
import { PaintStyle, Skia, TileMode } from '@shopify/react-native-skia';
import { File, Paths } from 'expo-file-system';
import { WHY } from './content.mjs';
import { skyPoint } from './insight.mjs';
import { drawCaps, drawColored, drawConstellation, drawStar, layout, record, starfield, textWidth, wrap } from './sky';
import { C } from '../lib/theme';

const PW = 360, PH = 450, SCALE = 3;

function paint(color, alpha = 1) {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setColor(Skia.Color(color));
  p.setAlphaf(alpha);
  return p;
}

function frame(c, fonts, eyebrow) {
  const bg = Skia.Paint();
  bg.setShader(Skia.Shader.MakeLinearGradient({ x: 0, y: 0 }, { x: 0, y: PH }, [Skia.Color(C.sky1), Skia.Color(C.sky0)], null, TileMode.Clamp));
  c.drawRect(Skia.XYWHRect(0, 0, PW, PH), bg);
  const dot = paint('#e8ecff');
  for (const s of starfield(PW, PH, 140)) { dot.setAlphaf(0.12 + s.r * 0.22); c.drawCircle(s.x, s.y, s.r * 0.8, dot); }
  drawCaps(c, eyebrow, 22, 34, fonts.caps, C.gold, 1, 'left', 2.2);
  const ink = paint(C.ink);
  c.drawText('Keep', 22, PH - 22, ink, fonts.label);
  c.drawText('.', 22 + textWidth(fonts.label, 'Keep'), PH - 22, paint(C.gold), fonts.label);
}

const text = (c, s, x, y, font, color = C.ink) => c.drawText(s, x, y, paint(color), font);
function para(c, s, x, y, font, maxW, lh, color) {
  const { lines } = wrap(font, s, maxW);
  lines.slice(0, 3).forEach((l, i) => text(c, l, x, y + i * lh, font, color));
  return y + lines.length * lh;
}
const dots = (c, ks, x, y, r = 7, gap = 22) => ks.forEach((k, i) => c.drawCircle(x + i * gap, y, r, paint(WHY[k].color)));
const today = (t = Date.now()) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

const CARDS = {
  // After a round: its name and its constellation.
  round: (c, f, { kept, name, speed }) => {
    frame(c, f, `${today()} · my sky`);
    para(c, name, 22, 78, f.title, PW - 44, 32);
    const box = { x: 30, y: 130, w: PW - 60, h: 200 };
    drawConstellation(c, kept, layout(kept, box), { font: f.small, box, bright: true });
    if (speed) text(c, speed, PW - 22 - textWidth(f.label, speed), PH - 22, f.label, C.dim);
  },
  // The daily, Wordle-style: day number, five colored dots, the name, the speed.
  daily: (c, f, { day, kept, name, speed }) => {
    frame(c, f, `Daily #${day}`);
    dots(c, kept.map((m) => m.k), 30, 92, 9, 28);
    para(c, name, 22, 160, f.title, PW - 44, 32);
    const box = { x: 30, y: 210, w: PW - 60, h: 150 };
    drawConstellation(c, kept, layout(kept, box), { box, bright: true });
    if (speed) text(c, speed, PW - 22 - textWidth(f.label, speed), PH - 22, f.label, C.dim);
  },
  // Your sign from Sky.
  sign: (c, f, { k, name, line }) => {
    frame(c, f, 'My sign');
    const col = WHY[k].color;
    const pts = [[70, 330], [140, 280], [205, 255], [290, 190]];
    const lp = paint(col, 0.7);
    lp.setStyle(PaintStyle.Stroke); lp.setStrokeWidth(1.4);
    pts.forEach((p, i) => i && c.drawLine(pts[i - 1][0], pts[i - 1][1], p[0], p[1], lp));
    pts.forEach(([x, y]) => drawStar(c, x, y, 4, 1, true));
    para(c, name, 22, 100, f.huge, PW - 44, 44);
    text(c, line, 22, 140, f.italic, C.dim);
  },
  // Kept: the running totals.
  kept: (c, f, { since, done, glad, people, sign }) => {
    frame(c, f, since ? `Since ${since}` : 'Kept');
    [[done, 'done'], [glad, 'glad I did'], [people, 'people']].forEach(([n, l], i) => {
      const x = 22 + i * 110;
      text(c, String(n), x, 130, f.huge);
      drawCaps(c, l, x + 2, 152, f.caps, C.faint, 1, 'left', 1.6);
    });
    if (sign) text(c, `${sign}, lately`, 22, 220, f.italic, C.gold);
  },
  // The week: how many skies, what you did, and the names you drew.
  week: (c, f, { rounds, done, glad, names, sign }) => {
    frame(c, f, 'My week');
    [[rounds, rounds === 1 ? 'sky' : 'skies'], [done, 'done'], [glad, 'glad']].forEach(([n, l], i) => {
      const x = 22 + i * 110;
      text(c, String(n), x, 120, f.huge);
      drawCaps(c, l, x + 2, 142, f.caps, C.faint, 1, 'left', 1.6);
    });
    names.slice(0, 4).forEach((n, i) => text(c, n, 22, 200 + i * 34, f.title, i ? C.dim : C.ink));
    if (sign) text(c, `${sign}, lately`, 22, PH - 60, f.italic, C.gold);
  },
  // Pass it around: everyone's constellation in one sky.
  family: (c, f, { players, line }) => {
    frame(c, f, 'Our sky');
    para(c, line, 22, 74, f.label, PW - 44, 23);
    const box = { x: 30, y: 150, w: PW - 60, h: 220 };
    const at = (m) => { const p = skyPoint(m); return { x: box.x + p.x * box.w, y: box.y + p.y * box.h }; };
    players.forEach((p) => drawColored(c, p.kept.map(at), p.color));
  },
};

export const cardPicture = (type, data, fonts) => record(PW, PH, (c) => CARDS[type](c, fonts, data));

// Renders the card and opens the share sheet with it and `message`.
export async function shareCard(type, data, fonts, message) {
  const surface = Skia.Surface.Make(PW * SCALE, PH * SCALE);
  if (!surface) throw new Error('no surface');
  const canvas = surface.getCanvas();
  canvas.scale(SCALE, SCALE);
  canvas.drawPicture(cardPicture(type, data, fonts));
  surface.flush();
  const file = new File(Paths.cache, `keep-${type}-${Date.now()}.png`);
  file.create({ overwrite: true });
  file.write(surface.makeImageSnapshot().encodeToBase64(), { encoding: 'base64' });
  await Share.share({ url: file.uri, message });
}
