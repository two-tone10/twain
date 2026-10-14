-- Keep safety: a word filter on names, reporting and hiding people, taking stars back after approval,
-- circle owners removing members, rematching someone you've played, and forgetting a phone entirely.

-- A rematch is sent to one person, who finds it in their Match list.
alter table keep.matches add column invitee uuid;
create index on keep.matches (invitee) where invitee is not null;

-- Links and words nobody should see in a name, a circle's name or a star.
create or replace function keep.bad_text(x text) returns boolean language sql immutable as $$
  select coalesce(x, '') ~* '(https?://|www\.|\.com|@)'
      or coalesce(x, '') ~* '\m(fuck|shit|bitch|cunt|dick|cock|pussy|nigg|fag|slut|whore|rape|kill|nazi|porn|sex)'
$$;

-- People whose names the moderator has blanked. Their names show as "A friend" from then on.
create table keep.muted (device uuid primary key, at timestamptz not null default now());

create or replace function keep.guard_name() returns trigger language plpgsql as $$
begin
  if keep.bad_text(new.name) or exists (select 1 from keep.muted where device = new.device) then new.name := 'A friend'; end if;
  return new;
end $$;
create trigger guard_name before insert or update of name on keep.circle_members for each row execute function keep.guard_name();
create trigger guard_name before insert or update of name on keep.match_plays for each row execute function keep.guard_name();
create trigger guard_name before insert or update of name on keep.daily_plays for each row execute function keep.guard_name();

create or replace function keep.guard_circle() returns trigger language plpgsql as $$
begin
  if keep.bad_text(new.name) then new.name := 'A circle'; end if;
  return new;
end $$;
create trigger guard_circle before insert or update of name on keep.circles for each row execute function keep.guard_circle();

update keep.circle_members set name = 'A friend' where keep.bad_text(name);
update keep.match_plays set name = 'A friend' where keep.bad_text(name);
update keep.daily_plays set name = 'A friend' where keep.bad_text(name);
update keep.circles set name = 'A circle' where keep.bad_text(name);

/* ---------------- stars: taken back after approval ---------------- */

-- hidden: three people reported it, waiting for a look. removed: the moderator took it down.
-- restored: a built-in star the moderator had removed and then put back.
alter table keep.submissions drop constraint submissions_status_check;
alter table keep.submissions add constraint submissions_status_check check (status in ('pending', 'approved', 'rejected', 'hidden', 'removed', 'restored'));
alter table keep.submissions alter column device drop not null;
alter table keep.submissions add column changed_at timestamptz;
update keep.submissions set changed_at = reviewed_at where reviewed_at is not null;
create index on keep.submissions (changed_at);
create index on keep.submissions (t);

-- Every change the phones need, oldest first: approved stars to add, hidden or removed ones to drop,
-- restored ones to bring back. Phones page through with the last changed_at they saw.
create or replace function public.community_changes(p_since timestamptz)
returns table (t text, k text, status text, changed_at timestamptz)
language sql stable security definer set search_path = keep, public as $$
  select t, k, status, changed_at from keep.submissions
  where changed_at > p_since and status in ('approved', 'hidden', 'removed', 'restored')
  order by changed_at limit 500
$$;

