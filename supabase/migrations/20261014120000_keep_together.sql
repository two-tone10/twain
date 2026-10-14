-- Keep together: Match (one friend, one drop) and Circles (a small group sharing the daily).
-- Nobody sees anyone else's sky until they've played the same stars themselves.
-- Device ids never leave the server; circle members are identified by a short hash (mid).

create table keep.matches (
  id text primary key,
  seed bigint not null,
  deck text not null default 'everyday',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days'
);
create index on keep.matches (created_by, created_at);

create table keep.match_plays (
  match_id text not null references keep.matches(id) on delete cascade,
  device uuid not null,
  name text not null,
  kept text[] not null,
  whys text not null,
  speed real,
  played_at timestamptz not null default now(),
  guesses text[],
  correct int,
  primary key (match_id, device)
);
create index on keep.match_plays (device, played_at);

create table keep.circles (
  code text primary key,
  name text not null,
  created_by uuid not null,
  created_at timestamptz not null default now()
);

create table keep.circle_members (
  code text not null references keep.circles(code) on delete cascade,
  device uuid not null,
  name text not null,
  joined_at timestamptz not null default now(),
  primary key (code, device)
);
create index on keep.circle_members (device);

create table keep.daily_plays (
  day int not null,
  device uuid not null,
  name text not null,
  kept text[] not null,
  whys text not null,
  speed real,
  played_at timestamptz not null default now(),
  primary key (day, device)
);

create table keep.circle_guesses (
  code text not null references keep.circles(code) on delete cascade,
  day int not null,
  guesser uuid not null,
  target uuid not null,
  guesses text[] not null,
  correct int not null,
  created_at timestamptz not null default now(),
  primary key (code, day, guesser, target)
);

-- helpers
create or replace function keep.code(n int) returns text language sql volatile as $$
  select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1), '') from generate_series(1, n)
$$;
create or replace function keep.uuid_or_null(x text) returns uuid language plpgsql immutable as $$
begin return x::uuid; exception when others then return null; end $$;
create or replace function keep.clean_name(x text) returns text language sql immutable as $$
  select coalesce(nullif(left(btrim(regexp_replace(coalesce(x, ''), '\s+', ' ', 'g')), 24), ''), 'A friend')
$$;
create or replace function keep.texts(x jsonb, n int) returns text[] language sql immutable as $$
  select coalesce(array(select left(v, 40) from jsonb_array_elements_text(coalesce(x, '[]'::jsonb)) v limit n), '{}')
$$;
create or replace function keep.mid(code text, d uuid) returns text language sql immutable as $$
  select left(md5(code || d::text), 10)
$$;

/* ---------------- Match ---------------- */

create or replace function keep.match_view(p_id text, p_device uuid) returns jsonb language sql stable as $$
  with m as (select * from keep.matches where id = p_id),
  me as (select * from keep.match_plays where match_id = p_id and device = p_device),
  them as (select * from keep.match_plays where match_id = p_id and device <> p_device order by played_at limit 1)
  select case when not exists (select 1 from m) then null else jsonb_build_object(
    'id', (select id from m), 'seed', (select seed from m), 'deck', (select deck from m),
    'created_at', (select created_at from m), 'expires_at', (select expires_at from m),
    'expired', (select expires_at < now() from m),
    'mine', (select jsonb_build_object('name', name, 'kept', kept, 'whys', whys, 'speed', speed, 'guesses', guesses, 'correct', correct) from me),
    'other', (select case when exists (select 1 from me)
                then jsonb_build_object('name', name, 'kept', kept, 'whys', whys, 'speed', speed, 'guessed', guesses is not null, 'correct', correct)
                else jsonb_build_object('name', name, 'speed', speed) end from them)
  ) end
$$;

create or replace function public.create_match(p jsonb) returns jsonb
language plpgsql security definer set search_path = keep, public as $$
declare
  d uuid := keep.uuid_or_null(p->>'device');
  new_id text;
begin
  if d is null or jsonb_array_length(coalesce(p->'kept', '[]')) = 0 then return null; end if;
  if (select count(*) from keep.matches where created_by = d and created_at > now() - interval '1 day') >= 30 then return jsonb_build_object('error', 'slow_down'); end if;
  loop
    new_id := keep.code(8);
    exit when not exists (select 1 from keep.matches where id = new_id);
  end loop;
  insert into keep.matches (id, seed, deck, created_by) values (new_id, (p->>'seed')::bigint, coalesce(left(p->>'deck', 20), 'everyday'), d);
  insert into keep.match_plays (match_id, device, name, kept, whys, speed)
  values (new_id, d, keep.clean_name(p->>'name'), keep.texts(p->'kept', 5), left(coalesce(p->>'whys', ''), 5), nullif(p->>'speed', '')::real);
  return keep.match_view(new_id, d);
