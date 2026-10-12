# Keep

Moments fall like stars. Tap the ones you'd keep. Your sky holds five.

Keep is a one-thumb game that shows you what you reach for. Every moment carries one of seven whys, but the whys stay hidden while you play. You only see them afterward, in the constellation your keeps draw and in a few short readings about what you grabbed, what you held on to, and what you actually did.

The repo is still named `twain` (the earlier card game lives in git history on `c7fcb65` and before). The app is **Keep**: bundle id `com.lipurposefe.keep`, App Store name "Keep: Catch a Falling Star", "Keep" under the icon.

## Modes

- **Drop** (45 seconds): moments fall and speed up. Keep five. Once full, tap a falling star to swap one out (time slows while you choose). Ends with a **final cut**: your fastest and slowest grab, six seconds to keep one.
- **Drift**: ten stars, already yours, start fading one by one. Touch and hold to keep a star lit (multi-touch, so two thumbs can protect two). Reads what you protect, not what you grab.
- **Slow drop**: one drop across a whole day. Fourteen moments over twelve hours, each taking about three hours to fall. Opt-in local reminders, never more than one every two hours. `/slow?quick=1` squeezes the day into about five minutes for testing.
- **Pass it around** (2–6 players, one phone): each person plays a 30-second drop on their own deck and hands the phone on. Then one family sky (a color per person, shared stars glowing), what you share and who went their own way, and one thing to do together, which goes on the List.
- **Duel**: two thumbs, one phone laid flat. Stars streak across the middle with labels printed both ways up. A late second tap on a just-taken star counts as a fight.

A solo round ends with **make one real**: a short reading (and how many rounds until your first pattern), then "Which of these could actually happen this week?", then two taps for when (tonight, this weekend, this week, someday) and with whom. The plan goes on the List with its day, and Keep asks how it went at the right time (next morning, Sunday evening, end of week; someday never asks). "Just playing today" is always a full answer.

Plans wait on the List tab; an opt-in **Tonight's star** nudge at 6pm names tonight's plan or the newest open moment.

**First launch** (`/welcome`): three slow stars instead of instructions, named the moment you tap one; then the one slow question (which two whys matter most to you?); then a deck.

**Your sky** layers every constellation like a star chart, then reads:
- **What you said · what you grab**: the two whys you named on day one against your fastest grabs (after five drops).
- **Reach · do · glad**: what you grab fastest, what you tick off, what you're glad you did, side by side, with one sentence about the biggest gap and one moment offered to close it.
- What you hold (Drift), and a moment you keep catching but haven't done.

**Your seven** (`/why/<key>`): tap any colored why anywhere for its page: what it means, your history with it, a few moments to try.

**Decks**: Everyday, Campus, New city, With kids, Next chapter, Young (kids about 7–13). Same seven whys, moments written for a life stage. Chosen on first launch or from the home screen.

**Duel** ends with **read each other**: before the reveal, each player guesses the other's strongest why.

## Who it's for, and what it does

A 45-second game that shows you what you actually reach for, then helps you do a little more of it. Notice (speed shows the pull), name (seven whys), try (one moment into today), check (did you, were you glad). The payoff is three answers that rarely agree: what you reach for, what you do, what you're glad you did. For people with full calendars and flat days, people starting over, people allergic to journaling, and two people on one couch. Not therapy, never a score.

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

JS-only changes ship over the air: `eas update --branch production --message "..."` (runtime 1.0.0, no build credits). Builds: `eas build -p ios --profile production --auto-submit` (credentials are set up on EAS; TestFlight internal group is "Team (Expo)").

## The moment library

Moments live in `src/keep/library.mjs`, generated from a private portal (a claude.ai artifact the owner adds to: https://claude.ai/artifact/8QitMSF4JHug8ZCKRszV68). Don't hand-edit the file; add in the portal.

To ship new moments:
1. Get the portal's moments: Claude pulls them into a folder, or use the portal's **Copy JSON** and save it to a file.
2. `npm run library -- <file or folder>` rewrites `library.mjs` (dedupes per deck, skips hidden ones, reports anything with an unknown why or deck).
3. `npm test` (checks every deck still covers every why), commit, then `eas update --branch production --message "library"`.

Each deck should have at least 4 moments per why; short ones borrow from Everyday until filled. The portal's coverage grid shows the gaps.

## Layout

- `src/keep/content.mjs`: the seven whys, decks, per-deck pools, round constants
- `src/keep/library.mjs`: every moment (generated, see above)
- `src/keep/plans.mjs`: when/with labels, check-in timing and wording for plans (pure, tested)
- `src/keep/table.mjs`: Pass it around summary: shared moments, solo picks, what to do together (pure, tested)
- `src/keep/field.js`: the falling field, shared by Drop and Pass it around
- `src/keep/readings.mjs`: said vs grabbed, reach · do · glad, one why's stats, duel guesses, the evening nudge (pure, tested)
- `src/keep/insight.mjs`: dealing, headlines, solo and duel readings, sky positions (pure, tested)
- `src/keep/modes.mjs`: Drift, slow drop, reminders, list check-ins, Your sky readings (pure, tested)
- `src/keep/sky.js`: Skia drawing (sky, stars, trails, constellations) and the frame loop
- `src/keep/outcome.js`: final cut and results, shared by Drop and the slow drop
- `src/keep/notify.js`: opt-in local reminders (expo-notifications)
- `src/keep/ui.js`: buttons, readings, why chips, the still sky behind screens
- `src/app/`: Expo Router screens: `(tabs)/index` (Play), `(tabs)/sky`, `(tabs)/list`, `play` (Drop), `drift`, `slow`, `duel`, `welcome`, `decks`, `why/[k]`, `pass`
- `src/lib/prefs.js`: deck (also held in memory for dealing), the two whys you said, onboarding, the evening nudge
- `portal/library.html`: source of the library portal artifact
- `scripts/sync-library.mjs`: portal export to `library.mjs`
- `src/lib/storage.js`: everything is local (AsyncStorage): rounds, holds, skies, the list, the slow drop
- `prototype/`: the HTML prototypes the app was designed from (`keep.html`, `keep-looks.html`, and earlier explorations)

Stack: Expo SDK 57, React Native 0.86, Expo Router, `@shopify/react-native-skia` for the falling field, Reanimated for small UI animations, Bodoni Moda and Jost via `@expo-google-fonts`.

## Open ideas

- Share your sky (a poster of a round's constellation) and a Tonight's star home-screen widget. Both need a native build.
- Twists per round (pairs, wind, fog, rush), a daily drop shared by everyone, playing a friend's ghost, more decks.