-- The board leaves out anything taken down, anything the filter catches, and anything fewer than ten phones saw.
create or replace function public.commons_board() returns jsonb
language sql stable security definer set search_path = keep, public as $$
  with w as (
    select t, min(k) k, count(distinct device) phones,
      count(*) filter (where created_at > now() - interval '7 days') shown,
      count(*) filter (where created_at > now() - interval '7 days' and kept) kept,
      count(*) filter (where created_at <= now() - interval '7 days') shown0,
      count(*) filter (where created_at <= now() - interval '7 days' and kept) kept0
    from keep.star_events where created_at > now() - interval '14 days' group by t
  ), r as (
    select t, k, shown, round(100.0 * kept / nullif(shown, 0), 1) pct,
      case when shown0 >= 30 and shown >= 30 then 100.0 * kept / shown - 100.0 * kept0 / shown0 end delta
    from w
    where phones >= 10 and not keep.bad_text(t)
      and t not in (select s.t from keep.submissions s where s.status in ('hidden', 'removed'))
  )
  select jsonb_build_object(
    'most', coalesce((select jsonb_agg(x) from (select t, k, pct, shown from r where shown >= 50 order by pct desc limit 10) x), '[]'),
    'rare', coalesce((select jsonb_agg(x) from (select t, k, pct, shown from r where shown >= 50 order by pct asc limit 10) x), '[]'),
    'rising', coalesce((select jsonb_agg(x) from (select t, k, pct, shown from r where delta > 0 order by delta desc limit 10) x), '[]')
  )
$$;

/* ---------------- reports and hiding people ---------------- */

create table keep.reports (
  id bigint generated always as identity primary key,
  device uuid not null,                                         -- who reported
  kind text not null check (kind in ('star', 'person', 'circle')),
  target text not null,                                         -- the star's text, the person's device, or the circle's code
  label text,                                                   -- what the reporter saw: the star, the name, the circle's name
  context text,                                                 -- the match or circle it happened in
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (device, kind, target)
);
create index on keep.reports (kind, target) where resolved_at is null;

-- Hiding is both ways: neither person sees the other's matches, skies or names again.
create table keep.blocks (device uuid not null, blocked uuid not null, created_at timestamptz not null default now(), primary key (device, blocked));
create index on keep.blocks (blocked);
create or replace function keep.blocked(a uuid, b uuid) returns boolean language sql stable as $$
  select exists (select 1 from keep.blocks where (device = a and blocked = b) or (device = b and blocked = a))
$$;

-- Removed from a circle by its owner. They can't rejoin with the code.
create table keep.circle_bans (code text not null references keep.circles(code) on delete cascade, device uuid not null, primary key (code, device));

-- The person behind something the caller can see: the other player in a match the caller is part of,
-- or a member (by mid) of a circle the caller belongs to.
create or replace function keep.person(p jsonb, d uuid) returns uuid language sql stable as $$
  select case
    when p ? 'match' then (
      select x.device from keep.match_plays x join keep.matches m on m.id = x.match_id
      where x.match_id = upper(p->>'match') and x.device <> d
        and (m.invitee = d or exists (select 1 from keep.match_plays y where y.match_id = x.match_id and y.device = d))
      order by x.played_at limit 1)
    when p ? 'mid' then (
      select m.device from keep.circle_members m
      where m.code = upper(p->>'code') and keep.mid(m.code, m.device) = p->>'mid'
        and exists (select 1 from keep.circle_members y where y.code = m.code and y.device = d))
  end
$$;

create or replace function public.hide_person(p jsonb) returns jsonb
language plpgsql security definer set search_path = keep, public as $$
declare
  d uuid := keep.uuid_or_null(p->>'device');
  who uuid := keep.person(p, d);
begin
  if d is null or who is null or who = d then return jsonb_build_object('ok', false); end if;
  insert into keep.blocks (device, blocked) values (d, who) on conflict do nothing;
  return jsonb_build_object('ok', true);
end $$;

-- A report: a star, a person (who is also hidden), or a circle's name.
-- Three different people reporting an approved star hides it from everyone until the moderator looks.
create or replace function public.report(p jsonb) returns jsonb
language plpgsql security definer set search_path = keep, public as $$
declare
  d uuid := keep.uuid_or_null(p->>'device');
  k text := p->>'kind';
  tgt text;
  lbl text;
  ctx text;
  who uuid;
