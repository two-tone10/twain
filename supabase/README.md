# Keep commons backend

Supabase project **`keep`** (ref `rmvgbonpbqrwctyrwqob`, us-east-1). Contract: `docs/commons-api.md`.

- Schema and functions: `migrations/`. Tables live in the private `keep` schema; the app only calls the public RPCs (`log_round`, `daily_stats`, `commons_board`, `submit_star`, `community_moments`). Moderation RPCs (`keep_admin_list`, `keep_admin_review`) are service-role only and used by lipurposefe.com/keep/admin.
- Deploy: from the repo root, `supabase link --project-ref rmvgbonpbqrwctyrwqob` then `supabase db push -p "$(cat supabase/.db-password)"`. The password file is local and gitignored.