end $$;

create or replace function public.get_match(p_id text, p_device text) returns jsonb
language sql stable security definer set search_path = keep, public as $$
  select keep.match_view(upper(p_id), keep.uuid_or_null(p_device))
$$;

create or replace function public.play_match(p jsonb) returns jsonb
language plpgsql security definer set search_path = keep, public as $$
declare
  d uuid := keep.uuid_or_null(p->>'device');
  mid_ text := upper(p->>'id');
begin
  if d is null or not exists (select 1 from keep.matches where id = mid_ and expires_at > now()) then return keep.match_view(mid_, d); end if;
  if not exists (select 1 from keep.match_plays where match_id = mid_ and device = d)
     and (select count(*) from keep.match_plays where match_id = mid_) < 2 then
    insert into keep.match_plays (match_id, device, name, kept, whys, speed)
    values (mid_, d, keep.clean_name(p->>'name'), keep.texts(p->'kept', 5), left(coalesce(p->>'whys', ''), 5), nullif(p->>'speed', '')::real);
  end if;
  return keep.match_view(mid_, d);
end $$;

create or replace function public.guess_match(p jsonb) returns jsonb
language plpgsql security definer set search_path = keep, public as $$
declare
  d uuid := keep.uuid_or_null(p->>'device');
  mid_ text := upper(p->>'id');
  g text[] := keep.texts(p->'guesses', 3);
  their text[];
begin
  select kept into their from keep.match_plays where match_id = mid_ and device <> d order by played_at limit 1;
  if d is null or their is null or not exists (select 1 from keep.match_plays where match_id = mid_ and device = d) then
    return keep.match_view(mid_, d);
  end if;
  update keep.match_plays set guesses = g, correct = (select count(*) from unnest(g) x where x = any(their))
  where match_id = mid_ and device = d and guesses is null;
  return keep.match_view(mid_, d);
end $$;

create or replace function public.my_matches(p_device text) returns jsonb
language sql stable security definer set search_path = keep, public as $$
  select coalesce(jsonb_agg(keep.match_view(match_id, device) order by played_at desc), '[]')
  from (select match_id, device, played_at from keep.match_plays where device = keep.uuid_or_null(p_device) order by played_at desc limit 100) x
$$;

/* ---------------- Circles ---------------- */

create or replace function keep.circle_info(p_code text, d uuid) returns jsonb language sql stable as $$
  select case when not exists (select 1 from keep.circle_members where code = p_code and device = d) then null else jsonb_build_object(
    'code', c.code, 'name', c.name,
    'members', (select jsonb_agg(jsonb_build_object('mid', keep.mid(m.code, m.device), 'name', m.name, 'me', m.device = d) order by m.joined_at)
                from keep.circle_members m where m.code = c.code)
  ) end
  from keep.circles c where c.code = p_code
$$;

create or replace function public.create_circle(p jsonb) returns jsonb
language plpgsql security definer set search_path = keep, public as $$
declare
  d uuid := keep.uuid_or_null(p->>'device');
  c text;
begin
  if d is null then return null; end if;
  if (select count(*) from keep.circle_members where device = d) >= 10 then return jsonb_build_object('error', 'too_many'); end if;
  loop
    c := keep.code(6);
    exit when not exists (select 1 from keep.circles where code = c);
  end loop;
  insert into keep.circles (code, name, created_by) values (c, coalesce(nullif(left(btrim(p->>'circle_name'), 30), ''), 'My circle'), d);
  insert into keep.circle_members (code, device, name) values (c, d, keep.clean_name(p->>'name'));
  return keep.circle_info(c, d);
end $$;

create or replace function public.join_circle(p jsonb) returns jsonb
language plpgsql security definer set search_path = keep, public as $$
declare
  d uuid := keep.uuid_or_null(p->>'device');
  c text := upper(btrim(p->>'code'));
begin
  if d is null or not exists (select 1 from keep.circles where code = c) then return jsonb_build_object('error', 'not_found'); end if;
  if not exists (select 1 from keep.circle_members where code = c and device = d) then
    if (select count(*) from keep.circle_members where code = c) >= 30 then return jsonb_build_object('error', 'full'); end if;
    if (select count(*) from keep.circle_members where device = d) >= 10 then return jsonb_build_object('error', 'too_many'); end if;
    insert into keep.circle_members (code, device, name) values (c, d, keep.clean_name(p->>'name'));
  else
    update keep.circle_members set name = keep.clean_name(p->>'name') where code = c and device = d and p->>'name' is not null;
  end if;
  return keep.circle_info(c, d);
end $$;