begin
  if d is null or (select count(*) from keep.reports where device = d and created_at > now() - interval '1 day') >= 20 then
    return jsonb_build_object('ok', false);
  end if;
  if k = 'star' then
    tgt := nullif(left(btrim(coalesce(p->>'t', '')), 40), '');
    lbl := tgt;
  elsif k = 'person' then
    who := keep.person(p, d);
    if who is null or who = d then return jsonb_build_object('ok', false); end if;
    tgt := who::text;
    if p ? 'match' then
      ctx := 'match ' || upper(p->>'match');
      lbl := (select name from keep.match_plays where match_id = upper(p->>'match') and device = who);
    else
      ctx := 'circle ' || upper(p->>'code');
      lbl := (select name from keep.circle_members where code = upper(p->>'code') and device = who);
    end if;
    insert into keep.blocks (device, blocked) values (d, who) on conflict do nothing;
  elsif k = 'circle' then
    if not exists (select 1 from keep.circle_members where code = upper(p->>'code') and device = d) then return jsonb_build_object('ok', false); end if;
    tgt := upper(p->>'code');
    lbl := (select name from keep.circles where code = tgt);
  end if;
  if tgt is null then return jsonb_build_object('ok', false); end if;
  insert into keep.reports (device, kind, target, label, context) values (d, k, tgt, lbl, ctx)
  on conflict (device, kind, target) do nothing;
  if k = 'star' and (select count(*) from keep.reports where kind = 'star' and target = tgt and resolved_at is null) >= 3 then
    update keep.submissions set status = 'hidden', changed_at = now() where t = tgt and status = 'approved';
  end if;
  return jsonb_build_object('ok', true);
end $$;

/* ---------------- Match: hiding, rematch ---------------- */

-- As before, plus: nothing at all if the two players have hidden each other; who a rematch was sent to;
-- and a pid for the other player, stable for this viewer and meaningless to anyone else.
create or replace function keep.match_view(p_id text, p_device uuid) returns jsonb language sql stable as $$
  with m as (select * from keep.matches where id = p_id),
  me as (select * from keep.match_plays where match_id = p_id and device = p_device),
  them as (select * from keep.match_plays where match_id = p_id and device <> p_device order by played_at limit 1)
  select case
    when not exists (select 1 from m) then null
    when exists (select 1 from them where keep.blocked(p_device, them.device)) then null
    when exists (select 1 from m where m.invitee is not null and keep.blocked(p_device, m.invitee)) then null
    else jsonb_build_object(
      'id', (select id from m), 'seed', (select seed from m), 'deck', (select deck from m),
      'created_at', (select created_at from m), 'expires_at', (select expires_at from m),
      'expired', (select expires_at < now() from m),
      'to', (select (select x.name from keep.match_plays x where x.device = m.invitee order by x.played_at desc limit 1) from m where m.invitee is not null and m.created_by = p_device),
      'mine', (select jsonb_build_object('name', name, 'kept', kept, 'whys', whys, 'speed', speed, 'guesses', guesses, 'correct', correct) from me),
      'other', (select case when exists (select 1 from me)
                  then jsonb_build_object('name', name, 'pid', left(md5(p_device::text || device::text), 12), 'kept', kept, 'whys', whys, 'speed', speed, 'guessed', guesses is not null, 'correct', correct)
                  else jsonb_build_object('name', name, 'pid', left(md5(p_device::text || device::text), 12), 'speed', speed) end from them)
    ) end
$$;

-- Playing a match: not if the players have hidden each other, and a rematch only by the person it was sent to.
create or replace function public.play_match(p jsonb) returns jsonb
language plpgsql security definer set search_path = keep, public as $$
declare
  d uuid := keep.uuid_or_null(p->>'device');
  mid_ text := upper(p->>'id');
  m keep.matches;
