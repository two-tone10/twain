-- Test data for the Keep commons: 100 fake devices.
-- Run against the project's database (SQL editor or psql). Safe to re-run: it clears its own rows first.
-- Fake devices all start with 00000000-0000-4000-8000-, so `delete from keep_star_events where device::text like '00000000-0000-4000-8000-%'` removes them.
--
-- Today (Keep day number, America/New_York): every device plays the daily (the same 21 stars), so daily_stats returns data.
-- The 13 days before: each device plays one drop a day from 42 moments, with some moments trending up, so commons_board fills most, rare and rising.

delete from public.keep_star_events where device::text like '00000000-0000-4000-8000-%';
delete from public.keep_board_cache;

with moments(i, t, k) as (values
    (0, 'A cannonball into a pool', 'delight'),
    (1, 'A cold drink on a hot day', 'delight'),
    (2, 'A hammock', 'delight'),
    (3, 'A hot shower after cold', 'delight'),
    (4, 'A hot tub', 'delight'),
    (5, 'A long bath', 'delight'),
    (6, 'A balcony at dawn', 'setting'),
    (7, 'A bench in the park', 'setting'),
    (8, 'A boat on calm water', 'setting'),
    (9, 'A cabin with no signal', 'setting'),
    (10, 'A café on a rainy day', 'setting'),
    (11, 'A campfire in the woods', 'setting'),
    (12, 'A band you’ve never heard', 'novelty'),
    (13, 'A book outside your usual', 'novelty'),
    (14, 'A city you’ve never seen', 'novelty'),
    (15, 'A class in something new', 'novelty'),
    (16, 'A cooking class', 'novelty'),
    (17, 'A country you’ve never seen', 'novelty'),
    (18, 'A bonfire with friends', 'company'),
    (19, 'A double date', 'company'),
    (20, 'A family hike', 'company'),
    (21, 'A late talk on the porch', 'company'),
    (22, 'A long phone call', 'company'),
    (23, 'A long walk with your partner', 'company'),
    (24, 'Bake a pie from scratch', 'skill'),
    (25, 'Bake the bread again', 'skill'),
    (26, 'Build a bookshelf', 'skill'),
    (27, 'Chess, one more game', 'skill'),
    (28, 'Climb a harder route', 'skill'),
    (29, 'Finish a big puzzle', 'skill'),
    (30, 'A classic novel', 'taste'),
    (31, 'A farm-to-table dinner', 'taste'),
    (32, 'A film you’ve rewatched', 'taste'),
    (33, 'A fine cheese plate', 'taste'),
    (34, 'A first-edition book', 'taste'),
    (35, 'A great bottle of wine', 'taste'),
    (36, 'Apply for the job', 'direction'),
    (37, 'Ask for more responsibility', 'direction'),
    (38, 'Build your portfolio', 'direction'),
    (39, 'Call your representative', 'direction'),
    (40, 'Clean up a park', 'direction'),
    (41, 'Coach a kids’ team', 'direction')
),
devices as (
  select n, ('00000000-0000-4000-8000-' || lpad(to_hex(n), 12, '0'))::uuid as device from generate_series(1, 100) n
),
today as (select ((now() at time zone 'America/New_York')::date - date '2026-10-01') + 1 as day),
-- Each moment has a base keep rate; odd ones rise over the fortnight, even ones fall a little.
rate as (select i, t, k, 0.12 + (i * 37 % 70) / 100.0 as base, case when i % 2 = 1 then 0.025 else -0.008 end as trend from moments)
insert into public.keep_star_events (device, mode, deck, day, t, k, kept, dwell, created_at)
select d.device, 'daily', 'everyday', today.day, r.t, r.k,
       random() < least(0.95, greatest(0.03, r.base + r.trend * 13)),
       round((0.6 + random() * 2.4)::numeric, 2)::real,
       now() - (random() * interval '3 hours')
from devices d, today, rate r
where r.i % 2 = 0
union all
select d.device, 'drop', 'everyday', null, r.t, r.k,
       random() < least(0.95, greatest(0.03, r.base + r.trend * (13 - g.ago))),
       null,
       now() - g.ago * interval '1 day' - interval '4 hours' - (random() * interval '6 hours')
from devices d
cross join generate_series(1, 13) as g(ago)
join rate r on (r.i + d.n + g.ago) % 2 = 0;

select (select count(distinct device) from public.keep_star_events where device::text like '00000000-0000-4000-8000-%') as fake_devices,
       (select count(*) from public.keep_star_events where device::text like '00000000-0000-4000-8000-%') as fake_events;
