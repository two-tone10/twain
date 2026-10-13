// Soft chimes for catches: a pentatonic step up with each combo, and a sparkle for a comet.
// Respects the silent switch and mixes with whatever else is playing. Any failure stays silent,
// including builds made before the audio module was added (they simply play without chimes).
import { requireOptionalNativeModule } from 'expo';

const FILES = [
  require('../../assets/sounds/chime0.wav'),
  require('../../assets/sounds/chime1.wav'),
  require('../../assets/sounds/chime2.wav'),
  require('../../assets/sounds/chime3.wav'),
  require('../../assets/sounds/chime4.wav'),
  require('../../assets/sounds/chime5.wav'),
];
const COMET = require('../../assets/sounds/comet.wav');

let players = null;
export function loadSounds() {
  if (players) return;
  try {
    if (!requireOptionalNativeModule('ExpoAudio')) throw new Error('no audio in this build');
    const { createAudioPlayer } = require('expo-audio');
    players = { chimes: FILES.map((f) => createAudioPlayer(f)), comet: createAudioPlayer(COMET) };
    for (const p of [...players.chimes, players.comet]) p.volume = 0.6;
  } catch { players = { chimes: [], comet: null }; }
}

function ring(p) {
  if (!p) return;
  try { p.seekTo(0); p.play(); } catch {}
}

// combo 1 is the lowest note; each catch in a row climbs.
export const chime = (combo = 1) => { loadSounds(); ring(players.chimes[Math.min(combo, FILES.length) - 1]); };
export const cometChime = () => { loadSounds(); ring(players.comet); };
