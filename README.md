# Keep

Moments fall like stars. Tap the ones you'd keep. Your sky holds five.

Keep is a one-thumb game that shows you what you reach for. Every moment carries one of seven whys, but the whys stay hidden while you play. You only see them afterward, in the constellation your keeps draw and in a few short readings about what you grabbed, what you held on to, and what you actually did.

The repo is still named `twain` (the earlier card game lives in git history on `c7fcb65` and before). The app is **Keep**: bundle id `com.lipurposefe.keep`, App Store name "Keep: Catch a Falling Star", "Keep" under the icon.

## Modes

- **Drop** (45 seconds): moments fall and speed up. Keep five. Once full, tap a falling star to swap one out (time slows while you choose). Ends with a **final cut**: your fastest and slowest grab, six seconds to keep one.
- **Drift**: ten stars, already yours, start fading one by one. Touch and hold to keep a star lit (multi-touch, so two thumbs can protect two). Reads what you protect, not what you grab.
- **Slow drop**: one drop across a whole day. Fourteen moments over twelve hours, each taking about three hours to fall. Opt-in local reminders, never more than one every two hours. `/slow?quick=1` squeezes the day into about five minutes for testing.
- **Duel**: two thumbs, one phone laid flat. Stars streak across the middle with labels printed both ways up. A late second tap on a just-taken star counts as a fight.

After a solo round you can pick moments to **try today**. They wait on the home screen for a week; the next day Keep asks "Did you get to it?" and, if yes, "Glad you did?".

**Your sky** layers every constellation like a star chart and reads three things: what you grab fastest (Drop), what you hold (Drift), what you actually do (the list), plus where they differ.

## The seven whys

Delight, Setting, Novelty, Company, Skill, Taste, Direction (shown in full as "Life direction" where there's room). Each owns a vertical strip of the sky, which is why your keeps draw a shape that's yours.

Rules that matter:

- No why ranks above another. Never present them as a ladder from pleasure to purpose.
- Points never depend on *which* moments you keep. You can win on speed, on reading a friend, or on beating them to a moment, never by keeping "better" things.
- No streaks, no counts of misses, nothing to feel bad about. "Not this time" is a full answer.
- Use "life direction", never "meaning", for the Direction why.
- Avoid the shared ARC vocabulary from the purpose-platform apps (no "lens", no ∂) so App Store review doesn't read Keep as a copy of them (Guideline 4.3).

## Run

```bash
npm install
npx expo start --ios     # Expo Go on the simulator; notifications need a real build
npm test                 # node --test on the pure rules
npx expo lint
npx expo-doctor
```

Builds: `eas build -p ios --profile production --auto-submit` (credentials are set up on EAS; TestFlight internal group is "Team (Expo)").

## Layout

- `src/keep/content.mjs`: the seven whys, the moment pool, round constants
- `src/keep/insight.mjs`: dealing, headlines, solo and duel readings, sky positions (pure, tested)
- `src/keep/modes.mjs`: Drift, slow drop, reminders, list check-ins, Your sky readings (pure, tested)
- `src/keep/sky.js`: Skia drawing (sky, stars, trails, constellations) and the frame loop
- `src/keep/outcome.js`: final cut and results, shared by Drop and the slow drop
- `src/keep/notify.js`: opt-in local reminders (expo-notifications)
- `src/keep/ui.js`: buttons, readings, why chips, the still sky behind screens
- `src/app/`: Expo Router screens: `index` (home), `play` (Drop), `drift`, `slow`, `duel`, `sky`
- `src/lib/storage.js`: everything is local (AsyncStorage): rounds, holds, skies, the list, the slow drop
- `prototype/`: the HTML prototypes the app was designed from (`keep.html`, `keep-looks.html`, and earlier explorations)

Stack: Expo SDK 57, React Native 0.86, Expo Router, `@shopify/react-native-skia` for the falling field, Reanimated for small UI animations, Bodoni Moda and Jost via `@expo-google-fonts`.

## Open ideas

- A quiet bottom bar (Play · Sky · List) so the list and Your sky are easier to find.
- Twists per round (pairs, wind, fog, rush), a daily drop shared by everyone, playing a friend's ghost, themed decks.