create or replace function public.leave_circle(p jsonb) returns void
language sql security definer set search_path = keep, public as $$
  delete from keep.circle_members where code = upper(p->>'code') and device = keep.uuid_or_null(p->>'device')
$$;

create or replace function public.my_circles(p_device text) returns jsonb
language sql stable security definer set search_path = keep, public as $$
  select coalesce(jsonb_agg(jsonb_build_object('code', c.code, 'name', c.name,
    'members', (select count(*) from keep.circle_members x where x.code = c.code)) order by m.joined_at), '[]')
  from keep.circle_members m join keep.circles c on c.code = m.code
  where m.device = keep.uuid_or_null(p_device)
$$;

-- Every finished daily drop, so circles can see it once their own members have played.
create or replace function public.log_daily(p jsonb) returns void
language sql security definer set search_path = keep, public as $$
  insert into keep.daily_plays (day, device, name, kept, whys, speed)
  select (p->>'day')::int, keep.uuid_or_null(p->>'device'), keep.clean_name(p->>'name'), keep.texts(p->'kept', 5), left(coalesce(p->>'whys', ''), 5), nullif(p->>'speed', '')::real
  where keep.uuid_or_null(p->>'device') is not null and (p->>'day') ~ '^\d+$'
  on conflict (day, device) do nothing
$$;

-- One day in a circle. Skies show only if the caller has played that day.
create or replace function public.circle_day(p_code text, p_device text, p_day int) returns jsonb
language sql stable security definer set search_path = keep, public as $$
  with me as (select keep.uuid_or_null(p_device) d),
  ok as (select 1 from keep.circle_members, me where code = upper(p_code) and device = me.d),
  i_played as (select exists (select 1 from keep.daily_plays, me where day = p_day and device = me.d) v)
  select case when not exists (select 1 from ok) then null else jsonb_build_object(
    'played', (select v from i_played),
    'members', (select jsonb_agg(jsonb_build_object(
        'mid', keep.mid(m.code, m.device), 'name', m.name, 'me', m.device = me.d, 'played', dp.device is not null,
        'kept', case when (select v from i_played) then dp.kept end,
        'whys', case when (select v from i_played) then dp.whys end,
        'speed', case when (select v from i_played) then dp.speed end,
        'myGuess', (select correct from keep.circle_guesses g where g.code = m.code and g.day = p_day and g.guesser = me.d and g.target = m.device)
      ) order by m.joined_at)
      from keep.circle_members m cross join me
      left join keep.daily_plays dp on dp.day = p_day and dp.device = m.device
      where m.code = upper(p_code))
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
  select kept into their from keep.daily_plays where day = dy and device = t;
  if t is null or their is null or t = d then return null; end if;
  n := (select count(*) from unnest(g) x where x = any(their));
  insert into keep.circle_guesses (code, day, guesser, target, guesses, correct) values (c, dy, d, t, g, n)
  on conflict do nothing;
  return jsonb_build_object('correct', (select correct from keep.circle_guesses where code = c and day = dy and guesser = d and target = t), 'kept', their);
end $$;

-- The last week of a circle, limited to days the caller played. The app works out the awards.
create or replace function public.circle_week(p_code text, p_device text, p_today int) returns jsonb
language sql stable security definer set search_path = keep, public as $$
  with me as (select keep.uuid_or_null(p_device) d),
  mem as (select m.* from keep.circle_members m, me where m.code = upper(p_code)),
  days as (select dp.day from keep.daily_plays dp, me where dp.device = me.d and dp.day between p_today - 6 and p_today)
  select case when not exists (select 1 from mem, me where mem.device = me.d) then null else jsonb_build_object(
    'plays', coalesce((select jsonb_agg(jsonb_build_object('mid', keep.mid(mem.code, dp.device), 'day', dp.day, 'kept', dp.kept, 'whys', dp.whys, 'speed', dp.speed))
              from keep.daily_plays dp join mem on mem.device = dp.device where dp.day in (select day from days)), '[]'),
    'guesses', coalesce((select jsonb_agg(jsonb_build_object('by', keep.mid(g.code, g.guesser), 'of', keep.mid(g.code, g.target), 'day', g.day, 'correct', g.correct))
              from keep.circle_guesses g where g.code = upper(p_code) and g.day in (select day from days)), '[]')
  ) end
$$;

grant execute on function
  public.create_match(jsonb), public.get_match(text, text), public.play_match(jsonb), public.guess_match(jsonb), public.my_matches(text),
  public.create_circle(jsonb), public.join_circle(jsonb), public.leave_circle(jsonb), public.my_circles(text),
  public.log_daily(jsonb), public.circle_day(text, text, int), public.circle_guess(jsonb), public.circle_week(text, text, int)
to anon, authenticated;
