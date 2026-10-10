# Twain

Two players, one Saturday. Each player secretly picks a side: **The Savorer** (delight) or **The Steward** (growth). Both can pick the same one. Each sees only their own side's tags and three secret goals.

## How a game goes

1. **Pick:** both players choose a side in secret.
2. **Five rounds:** one per part of the day (Morning → Night). One player offers two tiles, the other takes one for that slot. Offerer and taker trade places each round. Every offer and every take is a clue.
3. **Guess:** after round five, each player guesses which side the other played.
4. **Reveal:** the day is scored and both reads are shown.

## Scoring

- A day's score is the **lower** player's goal count, so no one can carry it alone. Good day: 2 of 3 goals each. Full day: 3 of 3 each.
- Reads: each correct guess of the partner's side.
- Good days are saved to a local album. There are no streaks, no leaderboard, and no per-persona stats.

## Run

```bash
npm install
npx expo start --web    # or scan with Expo Go
npm test                # engine tests
```

Rooms use Supabase Realtime broadcast and presence only. Nothing is written to the database: the host's device holds the game state, and the album stays on the device. Picks are hidden by the UI, not encrypted: the guest's client receives the full state.

## Layout

- `src/game/`: pure engine (`engine.mjs`) and content (`content.mjs`), tested with `node --test`
- `src/lib/room.js`: host-authoritative room sync
- `src/app/`: Expo Router screens (home, room, pass-and-play, album)
