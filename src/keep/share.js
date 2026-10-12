// Share your sky: a poster of one constellation, rendered off screen and handed to the share sheet.
import { Skia, TileMode } from '@shopify/react-native-skia';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { drawCaps, drawConstellation, layout, record, starfield, textWidth, wrap } from './sky';
import { C } from '../lib/theme';

const PW = 360, PH = 450, SCALE = 3;

// `fonts` comes from useSkyFonts(). The poster is drawn at 360×450 and scaled up 3× for sharpness.
export function posterPicture(kept, line, fonts, when = Date.now()) {
  const field = starfield(PW, PH, 140);
  return record(PW, PH, (c) => {
    const bg = Skia.Paint();
    bg.setShader(Skia.Shader.MakeLinearGradient({ x: 0, y: 0 }, { x: 0, y: PH }, [Skia.Color(C.sky1), Skia.Color(C.sky0)], null, TileMode.Clamp));
    c.drawRect(Skia.XYWHRect(0, 0, PW, PH), bg);
    const dot = Skia.Paint();
    dot.setColor(Skia.Color('#e8ecff'));
    for (const s of field) { dot.setAlphaf(0.15 + s.r * 0.25); c.drawCircle(s.x, s.y, s.r * 0.8, dot); }

    const date = new Date(when).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    drawCaps(c, `My sky · ${date}`, 22, 34, fonts.caps, C.gold, 1, 'left', 2.2);
    const box = { x: 26, y: 62, w: PW - 52, h: 230 };
    drawConstellation(c, kept, layout(kept, box), { font: fonts.small, box, bright: true });

    const ink = Skia.Paint();
    ink.setColor(Skia.Color(C.ink));
    const { lines } = wrap(fonts.label, line, PW - 44);
    lines.slice(0, 3).forEach((l, i) => c.drawText(l, 22, 330 + i * 23, ink, fonts.label));

    c.drawText('Keep', 22, PH - 24, ink, fonts.label);
    const gold = Skia.Paint();
    gold.setColor(Skia.Color(C.gold));
    c.drawText('.', 22 + textWidth(fonts.label, 'Keep'), PH - 24, gold, fonts.label);
  });
}

export async function shareSky(kept, line, fonts) {
  const surface = Skia.Surface.Make(PW * SCALE, PH * SCALE);
  if (!surface) throw new Error('no surface');
  const canvas = surface.getCanvas();
  canvas.scale(SCALE, SCALE);
  canvas.drawPicture(posterPicture(kept, line, fonts));
  surface.flush();
  const png = surface.makeImageSnapshot().encodeToBase64();
  const file = new File(Paths.cache, `keep-sky-${Date.now()}.png`);
  file.create({ overwrite: true });
  file.write(png, { encoding: 'base64' });
  await Sharing.shareAsync(file.uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Share your sky' });
}
