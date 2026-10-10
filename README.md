# Twain

Two players, one Saturday. Each player secretly picks a side: **The Savorer** (delight) or **The Steward** (growth). Both can pick the same one. Each sees only their own side's tags and goals: two for their side plus a secret **Mask**, one tile from the other side they need on the day.

## How a game goes

1. **Pick:** both players choose a side in secret.
2. **Five rounds**, one per part of the day, each a different task:
   - **Offer** (Morning): one offers two tiles, the other takes one.
   - **Veto** (Midday): one shows three, the other strikes one, the first places one of the two left.
   - **The Turn** (Afternoon): each player secretly keeps their side or switches. Switching deals two new goals and a new Mask. Then an offer/take.
   - **Blind** (Evening): both pick a tile at once. Match and it lands; miss and a coin flip decides.
   - **Last call** (Night): one cuts a tile for good, the other fills Night.
3. **The read** (3 points): which side your partner ended on, whether they switched, and which tile was their Mask (or that it never came up).
4. **Reveal:** the day is scored and both reads are shown.

## Scoring

- A day's score is the **lower** player's goal count, so no one can carry it alone. Good day: 2 of 3 goals each. Full day: 3 of 3 each.
- Reads: up to 3 per player.
- Good days are saved to a local album. There are no streaks, no leaderboard, and no per-persona stats.

## Run

```bash
npm install
npx expo start --web    # or scan with Expo Go
npm test                # engine tests
```

Rooms use Supabase Realtime broadcast and presence only. Nothing is written to the database: the host's device holds the game state, and the album stays on the device. Picks, switches and Masks are hidden by the UI, not encrypted: the guest's client receives the full state.

## Layout

- `src/game/`: pure engine (`engine.mjs`) and content (`content.mjs`), tested with `node --test`
- `src/lib/room.js`: host-authoritative room sync
- `src/app/`: Expo Router screens (home, room, pass-and-play, album)