begin
  select * into m from keep.matches where id = mid_;
  if d is null or m.id is null or m.expires_at < now() then return keep.match_view(mid_, d); end if;
  if keep.blocked(d, m.created_by) or (m.invitee is not null and d not in (m.invitee, m.created_by)) then return null; end if;
  if not exists (select 1 from keep.match_plays where match_id = mid_ and device = d)
     and (select count(*) from keep.match_plays where match_id = mid_) < 2 then
    insert into keep.match_plays (match_id, device, name, kept, whys, speed)
    values (mid_, d, keep.clean_name(p->>'name'), keep.texts(p->'kept', 5), left(coalesce(p->>'whys', ''), 5), nullif(p->>'speed', '')::real);
  end if;
  return keep.match_view(mid_, d);
end $$;

-- Your matches, plus rematches sent to you that you haven't played. Hidden people's matches drop out.
create or replace function public.my_matches(p_device text) returns jsonb
language sql stable security definer set search_path = keep, public as $$
  with me as (select keep.uuid_or_null(p_device) d),
  x as (
    select mp.match_id, mp.played_at at from keep.match_plays mp, me where mp.device = me.d
    union all
    select m.id, m.created_at from keep.matches m, me
    where m.invitee = me.d and m.expires_at > now()
      and not exists (select 1 from keep.match_plays y where y.match_id = m.id and y.device = me.d)
  ),
  v as (select keep.match_view(x.match_id, me.d) j, x.at from x, me order by x.at desc limit 100)
  select coalesce(jsonb_agg(j order by at desc), '[]') from v where j is not null
$$;

-- Play again with someone you've matched before, no link needed. It waits in their Match list.
create or replace function public.rematch(p jsonb) returns jsonb
language plpgsql security definer set search_path = keep, public as $$
declare
  d uuid := keep.uuid_or_null(p->>'device');
  old text := upper(p->>'id');
  other uuid;
  new_id text;
begin
  if d is null or jsonb_array_length(coalesce(p->'kept', '[]')) = 0
     or not exists (select 1 from keep.match_plays where match_id = old and device = d) then
    return null;
  end if;
  select device into other from keep.match_plays where match_id = old and device <> d limit 1;
  if other is null or keep.blocked(d, other) then return jsonb_build_object('error', 'unavailable'); end if;
  if (select count(*) from keep.matches where created_by = d and created_at > now() - interval '1 day') >= 30 then return jsonb_build_object('error', 'slow_down'); end if;
  loop
    new_id := keep.code(8);
    exit when not exists (select 1 from keep.matches where id = new_id);
  end loop;
  insert into keep.matches (id, seed, deck, created_by, invitee) values (new_id, (p->>'seed')::bigint, coalesce(left(p->>'deck', 20), 'everyday'), d, other);
  insert into keep.match_plays (match_id, device, name, kept, whys, speed)
  values (new_id, d, keep.clean_name(p->>'name'), keep.texts(p->'kept', 5), left(coalesce(p->>'whys', ''), 5), nullif(p->>'speed', '')::real);
  return keep.match_view(new_id, d);
end $$;

/* ---------------- Circles: hiding, owners, removal ---------------- */

create or replace function public.join_circle(p jsonb) returns jsonb
language plpgsql security definer set search_path = keep, public as $$
declare
  d uuid := keep.uuid_or_null(p->>'device');
  c text := upper(btrim(p->>'code'));
begin
  if d is null or not exists (select 1 from keep.circles where code = c)
     or exists (select 1 from keep.circle_bans where code = c and device = d) then
    return jsonb_build_object('error', 'not_found');
  end if;
  if not exists (select 1 from keep.circle_members where code = c and device = d) then
    if (select count(*) from keep.circle_members where code = c) >= 30 then return jsonb_build_object('error', 'full'); end if;
    if (select count(*) from keep.circle_members where device = d) >= 10 then return jsonb_build_object('error', 'too_many'); end if;
    insert into keep.circle_members (code, device, name) values (c, d, keep.clean_name(p->>'name'));
  else
    update keep.circle_members set name = keep.clean_name(p->>'name') where code = c and device = d and p->>'name' is not null;
  end if;
  return keep.circle_info(c, d);
