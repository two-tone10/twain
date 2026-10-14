-- Anyone holding a match link sees the sender's name, so they can hide or report the sender before playing.
-- Hiding only ever changes what the two of them see of each other.
create or replace function keep.person(p jsonb, d uuid) returns uuid language sql stable as $$
  select case
    when p ? 'match' then (
      select x.device from keep.match_plays x
      where x.match_id = upper(p->>'match') and x.device <> d
      order by x.played_at limit 1)
    when p ? 'mid' then (
      select m.device from keep.circle_members m
      where m.code = upper(p->>'code') and keep.mid(m.code, m.device) = p->>'mid'
        and exists (select 1 from keep.circle_members y where y.code = m.code and y.device = d))
  end
$$;
