// Themes. The choice is read once, synchronously, when the app starts, so every style built at load time
// uses it; changing it in Settings saves the choice and restarts the app. Fonts are the same in every theme.
// Tokens: sky0/sky1 background gradient, ink/dim/faint text, line hairlines, panel faint fill, gold the accent
// (buttons, constellation lines, emphasis), star and glow the stars, dark text on accent buttons,
// card/cardLine raised panels, accentWash accent-tinted fill, ghost dashed outlines, inset input wells,
// field the starfield dots, shade the soft shadow behind text drawn on the sky, danger for delete and report.
import { Appearance } from 'react-native';
import { File, Paths } from 'expo-file-system';
import { WHY, WHYS } from '../keep/content.mjs';

export const THEMES = {
  charcoal: {
    name: 'Charcoal', light: false,
    sky0: '#1f2125', sky1: '#2b2e33', ink: '#f2f1ee', dim: '#b4b0a8', faint: '#8e8a83',
    line: 'rgba(242,241,238,0.14)', panel: 'rgba(242,241,238,0.05)', gold: '#7bafd4', star: '#fbf8f2', glow: '#c8a97e',
    dark: '#1b1d20', card: 'rgba(52,56,62,0.85)', cardLine: 'rgba(123,175,212,0.45)', accentWash: 'rgba(123,175,212,0.12)',
    ghost: 'rgba(242,241,238,0.4)', inset: 'rgba(0,0,0,0.25)', field: '#f2f1ee', shade: '#1f2125', danger: '#e8907a',
  },
  salon: {
    name: 'Night Salon', light: false,
    sky0: '#05060f', sky1: '#141938', ink: '#efe6d6', dim: '#b9ae9c', faint: '#8a8074',
    line: 'rgba(239,230,214,0.14)', panel: 'rgba(239,230,214,0.05)', gold: '#d8b46a', star: '#fffaf0', glow: '#ffe6a6',
    dark: '#15111d', card: 'rgba(20,25,56,0.8)', cardLine: 'rgba(216,180,106,0.45)', accentWash: 'rgba(216,180,106,0.1)',
    ghost: 'rgba(239,230,214,0.4)', inset: 'rgba(5,6,15,0.5)', field: '#e8ecff', shade: '#05060f', danger: '#e8907a',
  },
  navy: {
    name: 'Navy', light: false,
    sky0: '#13294b', sky1: '#1d3a6b', ink: '#ffffff', dim: '#c3cddc', faint: '#93a3bb',
    line: 'rgba(255,255,255,0.16)', panel: 'rgba(255,255,255,0.06)', gold: '#7bafd4', star: '#ffffff', glow: '#bcd8ee',
    dark: '#13294b', card: 'rgba(255,255,255,0.08)', cardLine: 'rgba(123,175,212,0.5)', accentWash: 'rgba(123,175,212,0.14)',
    ghost: 'rgba(255,255,255,0.4)', inset: 'rgba(0,0,0,0.2)', field: '#ffffff', shade: '#13294b', danger: '#f2a08a',
  },
  daylight: {
    name: 'Daylight', light: true,
    sky0: '#f4f5f7', sky1: '#e3e7ec', ink: '#13294b', dim: '#4f5866', faint: '#727b89',
    line: 'rgba(19,41,75,0.14)', panel: 'rgba(19,41,75,0.04)', gold: '#2f7fb8', star: '#13294b', glow: '#7bafd4',
    dark: '#ffffff', card: 'rgba(255,255,255,0.9)', cardLine: 'rgba(47,127,184,0.45)', accentWash: 'rgba(47,127,184,0.1)',
    ghost: 'rgba(19,41,75,0.35)', inset: 'rgba(19,41,75,0.05)', field: '#13294b', shade: '#f4f5f7', danger: '#a63a24',
  },
};
// What Settings offers. Auto follows the phone: Daylight in light mode, Charcoal in dark.
export const THEME_CHOICES = [['charcoal', 'Charcoal'], ['salon', 'Night Salon'], ['navy', 'Navy'], ['daylight', 'Daylight'], ['auto', 'Auto']];

const themeFile = () => new File(Paths.document, 'keep-theme.json');
function readChoice() {
  try {
    const f = themeFile();
    if (f.exists) return JSON.parse(f.textSync()).theme;
  } catch {}
  return 'charcoal';
}
export const THEME_CHOICE = THEME_CHOICES.some(([k]) => k === readChoice()) ? readChoice() : 'charcoal';
const resolved = THEME_CHOICE === 'auto' ? (Appearance.getColorScheme() === 'light' ? 'daylight' : 'charcoal') : THEME_CHOICE;
export const C = { ...THEMES[resolved] };

// The seven why colors are pastel for night skies; on Daylight they need more depth to read on paper.
const DEEP = { delight: '#c2566c', setting: '#94722a', novelty: '#24848e', company: '#bb6a33', skill: '#577f3c', taste: '#7457ad', direction: '#3670b3' };
if (C.light) for (const w of WHYS) { w.color = DEEP[w.key]; WHY[w.key].color = DEEP[w.key]; }

export function saveThemeChoice(theme) {
  const f = themeFile();
  f.create({ overwrite: true });
  f.write(JSON.stringify({ theme }));
}

export const S = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const R = { sm: 4, md: 8, lg: 12, xl: 16, full: 999 };

// Loaded in _layout; Skia loads the same files by path in keep/sky.js.
export const F = {
  serif: 'BodoniModa_500Medium',
  serifRegular: 'BodoniModa_400Regular',
  serifItalic: 'BodoniModa_400Regular_Italic',
  sans: 'Jost_400Regular',
  sansMedium: 'Jost_500Medium',
  sansBold: 'Jost_600SemiBold',
};