end $$;

-- Leaving: if the owner leaves, the longest-standing member takes over; an empty circle is deleted.
create or replace function public.leave_circle(p jsonb) returns void
language plpgsql security definer set search_path = keep, public as $$
declare
  d uuid := keep.uuid_or_null(p->>'device');
  c text := upper(p->>'code');
begin
  delete from keep.circle_members where code = c and device = d;
  update keep.circles set created_by = (select device from keep.circle_members where code = c order by joined_at limit 1)
  where code = c and created_by = d and exists (select 1 from keep.circle_members where code = c);
  delete from keep.circles x where x.code = c and not exists (select 1 from keep.circle_members m where m.code = c);
end $$;

-- The circle's owner removes a member, who can't rejoin with the code.
create or replace function public.remove_member(p jsonb) returns jsonb
language plpgsql security definer set search_path = keep, public as $$
declare
  d uuid := keep.uuid_or_null(p->>'device');
  c text := upper(p->>'code');
  who uuid;
begin
  if not exists (select 1 from keep.circles where code = c and created_by = d) then return jsonb_build_object('ok', false); end if;
  select device into who from keep.circle_members where code = c and keep.mid(code, device) = p->>'mid';
  if who is null or who = d then return jsonb_build_object('ok', false); end if;
  delete from keep.circle_members where code = c and device = who;
  insert into keep.circle_bans (code, device) values (c, who) on conflict do nothing;
  return jsonb_build_object('ok', true);
end $$;

create or replace function keep.circle_info(p_code text, d uuid) returns jsonb language sql stable as $$
  select case when not exists (select 1 from keep.circle_members where code = p_code and device = d) then null else jsonb_build_object(
    'code', c.code, 'name', c.name, 'owner', c.created_by = d,
    'members', (select jsonb_agg(jsonb_build_object('mid', keep.mid(m.code, m.device), 'name', m.name, 'me', m.device = d, 'owner', m.device = c.created_by) order by m.joined_at)
                from keep.circle_members m where m.code = c.code and not keep.blocked(d, m.device))
  ) end
  from keep.circles c where c.code = p_code
$$;

-- One day in a circle, as before, without anyone the caller and they have hidden from each other.
create or replace function public.circle_day(p_code text, p_device text, p_day int) returns jsonb
language sql stable security definer set search_path = keep, public as $$
  with me as (select keep.uuid_or_null(p_device) d),
  ok as (select 1 from keep.circle_members, me where code = upper(p_code) and device = me.d),
  i_played as (select exists (select 1 from keep.daily_plays, me where day = p_day and device = me.d) v)
  select case when not exists (select 1 from ok) then null else jsonb_build_object(
    'played', (select v from i_played),
    'owner', (select c.created_by = me.d from keep.circles c, me where c.code = upper(p_code)),
    'members', (select jsonb_agg(jsonb_build_object(
        'mid', keep.mid(m.code, m.device), 'name', m.name, 'me', m.device = me.d, 'played', dp.device is not null,
        'owner', m.device = (select created_by from keep.circles where code = m.code),
        'kept', case when (select v from i_played) then dp.kept end,
        'whys', case when (select v from i_played) then dp.whys end,
        'speed', case when (select v from i_played) then dp.speed end,
        'myGuess', (select correct from keep.circle_guesses g where g.code = m.code and g.day = p_day and g.guesser = me.d and g.target = m.device)
      ) order by m.joined_at)
      from keep.circle_members m cross join me
      left join keep.daily_plays dp on dp.day = p_day and dp.device = m.device
      where m.code = upper(p_code) and not keep.blocked(me.d, m.device))
  ) end
$$;

create or replace function public.circle_guess(p jsonb) returns jsonb
language plpgsql security definer set search_path = keep, public as $$
declare
  d uuid := keep.uuid_or_null(p->>'device');
  c text := upper(p->>'code');
  dy int := (p->>'day')::int;
  t uuid;
  their text[];
  g text[] := keep.texts(p->'guesses', 3);
  n int;
