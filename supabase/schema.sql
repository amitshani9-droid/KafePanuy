-- קפה פנוי — Supabase schema (free tier is enough).
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- Security model: the browser only has the public anon/publishable key, so the
-- tables are fully locked (RLS on, no policies). All reads and writes go through
-- the SECURITY DEFINER functions below, which validate input and rate-limit by an
-- anonymous device id. Nobody can edit or delete someone else's data.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.reports (
  id          bigint generated always as identity primary key,
  place_key   text        not null check (char_length(place_key) between 5 and 100),
  level       text        not null check (level in ('calm', 'moderate', 'busy')),
  device      text        not null check (char_length(device) between 8 and 64),
  created_at  timestamptz not null default now()
);
create index if not exists reports_place_time on public.reports (place_key, created_at desc);
create index if not exists reports_device_time on public.reports (device, created_at desc);

create table if not exists public.user_places (
  id            uuid        primary key default gen_random_uuid(),
  name          text        not null check (char_length(btrim(name)) between 2 and 60),
  kind          text        not null check (kind in ('cafe', 'cart')),
  lat           double precision not null check (lat between 29.3 and 33.5),
  lng           double precision not null check (lng between 34.2 and 35.95),
  opening_hours text        check (opening_hours is null or char_length(opening_hours) <= 200),
  device        text        not null,
  created_at    timestamptz not null default now()
);
create index if not exists user_places_geo on public.user_places (lat, lng);

alter table public.reports     enable row level security;
alter table public.user_places enable row level security;
-- No policies on purpose: direct table access is denied for anon/authenticated.
revoke all on public.reports, public.user_places from anon, authenticated;

-- The previous version used public.carts / crowd_reports / flash_deals with
-- wide-open policies. This version doesn't touch them; drop them yourself once
-- you no longer need that data.

-- ---------------------------------------------------------------------------
-- Writes
-- ---------------------------------------------------------------------------

-- Report how busy a place is. One report per device per place per 10 minutes —
-- a second report inside that window corrects the first instead of adding to it.
create or replace function public.submit_report(p_place_key text, p_level text, p_device text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recent_id bigint;
begin
  if p_level not in ('calm', 'moderate', 'busy') then raise exception 'bad level'; end if;
  if p_place_key !~ '^(osm:(node|way|relation)/[0-9]+|user:[0-9a-f-]{36})$' then raise exception 'bad place'; end if;
  if char_length(coalesce(p_device, '')) not between 8 and 64 then raise exception 'bad device'; end if;

  if (select count(*) from reports where device = p_device and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'rate limited';
  end if;

  select id into v_recent_id from reports
   where device = p_device and place_key = p_place_key and created_at > now() - interval '10 minutes'
   order by created_at desc limit 1;

  if v_recent_id is not null then
    update reports set level = p_level, created_at = now() where id = v_recent_id;
  else
    insert into reports (place_key, level, device) values (p_place_key, p_level, p_device);
  end if;
end;
$$;

-- Add a coffee cart / café that isn't on the map yet. Max 5 per device per day,
-- and not within 30 m of one that already exists.
create or replace function public.add_place(
  p_name text, p_kind text, p_lat double precision, p_lng double precision, p_device text,
  p_opening_hours text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if char_length(coalesce(p_device, '')) not between 8 and 64 then raise exception 'bad device'; end if;
  if (select count(*) from user_places where device = p_device and created_at > now() - interval '1 day') >= 5 then
    raise exception 'rate limited';
  end if;
  if exists (
    select 1 from user_places
     where abs(lat - p_lat) < 0.0003 and abs(lng - p_lng) < 0.0003
  ) then
    raise exception 'duplicate';
  end if;
  insert into user_places (name, kind, lat, lng, opening_hours, device)
  values (btrim(p_name), p_kind, p_lat, p_lng, nullif(btrim(p_opening_hours), ''), p_device)
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Reads (no device ids are ever returned)
-- ---------------------------------------------------------------------------

-- Reports from the last 45 minutes for the given places
create or replace function public.get_live_reports(p_keys text[])
returns table (place_key text, level text, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select r.place_key, r.level, r.created_at
    from reports r
   where r.place_key = any (p_keys[1:600])
     and r.created_at > now() - interval '45 minutes'
   order by r.created_at desc
   limit 3000;
$$;

-- Typical busyness learned from the last 120 days, per weekday (0 = Sunday) and
-- hour in Israel time. score is 0–100 (calm 15, moderate 55, busy 90).
create or replace function public.get_profiles(p_keys text[])
returns table (place_key text, dow int, hour int, score real, n int)
language sql
stable
security definer
set search_path = public
as $$
  select r.place_key,
         extract(dow  from r.created_at at time zone 'Asia/Jerusalem')::int as dow,
         extract(hour from r.created_at at time zone 'Asia/Jerusalem')::int as hour,
         avg(case r.level when 'calm' then 15 when 'moderate' then 55 else 90 end)::real as score,
         count(*)::int as n
    from reports r
   where r.place_key = any (p_keys[1:600])
     and r.created_at > now() - interval '120 days'
   group by 1, 2, 3;
$$;

create or replace function public.get_user_places(
  p_south double precision, p_west double precision, p_north double precision, p_east double precision
)
returns table (id uuid, name text, kind text, lat double precision, lng double precision, opening_hours text)
language sql
stable
security definer
set search_path = public
as $$
  select id, name, kind, lat, lng, opening_hours
    from user_places
   where lat between p_south and p_north and lng between p_west and p_east
   limit 500;
$$;

revoke all on function public.submit_report(text, text, text) from public;
revoke all on function public.add_place(text, text, double precision, double precision, text, text) from public;
revoke all on function public.get_live_reports(text[]) from public;
revoke all on function public.get_profiles(text[]) from public;
revoke all on function public.get_user_places(double precision, double precision, double precision, double precision) from public;

grant execute on function public.submit_report(text, text, text) to anon, authenticated;
grant execute on function public.add_place(text, text, double precision, double precision, text, text) to anon, authenticated;
grant execute on function public.get_live_reports(text[]) to anon, authenticated;
grant execute on function public.get_profiles(text[]) to anon, authenticated;
grant execute on function public.get_user_places(double precision, double precision, double precision, double precision) to anon, authenticated;
