# Keep commons: backend contract

The app (`src/`) and the backend (`supabase/`) meet here. Change this file by PR so both sides see it.

## Principles

- **Anonymous.** No accounts, emails or names. Each install makes a random `device` id (UUID v4) on first launch. Nothing ties it to a person. Only the database's server-side functions read it, for rate limits.
- **Counts, not people.** The board shows percentages of anonymous players. No user ever sees another user's data.
- **Nothing anyone submits is shown until approved.** Submitted stars wait in a queue; the owner approves them on a password-protected page.
- **Doctrine.** Never rank the seven whys. Present rare catches as rare, never as unpopular.

## Supabase

Project: Supabase `keep` (ref `rmvgbonpbqrwctyrwqob`, us-east-1). Schema and functions: `supabase/migrations/`; deploy with `supabase db push -p "$(cat supabase/.db-password)"` (the password file is local and gitignored). The app reads `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (EAS environment `production`). Everything goes through Postgres RPCs over the REST API (`POST /rest/v1/rpc/<name>` with the anon key). The anon role gets no direct table access; RPCs are `security definer`.

Why keys are `delight | setting | novelty | company | skill | taste | direction`. Deck keys are `everyday | campus | city | kids | later | young | community`. Day = Keep's daily number (`1` = 2026-10-01 local), an integer.

## Tables (internal)

- `star_events`: `id`, `device uuid`, `mode text` (`drop|daily|drift|slow|challenge|pass`), `deck text`, `day int null`, `t text` (≤ 40 chars), `k text`, `kept bool`, `dwell real null`, `created_at`.
- `submissions`: `id`, `device uuid`, `t text` (3–30 chars), `k text`, `deck text`, `status text` (`pending|approved|rejected`), `created_at`, `reviewed_at`.

## RPCs

### `log_round(p jsonb) → void`
One call per finished round. `p = { device, mode, deck, day, stars: [{ t, k, kept, dwell }] }`. `stars` holds every star that fell, kept or not (≤ 30). Ignore malformed input. Rate limit: ≤ 60 calls per device per hour.

### `daily_stats(p_day int) → [{ t, k, kept_pct, players }]`
For the daily on `p_day`: per moment, the share of players who kept it (0–100, one decimal), from `mode in ('daily','challenge')`. `players` = distinct devices that played that day. Return `[]` under 20 players, so tiny samples don't mislead.

### `commons_board() → { most: [...], rare: [...], rising: [...] }`
Each item `{ t, k, pct, shown }`, cached or materialized and refreshed about every 15 minutes.
- `most`: top 10 by keep rate over the last 7 days, shown ≥ 50.
- `rare`: bottom 10 by keep rate, last 7 days, shown ≥ 50 (the stars nobody catches).
- `rising`: top 10 by change in keep rate, last 7 days against the 7 days before, shown ≥ 30 in both windows.

### `submit_star(p jsonb) → { ok bool, reason text }`
`p = { device, t, k, deck }`. Trim; 3–30 chars; reject URLs, @handles and a basic profanity list; ≤ 5 per device per day. Insert as `pending`. Reasons: `too_short | too_long | not_allowed | slow_down`.

### `community_moments(p_since timestamptz) → [{ t, k, approved_at }]`
Approved submissions since `p_since`, newest first, ≤ 500. The app caches them and deals them as the `community` deck, and now and then as a daily star.

## Moderation

Service-role-only RPCs: `keep_admin_list(p_status text default 'pending')` and `keep_admin_review(p_id bigint, p_status text)` (`approved | rejected`).


A password-protected page at `lipurposefe.com/keep/admin` (same Basic-auth middleware pattern as `/invariably/dashboard`) lists `pending` submissions with Approve / Reject, plus the 7-day board for a glance. Approving can also mean "promote to library": the owner adds the moment to the library portal by hand.

## Privacy (for the App Store form)

Collected: Usage Data (which anonymous moments were kept), not linked to identity, not used for tracking. User Content (submitted stars), not linked to identity. Nothing else.

## Match and Circles (migration 20261014120000_keep_together.sql)

Nobody sees another person's sky until they've played the same stars. Device ids never leave the server; circle members appear as a short hash (`mid`).

- `create_match(p {device, name, seed, deck, kept[], whys, speed})`, `get_match(p_id, p_device)`, `play_match(p {id, device, name, kept[], whys, speed})` (second player only), `guess_match(p {id, device, guesses[3]})`, `my_matches(p_device)`. A match is two players, open for 7 days. Its stars come from `matchDeal(seed, deck)` in `src/keep/together.mjs`.
- `create_circle(p {device, name, circle_name})`, `join_circle(p {code, device, name})`, `leave_circle(p {code, device})`, `my_circles(p_device)`, `circle_preview(p_code)`.
- `log_daily(p {device, name, day, kept[], whys, speed})` on every daily. `circle_day(p_code, p_device, p_day)`, `circle_guess(p {code, device, day, mid, guesses[3]})`, `circle_week(p_code, p_device, p_today)` (only days the caller played; the app computes the awards).