begin
  if not exists (select 1 from keep.circle_members where code = c and device = d) then return null; end if;
  if not exists (select 1 from keep.daily_plays where day = dy and device = d) then return null; end if;
  select m.device into t from keep.circle_members m where m.code = c and keep.mid(m.code, m.device) = p->>'mid';
  if t is null or t = d or keep.blocked(d, t) then return null; end if;
  select kept into their from keep.daily_plays where day = dy and device = t;
  if their is null then return null; end if;
  n := (select count(*) from unnest(g) x where x = any(their));
  insert into keep.circle_guesses (code, day, guesser, target, guesses, correct) values (c, dy, d, t, g, n)
  on conflict do nothing;
  return jsonb_build_object('correct', (select correct from keep.circle_guesses where code = c and day = dy and guesser = d and target = t), 'kept', their);
end $$;

create or replace function public.circle_week(p_code text, p_device text, p_today int) returns jsonb
language sql stable security definer set search_path = keep, public as $$
  with me as (select keep.uuid_or_null(p_device) d),
  mem as (select m.* from keep.circle_members m, me where m.code = upper(p_code) and not keep.blocked(me.d, m.device)),
  days as (select dp.day from keep.daily_plays dp, me where dp.device = me.d and dp.day between p_today - 6 and p_today)
  select case when not exists (select 1 from mem, me where mem.device = me.d) then null else jsonb_build_object(
    'plays', coalesce((select jsonb_agg(jsonb_build_object('mid', keep.mid(mem.code, dp.device), 'day', dp.day, 'kept', dp.kept, 'whys', dp.whys, 'speed', dp.speed))
              from keep.daily_plays dp join mem on mem.device = dp.device where dp.day in (select day from days)), '[]'),
    'guesses', coalesce((select jsonb_agg(jsonb_build_object('by', keep.mid(g.code, g.guesser), 'of', keep.mid(g.code, g.target), 'day', g.day, 'correct', g.correct))
              from keep.circle_guesses g
              where g.code = upper(p_code) and g.day in (select day from days)
                and g.guesser in (select device from mem) and g.target in (select device from mem)), '[]')
  ) end
$$;

/* ---------------- forgetting a phone ---------------- */

-- Everything tied to this phone's id, everywhere. Stars already approved stay in everyone's sky,
-- with nothing linking them to anyone. A friend keeps their own side of a match you both played.
create or replace function public.forget_me(p jsonb) returns jsonb
language plpgsql security definer set search_path = keep, public as $$
declare
  d uuid := keep.uuid_or_null(p->>'device');
begin
  if d is null then return jsonb_build_object('ok', false); end if;
  delete from keep.star_events where device = d;
  delete from keep.round_calls where device = d;
  delete from keep.submissions where device = d and status in ('pending', 'rejected');
  update keep.submissions set device = null where device = d;
  delete from keep.match_plays where device = d;
  delete from keep.matches m where not exists (select 1 from keep.match_plays x where x.match_id = m.id);
  update keep.matches m set created_by = (select x.device from keep.match_plays x where x.match_id = m.id order by x.played_at limit 1) where m.created_by = d;
  update keep.matches set invitee = null where invitee = d;
  update keep.circles c set created_by = (select m.device from keep.circle_members m where m.code = c.code and m.device <> d order by m.joined_at limit 1)
  where c.created_by = d and exists (select 1 from keep.circle_members m where m.code = c.code and m.device <> d);
  delete from keep.circle_members where device = d;
  delete from keep.circles c where not exists (select 1 from keep.circle_members m where m.code = c.code);
  delete from keep.daily_plays where device = d;
  delete from keep.circle_guesses where guesser = d or target = d;
  delete from keep.reports where device = d or (kind = 'person' and target = d::text);
  delete from keep.blocks where device = d or blocked = d;
  delete from keep.circle_bans where device = d;
  delete from keep.muted where device = d;
  return jsonb_build_object('ok', true);
