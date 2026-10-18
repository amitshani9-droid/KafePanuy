-- ==============================================================================
-- קפה פנוי (Kafe Panuy) — Supabase PostgreSQL Schema
-- ==============================================================================
-- Run this script in the Supabase SQL Editor to set up all tables and RLS policies.
-- ==============================================================================

-- 1. CARTS TABLE
create table if not exists public.carts (
  id text primary key,
  name text not null,
  aliases text[] default '{}',
  area text not null,
  description text default '',
  lat double precision not null,
  lng double precision not null,
  region text not null check (region in ('sharon', 'north', 'center', 'south')),
  source text not null check (source in ('curated', 'osm', 'user')) default 'curated',
  opening_hours text not null default '',
  rating numeric(3,1) not null default 0,
  review_count integer not null default 0,
  status text not null check (status in ('calm', 'moderate', 'busy')) default 'calm',
  wait_minutes integer not null default 0,
  specialties text[] default '{}',
  tags text[] default '{}',
  last_updated timestamptz not null default now(),
  data_source text not null check (data_source in ('live', 'estimate')) default 'estimate',
  field_tags text[] default '{}',
  latest_tip text,
  owner_verified boolean default false,
  verified_gps boolean default false,
  owner_pin_hash text,
  created_at timestamptz not null default now()
);

-- Indexes for carts
create index if not exists idx_carts_region on public.carts(region);
create index if not exists idx_carts_status on public.carts(status);

-- 2. CROWD REPORTS TABLE
create table if not exists public.crowd_reports (
  id text primary key,
  cart_id text not null references public.carts(id) on delete cascade,
  status text not null check (status in ('calm', 'moderate', 'busy')),
  wait_minutes integer not null,
  field_tags text[] default '{}',
  note text,
  points_earned integer not null default 40,
  verified_gps boolean not null default false,
  created_at timestamptz not null default now()
);

-- Indexes for crowd reports
create index if not exists idx_crowd_reports_cart_id on public.crowd_reports(cart_id);
create index if not exists idx_crowd_reports_created_at on public.crowd_reports(created_at desc);

-- 3. FLASH DEALS TABLE
create table if not exists public.flash_deals (
  id uuid primary key default gen_random_uuid(),
  cart_id text not null references public.carts(id) on delete cascade,
  text text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Indexes for flash deals
create index if not exists idx_flash_deals_cart_id on public.flash_deals(cart_id);
create index if not exists idx_flash_deals_expires_at on public.flash_deals(expires_at);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

alter table public.carts enable row level security;
alter table public.crowd_reports enable row level security;
alter table public.flash_deals enable row level security;

-- CARTS POLICIES
-- Anyone can view all carts
create policy "Allow public read on carts"
  on public.carts for select
  using (true);

-- Anyone can insert new carts (OSM / user added)
create policy "Allow public insert on carts"
  on public.carts for insert
  with check (true);

-- Anyone can update crowd status and field details when reporting
create policy "Allow public crowd status updates on carts"
  on public.carts for update
  using (true)
  with check (true);

-- CROWD REPORTS POLICIES
-- Anyone can view recent reports
create policy "Allow public read on crowd_reports"
  on public.crowd_reports for select
  using (true);

-- Anyone can submit a report
create policy "Allow public insert on crowd_reports"
  on public.crowd_reports for insert
  with check (true);

-- FLASH DEALS POLICIES
-- Anyone can view active flash deals
create policy "Allow public read on flash_deals"
  on public.flash_deals for select
  using (true);

-- Anyone can start a flash deal (in demo mode)
create policy "Allow public insert on flash_deals"
  on public.flash_deals for insert
  with check (true);

-- Anyone can delete/end flash deals
create policy "Allow public delete on flash_deals"
  on public.flash_deals for delete
  using (true);
