-- Keep never asks for anything typed about a person. Names are star names picked from a list, circle names
-- are picked from a list, and stars players add stay on their phone. The server now enforces the same:
-- any other name reads "A friend" / "A circle", and the old free-text star submission is closed.
-- The lists match src/keep/names.mjs.

create or replace function keep.star_name(x text) returns boolean language sql immutable as $$
  select x = any(array['Vega', 'Lyra', 'Altair', 'Deneb', 'Rigel', 'Sirius', 'Capella', 'Arcturus', 'Spica', 'Antares', 'Polaris', 'Castor', 'Pollux', 'Mira', 'Electra', 'Maia', 'Alcyone', 'Merope', 'Atlas', 'Bellatrix', 'Betelgeuse', 'Aldebaran', 'Regulus', 'Procyon', 'Achernar', 'Canopus', 'Fomalhaut', 'Hadar', 'Mimosa', 'Shaula', 'Alnilam', 'Mintaka', 'Saiph', 'Alphard', 'Denebola', 'Algol', 'Mirach', 'Alpheratz', 'Hamal', 'Menkar', 'Elnath', 'Alhena', 'Wezen', 'Adhara', 'Naos', 'Avior', 'Peacock', 'Nunki', 'Kaus', 'Rasalhague', 'Sabik', 'Izar', 'Alkaid', 'Mizar', 'Alcor', 'Dubhe', 'Merak', 'Phecda', 'Thuban', 'Eltanin', 'Sadr', 'Albireo', 'Enif', 'Markab', 'Scheat', 'Ankaa', 'Diphda', 'Acrux', 'Gacrux', 'Atria'])
$$;

create or replace function keep.circle_name(x text) returns boolean language sql immutable as $$
  select x ~ '^The [A-Za-z]+ [A-Za-z]+$'
     and split_part(x, ' ', 2) = any(array['Quiet', 'Late', 'Bright', 'Slow', 'Far', 'Little', 'Wild', 'Gold', 'North', 'Small', 'Long', 'Silver'])
     and split_part(x, ' ', 3) = any(array['Harbor', 'Lanterns', 'Orchard', 'Porch', 'Comets', 'Kitchen', 'Meadow', 'Lighthouse', 'Table', 'Garden', 'Fireflies', 'Hours'])
$$;

create or replace function keep.guard_name() returns trigger language plpgsql as $$
begin
  if not keep.star_name(new.name) or exists (select 1 from keep.muted where device = new.device) then new.name := 'A friend'; end if;
  return new;
end $$;

create or replace function keep.guard_circle() returns trigger language plpgsql as $$
begin
  if not keep.circle_name(new.name) then new.name := 'A circle'; end if;
  return new;
end $$;

-- Names typed before this change.
update keep.circle_members set name = 'A friend' where not keep.star_name(name);
update keep.match_plays set name = 'A friend' where not keep.star_name(name);
update keep.daily_plays set name = 'A friend' where not keep.star_name(name);
update keep.circles set name = 'A circle' where not keep.circle_name(name);

-- No more stars typed by players reach the server. (Anything already waiting stays for the moderator to reject.)
revoke execute on function public.submit_star(jsonb) from anon, authenticated, public;