end $$;

/* ---------------- moderation (service role only) ---------------- */

create or replace function public.keep_admin_review(p_id bigint, p_status text) returns void
language plpgsql security definer set search_path = keep, public as $$
declare tx text;
begin
  if p_status not in ('approved', 'rejected', 'removed') then return; end if;
  update keep.submissions set status = p_status, reviewed_at = now(), changed_at = now() where id = p_id returning t into tx;
  if p_status = 'removed' then update keep.reports set resolved_at = now() where kind = 'star' and target = tx and resolved_at is null; end if;
end $$;

-- Open reports, grouped by what was reported, most-reported first.
create or replace function public.keep_admin_reports()
returns table (kind text, target text, label text, context text, reports bigint, latest timestamptz, status text)
language sql stable security definer set search_path = keep, public as $$
  select r.kind, r.target, max(r.label), max(r.context), count(*), max(r.created_at),
    case when r.kind = 'star' then coalesce((select s.status from keep.submissions s where s.t = r.target order by s.changed_at desc nulls last limit 1), 'built-in') end
  from keep.reports r where r.resolved_at is null
  group by r.kind, r.target order by count(*) desc, max(r.created_at) desc limit 200
$$;

-- What the moderator does with a report (or with any star by its text):
--   star: remove | keep        person: mute | dismiss        circle: rename | delete | dismiss
create or replace function public.keep_admin_act(p_kind text, p_target text, p_action text) returns void
language plpgsql security definer set search_path = keep, public as $$
begin
  if p_kind = 'star' and p_action = 'remove' then
    update keep.submissions set status = 'removed', changed_at = now() where t = p_target;
    if not found then
      -- A built-in star: a row marked deck 'library' carries the removal to the phones.
      insert into keep.submissions (device, t, k, deck, status, reviewed_at, changed_at)
      values (null, p_target, coalesce((select min(k) from keep.star_events where t = p_target), 'delight'), 'library', 'removed', now(), now());
    end if;
  elsif p_kind = 'star' and p_action = 'keep' then
    update keep.submissions set status = case when deck = 'library' then 'restored' else 'approved' end,
      changed_at = now(), reviewed_at = coalesce(reviewed_at, now())
    where t = p_target and status in ('hidden', 'removed');
  elsif p_kind = 'person' and p_action = 'mute' then
    insert into keep.muted (device) values (p_target::uuid) on conflict do nothing;
    update keep.circle_members set name = 'A friend' where device = p_target::uuid;
    update keep.match_plays set name = 'A friend' where device = p_target::uuid;
    update keep.daily_plays set name = 'A friend' where device = p_target::uuid;
  elsif p_kind = 'circle' and p_action = 'rename' then
    update keep.circles set name = 'A circle' where code = p_target;
  elsif p_kind = 'circle' and p_action = 'delete' then
    delete from keep.circles where code = p_target;
  end if;
  update keep.reports set resolved_at = now() where kind = p_kind and target = p_target and resolved_at is null;
end $$;

revoke all on function public.keep_admin_review(bigint, text), public.keep_admin_reports(), public.keep_admin_act(text, text, text) from public, anon, authenticated;
grant execute on function public.keep_admin_review(bigint, text), public.keep_admin_reports(), public.keep_admin_act(text, text, text) to service_role;

grant execute on function
  public.community_changes(timestamptz), public.hide_person(jsonb), public.report(jsonb), public.rematch(jsonb),
  public.remove_member(jsonb), public.forget_me(jsonb)
to anon, authenticated;
revoke all on function keep.person(jsonb, uuid), keep.blocked(uuid, uuid), keep.bad_text(text) from public, anon, authenticated;
