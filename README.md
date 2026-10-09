# Twain

Two players, one Saturday. A co-op puzzle where one player is **The Savorer** (delight) and the other is **The Steward** (growth). Each sees half of what every tile offers and has three secret goals. Signal, trade turns, and fill six time slots so both of you are satisfied. Roles swap every round.

## Scoring

- Each persona has 3 goals. A round's score is the **lower** side's count, so neither persona can carry it alone.
- Win: at least 2 of 3 goals met on both sides. Full day: 3 of 3 on both sides.
- 10 shared moves, alternating turns. Placing on a filled slot bumps that tile back to the pool.
- Wins are saved to a local album. There are no streaks, no leaderboard, and no per-persona stats.

## Run

```bash
npm install
npx expo start --web    # or scan with Expo Go
npm test                # engine tests
```

Rooms use Supabase Realtime broadcast and presence only. Nothing is written to the database: the host's device holds the game state, and the album stays on the device.

## Layout

- `src/game/`: pure engine (`engine.mjs`) and content (`content.mjs`), tested with `node --test`
- `src/lib/room.js`: host-authoritative room sync
- `src/app/`: Expo Router screens (home, room, pass-and-play, album)
