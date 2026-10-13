-- Keep commons. Contract: docs/commons-api.md.
-- Anonymous: the only id is a random per-install `device`, read only by these functions.
-- Anon and authenticated get RPC access only; the tables are internal.

create table if not exists public.star_events (
  id bigint generated always as identity primary key,
  device uuid not null,
  mode text not null check (mode in ('drop','daily','drift','slow','challenge','pass')),
  deck text not null check (deck in ('everyday','campus','city','kids','later','young','community')),
  day int,
  t text not null check (char_length(t) between 1 and 40),
  k text not null check (k in ('delight','setting','novelty','company','skill','taste','direction')),
  kept boolean not null,
  dwell real,
  created_at timestamptz not null default now()
);
create index if not exists star_events_day_idx on public.star_events (day) where day is not null;
create index if not exists star_events_created_idx on public.star_events (created_at);

create table if not exists public.submissions (
  id bigint generated always as identity primary key,
  device uuid not null,
  t text not null check (char_length(t) between 3 and 30),
  k text not null check (k in ('delight','setting','novelty','company','skill','taste','direction')),
  deck text not null default 'everyday',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists submissions_status_idx on public.submissions (status, created_at);
create index if not exists submissions_device_idx on public.submissions (device, created_at);
create index if not exists submissions_approved_idx on public.submissions (reviewed_at) where status = 'approved';

-- One row per log_round call, for the hourly rate limit.
create table if not exists public.round_calls (
  device uuid not null,
  created_at timestamptz not null default now()
);
create index if not exists round_calls_device_idx on public.round_calls (device, created_at);

-- commons_board is computed at most every 15 minutes and served from here.
create table if not exists public.board_cache (
  id int primary key default 1 check (id = 1),
  board jsonb not null,
  computed_at timestamptz not null
);

alter table public.star_events enable row level security;
alter table public.submissions enable row level security;
alter table public.round_calls enable row level security;
alter table public.board_cache enable row level security;
revoke all on public.star_events, public.submissions, public.round_calls, public.board_cache from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on public.star_events, public.submissions, public.round_calls, public.board_cache from anon, authenticated;
    -- The moderation page (server-side, service role) reads and reviews submissions.
    grant select, update on public.submissions to service_role;
    grant select on public.star_events to service_role;
  end if;
end $$;

create or replace function public.keep_is_why(x text) returns boolean
language sql immutable as $$
  select x in ('delight','setting','novelty','company','skill','taste','direction')
$$;

create or replace function public.keep_is_deck(x text) returns boolean
language sql immutable as $$
  select x in ('everyday','campus','city','kids','later','young','community')
$$;

create or replace function public.keep_uuid(x text) returns uuid
language plpgsql immutable as $$
begin
  if x !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return null; end if;
  return x::uuid;
end $$;

-- log_round(p) → void. One call per finished round. Malformed input is ignored.
create or replace function public.log_round(p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_device uuid;
  v_mode text;
  v_deck text;
  v_day int;
  v_stars jsonb;
begin
  if p is null or jsonb_typeof(p) <> 'object' then return; end if;
  v_device := keep_uuid(p->>'device');
  v_mode := p->>'mode';
  v_deck := p->>'deck';
  v_stars := p->'stars';
  if v_device is null
     or v_mode is null or v_mode not in ('drop','daily','drift','slow','challenge','pass')
     or not coalesce(keep_is_deck(v_deck), false)
     or v_stars is null or jsonb_typeof(v_stars) <> 'array'
     or jsonb_array_length(v_stars) = 0 or jsonb_array_length(v_stars) > 30 then
    return;
  end if;
  if jsonb_typeof(p->'day') = 'number' then
    if (p->>'day') !~ '^-?[0-9]+$' then return; end if;
    v_day := (p->>'day')::int;
  elsif p->'day' is not null and jsonb_typeof(p->'day') <> 'null' then
    return;
  end if;

  if (select count(*) from round_calls where device = v_device and created_at > now() - interval '1 hour') >= 60 then
    return;
  end if;
  insert into round_calls (device) values (v_device);
  delete from round_calls where created_at < now() - interval '2 hours' and random() < 0.05;

  insert into star_events (device, mode, deck, day, t, k, kept, dwell)
  select v_device, v_mode, v_deck, v_day, btrim(s->>'t'), s->>'k', (s->>'kept')::boolean,
         case when jsonb_typeof(s->'dwell') = 'number' then (s->>'dwell')::real end
  from jsonb_array_elements(v_stars) s
  where jsonb_typeof(s) = 'object'
    and jsonb_typeof(s->'t') = 'string' and char_length(btrim(s->>'t')) between 1 and 40
    and keep_is_why(s->>'k')
    and jsonb_typeof(s->'kept') = 'boolean';
end $$;

-- daily_stats(p_day) → [{ t, k, kept_pct, players }]. Empty under 20 players.
create or replace function public.daily_stats(p_day int)
returns table (t text, k text, kept_pct numeric, players int)
language sql stable security definer set search_path = public as $$
  with ev as (
    select e.device, e.t, e.k, bool_or(e.kept) as kept
    from star_events e
    where e.day = p_day and e.mode in ('daily','challenge')
    group by e.device, e.t, e.k
  ),
  n as (select count(distinct device)::int as players from ev)
  select ev.t, ev.k, round(100.0 * avg(ev.kept::int), 1) as kept_pct, n.players
  from ev, n
  where n.players >= 20
  group by ev.t, ev.k, n.players
  order by ev.t
$$;

-- The board itself. Called by commons_board when the cache is stale.
create or replace function public.keep_compute_board() returns jsonb
language sql stable security definer set search_path = public as $$
  with cur as (
    select t, k, count(*)::int as shown, 100.0 * avg(kept::int) as rate
    from star_events where created_at >= now() - interval '7 days'
    group by t, k
  ),
  prev as (
    select t, k, count(*)::int as shown, 100.0 * avg(kept::int) as rate
    from star_events where created_at >= now() - interval '14 days' and created_at < now() - interval '7 days'
    group by t, k
  ),
  most as (
    select t, k, round(rate, 1) as pct, shown from cur where shown >= 50
    order by rate desc, shown desc, t limit 10
  ),
  rare as (
    select t, k, round(rate, 1) as pct, shown from cur where shown >= 50
    order by rate asc, shown desc, t limit 10
  ),
  rising as (
    select c.t, c.k, round(c.rate, 1) as pct, c.shown, c.rate - p.rate as delta
    from cur c join prev p using (t, k)
    where c.shown >= 30 and p.shown >= 30 and c.rate > p.rate
    order by c.rate - p.rate desc, c.shown desc, c.t limit 10
  )
  select jsonb_build_object(
    'most', coalesce((select jsonb_agg(jsonb_build_object('t', t, 'k', k, 'pct', pct, 'shown', shown) order by pct desc, shown desc, t) from most), '[]'::jsonb),
    'rare', coalesce((select jsonb_agg(jsonb_build_object('t', t, 'k', k, 'pct', pct, 'shown', shown) order by pct asc, shown desc, t) from rare), '[]'::jsonb),
    'rising', coalesce((select jsonb_agg(jsonb_build_object('t', t, 'k', k, 'pct', pct, 'shown', shown) order by delta desc, shown desc, t) from rising), '[]'::jsonb)
  )
$$;

-- commons_board() → { most, rare, rising }, refreshed about every 15 minutes.
create or replace function public.commons_board() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_board jsonb;
begin
  select board into v_board from board_cache where id = 1 and computed_at > now() - interval '15 minutes';
  if v_board is not null then return v_board; end if;
  if not pg_try_advisory_xact_lock(hashtext('keep_commons_board')) then
    select board into v_board from board_cache where id = 1;
    return coalesce(v_board, keep_compute_board());
  end if;
  v_board := keep_compute_board();
  insert into board_cache (id, board, computed_at) values (1, v_board, now())
  on conflict (id) do update set board = excluded.board, computed_at = excluded.computed_at;
  return v_board;
end $$;

-- submit_star(p) → { ok, reason }. Queued as pending; nothing shows until approved.
create or replace function public.submit_star(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_device uuid;
  v_t text;
  v_k text;
  v_deck text;
  v_low text;
begin
  if p is null or jsonb_typeof(p) <> 'object' then
    return jsonb_build_object('ok', false, 'reason', 'not_allowed');
  end if;
  v_device := keep_uuid(p->>'device');
  v_t := regexp_replace(btrim(coalesce(p->>'t', '')), '\s+', ' ', 'g');
  v_k := p->>'k';
  v_deck := coalesce(nullif(p->>'deck', ''), 'everyday');
  if v_device is null or not coalesce(keep_is_why(v_k), false) or not keep_is_deck(v_deck) then
    return jsonb_build_object('ok', false, 'reason', 'not_allowed');
  end if;
  if char_length(v_t) < 3 then return jsonb_build_object('ok', false, 'reason', 'too_short'); end if;
  if char_length(v_t) > 30 then return jsonb_build_object('ok', false, 'reason', 'too_long'); end if;

  v_low := lower(v_t);
  if v_low ~ '(https?:|www\.|://|\m[a-z0-9-]+\.(com|net|org|io|co|app|ly|gg|me|xyz|ai|tv|us|uk|info|biz|link)\M)'
     or v_low ~ '@[a-z0-9_]'
     or v_low ~ '\m(fuck\w*|shit\w*|bitch\w*|cunt\w*|dick|dicks|cock|cocks|pussy|asshole\w*|bastard\w*|whore\w*|slut\w*|fag\w*|faggot\w*|nigg\w*|retard\w*|rape\w*|porn\w*|nude\w*|sex|sexy|kill yourself|kys|nazi\w*|hitler)\M' then
    return jsonb_build_object('ok', false, 'reason', 'not_allowed');
  end if;

  if (select count(*) from submissions where device = v_device and created_at > now() - interval '1 day') >= 5 then
    return jsonb_build_object('ok', false, 'reason', 'slow_down');
  end if;

  insert into submissions (device, t, k, deck) values (v_device, v_t, v_k, v_deck);
  return jsonb_build_object('ok', true, 'reason', null);
end $$;

-- community_moments(p_since) → [{ t, k, approved_at }], newest first, ≤ 500.
create or replace function public.community_moments(p_since timestamptz)
returns table (t text, k text, approved_at timestamptz)
language sql stable security definer set search_path = public as $$
  select s.t, s.k, s.reviewed_at as approved_at
  from submissions s
  where s.status = 'approved' and s.reviewed_at > coalesce(p_since, '-infinity'::timestamptz)
  order by s.reviewed_at desc
  limit 500
$$;

revoke all on function public.log_round(jsonb), public.daily_stats(int), public.commons_board(),
  public.submit_star(jsonb), public.community_moments(timestamptz), public.keep_compute_board(),
  public.keep_is_why(text), public.keep_is_deck(text), public.keep_uuid(text) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function public.keep_compute_board(), public.keep_is_why(text), public.keep_is_deck(text), public.keep_uuid(text) from anon, authenticated;
    grant execute on function public.log_round(jsonb), public.daily_stats(int), public.commons_board(),
      public.submit_star(jsonb), public.community_moments(timestamptz) to anon, authenticated, service_role;
  end if;
end $$;
