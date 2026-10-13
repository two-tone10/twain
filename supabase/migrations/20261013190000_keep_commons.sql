-- Keep commons. Contract: docs/commons-api.md.
-- Tables live in a private schema the REST API doesn't expose; the app only calls the functions below.

create schema if not exists keep;
revoke all on schema keep from public, anon, authenticated;

create table keep.star_events (
  id bigint generated always as identity primary key,
  device uuid not null,
  mode text not null,
  deck text not null,
  day int,
  t text not null,
  k text not null,
  kept boolean not null,
  dwell real,
  created_at timestamptz not null default now()
);
create index on keep.star_events (created_at);
create index on keep.star_events (day) where day is not null;

create table keep.round_calls (device uuid not null, at timestamptz not null default now());
create index on keep.round_calls (device, at);

create table keep.submissions (
  id bigint generated always as identity primary key,
  device uuid not null,
  t text not null,
  k text not null,
  deck text not null default 'everyday',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index on keep.submissions (status, reviewed_at);
create index on keep.submissions (device, created_at);

create or replace function keep.valid_why(x text) returns boolean language sql immutable as
$$ select x in ('delight','setting','novelty','company','skill','taste','direction') $$;

-- One call per finished round: every star that fell, kept or not.
create or replace function public.log_round(p jsonb) returns void
language plpgsql security definer set search_path = keep, public as $$
declare
  d uuid;
  m text := p->>'mode';
begin
  begin d := (p->>'device')::uuid; exception when others then return; end;
  if d is null or m not in ('drop','daily','drift','slow','challenge','pass') then return; end if;
  if jsonb_typeof(p->'stars') <> 'array' or jsonb_array_length(p->'stars') > 30 then return; end if;
  if (select count(*) from keep.round_calls where device = d and at > now() - interval '1 hour') >= 60 then return; end if;
  insert into keep.round_calls (device) values (d);
  insert into keep.star_events (device, mode, deck, day, t, k, kept, dwell)
  select d, m, coalesce(left(p->>'deck', 20), 'everyday'), nullif(p->>'day', '')::int,
         left(s->>'t', 40), s->>'k', coalesce((s->>'kept')::boolean, false), nullif(s->>'dwell', '')::real
  from jsonb_array_elements(p->'stars') s
  where keep.valid_why(s->>'k') and length(coalesce(s->>'t', '')) between 1 and 40;
exception when others then return;
end $$;

-- For one day's daily: the share of players who kept each moment. Empty under 20 players.
create or replace function public.daily_stats(p_day int)
returns table (t text, k text, kept_pct numeric, players int)
language sql stable security definer set search_path = keep, public as $$
  with e as (select * from keep.star_events where day = p_day and mode in ('daily','challenge')),
  n as (select count(distinct device)::int as players from e)
  select e.t, min(e.k), round(100.0 * count(distinct e.device) filter (where e.kept) / n.players, 1), n.players
  from e, n
  where n.players >= 20
  group by e.t, n.players
  order by 3 desc
$$;

-- The board: most caught, almost never caught, and rising, over the last week.
create or replace function public.commons_board() returns jsonb
language sql stable security definer set search_path = keep, public as $$
  with w as (
    select t, min(k) k,
      count(*) filter (where created_at > now() - interval '7 days') shown,
      count(*) filter (where created_at > now() - interval '7 days' and kept) kept,
      count(*) filter (where created_at <= now() - interval '7 days') shown0,
      count(*) filter (where created_at <= now() - interval '7 days' and kept) kept0
    from keep.star_events where created_at > now() - interval '14 days' group by t
  ), r as (
    select t, k, shown, round(100.0 * kept / nullif(shown, 0), 1) pct,
      case when shown0 >= 30 and shown >= 30 then 100.0 * kept / shown - 100.0 * kept0 / shown0 end delta
    from w
  )
  select jsonb_build_object(
    'most', coalesce((select jsonb_agg(x) from (select t, k, pct, shown from r where shown >= 50 order by pct desc limit 10) x), '[]'),
    'rare', coalesce((select jsonb_agg(x) from (select t, k, pct, shown from r where shown >= 50 order by pct asc limit 10) x), '[]'),
    'rising', coalesce((select jsonb_agg(x) from (select t, k, pct, shown from r where delta > 0 order by delta desc limit 10) x), '[]')
  )
$$;

-- A player's star for the commons. Held as pending until approved.
create or replace function public.submit_star(p jsonb) returns jsonb
language plpgsql security definer set search_path = keep, public as $$
declare
  d uuid;
  txt text := btrim(regexp_replace(coalesce(p->>'t', ''), '\s+', ' ', 'g'));
  w text := p->>'k';
begin
  begin d := (p->>'device')::uuid; exception when others then return jsonb_build_object('ok', false, 'reason', 'not_allowed'); end;
  if length(txt) < 3 then return jsonb_build_object('ok', false, 'reason', 'too_short'); end if;
  if length(txt) > 30 then return jsonb_build_object('ok', false, 'reason', 'too_long'); end if;
  if not keep.valid_why(w) or txt ~* '(https?://|www\.|\.com|@)'
     or txt ~* '\m(fuck|shit|bitch|cunt|dick|cock|pussy|nigg|fag|slut|whore|rape|kill)' then
    return jsonb_build_object('ok', false, 'reason', 'not_allowed');
  end if;
  if (select count(*) from keep.submissions where device = d and created_at > now() - interval '1 day') >= 5 then
    return jsonb_build_object('ok', false, 'reason', 'slow_down');
  end if;
  insert into keep.submissions (device, t, k, deck) values (d, txt, w, coalesce(left(p->>'deck', 20), 'everyday'));
  return jsonb_build_object('ok', true, 'reason', null);
end $$;

-- Approved community stars since a time.
create or replace function public.community_moments(p_since timestamptz)
returns table (t text, k text, approved_at timestamptz)
language sql stable security definer set search_path = keep, public as $$
  select t, k, reviewed_at from keep.submissions
  where status = 'approved' and reviewed_at > p_since
  order by reviewed_at desc limit 500
$$;

-- Moderation, for the password-protected admin page only (service role).
create or replace function public.keep_admin_list(p_status text default 'pending')
returns table (id bigint, t text, k text, deck text, status text, created_at timestamptz)
language sql stable security definer set search_path = keep, public as $$
  select id, t, k, deck, status, created_at from keep.submissions where status = p_status order by created_at desc limit 200
$$;

create or replace function public.keep_admin_review(p_id bigint, p_status text) returns void
language sql security definer set search_path = keep, public as $$
  update keep.submissions set status = p_status, reviewed_at = now() where id = p_id and p_status in ('approved', 'rejected')
$$;

revoke all on function public.keep_admin_list(text) from public, anon, authenticated;
revoke all on function public.keep_admin_review(bigint, text) from public, anon, authenticated;
grant execute on function public.keep_admin_list(text) to service_role;
grant execute on function public.keep_admin_review(bigint, text) to service_role;

grant execute on function public.log_round(jsonb), public.daily_stats(int), public.commons_board(), public.submit_star(jsonb), public.community_moments(timestamptz) to anon, authenticated;
