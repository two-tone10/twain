# Keep commons backend

Postgres tables and RPCs for the contract in `docs/commons-api.md`. Anon and authenticated roles can only call the five RPCs (`security definer`); the tables have RLS on and no grants.

- `migrations/`: schema and RPCs. Apply with `supabase db push` (linked project) or paste into the SQL editor.
- `tests/seed_fake_day.sql`: 100 fake devices (ids start `00000000-0000-4000-8000-`), today's daily plus 13 days of drops, so `daily_stats` and `commons_board` return data. Re-runnable; delete with `delete from keep_star_events where device::text like '00000000-0000-4000-8000-%'`.
- `tests/rpc_checks.sql`: smoke checks (validation, rate limits, approval gate, anon blocked from tables). Every line should read `ok`.

Moderation lives at `lipurposefe.com/keep/admin` (lipurposefe repo, `api/keep-admin.js`), using the service role server-side.
