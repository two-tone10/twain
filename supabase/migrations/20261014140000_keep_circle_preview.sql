-- What an invite shows before joining: the circle's name and how many are in it. Nothing about members.
create or replace function public.circle_preview(p_code text) returns jsonb
language sql stable security definer set search_path = keep, public as $$
  select jsonb_build_object('name', c.name, 'members', (select count(*) from keep.circle_members m where m.code = c.code))
  from keep.circles c where c.code = upper(p_code)
$$;
grant execute on function public.circle_preview(text) to anon, authenticated;
