-- Lootonia MASTER_MIGRATION.sql
-- Tum migration dosyalarinin birlesik hali

-- ====================================================================
-- FILE: 001_real_init.sql
-- ====================================================================

-- Lootonia / Ankara
-- Phase 1.1 - Core init scaffold
--
-- Amaç:
--   Mevcut frontend kodunun beklediği çekirdek tablo / view / yardımcı function katmanını
--   sıfırdan Supabase kurulumunda ayağa kaldırmak.
--
-- Kapsam:
--   - dkd_profiles
--   - dkd_admin_users
--   - dkd_drops
--   - dkd_user_drops
--   - dkd_card_defs
--   - dkd_loot_entries
--   - dkd_user_cards
--   - dkd_chest_history
--   - dkd_market_listings
--   - dkd_market_listings_view
--   - dkd_chest_logs (compatibility view)
--   - dkd_is_admin()
--
-- Bilinçli olarak dahil edilmedi:
--   - Sandık açma / boss / market satın alma / shard / task / leaderboard RPC'leri
--   - Push / broadcast sistemi
--   - Edge functions
--
-- Not:
--   Bu dosya, repo kodunu ayağa kaldırmak için "minimum çalışır çekirdek şema" iskeletidir.
--   Üretim ekonomisi ve tüm oyun mantığı için sonraki migration'lar gerekir.

create extension if not exists pgcrypto;

create or replace function public.dkd_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.dkd_admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role_key text not null default 'admin',
  created_at timestamptz not null default now()
);

create or replace function public.dkd_is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.dkd_admin_users dkd_alias_a
    where dkd_alias_a.user_id = auth.uid()
  );
$$;

revoke all on function public.dkd_is_admin() from public;
grant execute on function public.dkd_is_admin() to authenticated;

create table if not exists public.dkd_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text,
  avatar_emoji text,
  token integer not null default 0,
  shards integer not null default 0,
  boss_tickets integer not null default 0,
  energy integer not null default 20,
  energy_max integer not null default 20,
  energy_updated_at timestamptz not null default now(),
  task_state jsonb not null default '{}'::jsonb,
  boss_state jsonb not null default '{}'::jsonb,
  weekly_task_state jsonb not null default '{}'::jsonb,
  xp integer not null default 0,
  level integer not null default 1,
  rank_key text not null default 'rookie',
  courier_status text not null default 'none',
  courier_score integer not null default 0,
  courier_completed_jobs integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dkd_profiles_token_nonneg check (token >= 0),
  constraint dkd_profiles_shards_nonneg check (shards >= 0),
  constraint dkd_profiles_boss_tickets_nonneg check (boss_tickets >= 0),
  constraint dkd_profiles_energy_nonneg check (energy >= 0),
  constraint dkd_profiles_energy_max_min check (energy_max >= 0),
  constraint dkd_profiles_level_min check (level >= 1),
  constraint dkd_profiles_xp_nonneg check (xp >= 0),
  constraint dkd_profiles_courier_score_nonneg check (courier_score >= 0),
  constraint dkd_profiles_courier_jobs_nonneg check (courier_completed_jobs >= 0)
);

create index if not exists idx_dkd_profiles_level on public.dkd_profiles(level desc);
create index if not exists idx_dkd_profiles_rank_key on public.dkd_profiles(rank_key);
create index if not exists idx_dkd_profiles_courier_status on public.dkd_profiles(courier_status);

create trigger dkd_trg_profiles_updated_at
before update on public.dkd_profiles
for each row
execute function public.dkd_touch_updated_at();

create table if not exists public.dkd_drops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'map',
  lat numeric(10,7),
  lng numeric(10,7),
  radius_m integer not null default 60,
  cooldown_seconds integer not null default 900,
  is_active boolean not null default true,
  qr_secret text,
  manual_code text,
  manual_code_expires_at timestamptz,
  manual_code_issued_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dkd_drops_radius_positive check (radius_m >= 0),
  constraint dkd_drops_cooldown_nonneg check (cooldown_seconds >= 0)
);

alter table public.dkd_drops add column if not exists name text;
alter table public.dkd_drops add column if not exists type text;
alter table public.dkd_drops add column if not exists lat numeric(10,7);
alter table public.dkd_drops add column if not exists lng numeric(10,7);
alter table public.dkd_drops add column if not exists radius_m integer;
alter table public.dkd_drops add column if not exists cooldown_seconds integer;
alter table public.dkd_drops add column if not exists is_active boolean;
alter table public.dkd_drops add column if not exists qr_secret text;
alter table public.dkd_drops add column if not exists manual_code text;
alter table public.dkd_drops add column if not exists manual_code_expires_at timestamptz;
alter table public.dkd_drops add column if not exists manual_code_issued_at timestamptz;
alter table public.dkd_drops add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.dkd_drops add column if not exists created_at timestamptz;
alter table public.dkd_drops add column if not exists updated_at timestamptz;

alter table public.dkd_drops alter column type set default 'map';
alter table public.dkd_drops alter column radius_m set default 60;
alter table public.dkd_drops alter column cooldown_seconds set default 900;
alter table public.dkd_drops alter column is_active set default true;
alter table public.dkd_drops alter column created_at set default now();
alter table public.dkd_drops alter column updated_at set default now();

update public.dkd_drops set type = coalesce(type, 'map');
update public.dkd_drops set radius_m = coalesce(radius_m, 60);
update public.dkd_drops set cooldown_seconds = coalesce(cooldown_seconds, 900);
update public.dkd_drops set is_active = coalesce(is_active, true);
update public.dkd_drops set created_at = coalesce(created_at, now());
update public.dkd_drops set updated_at = coalesce(updated_at, now());

create index if not exists idx_dkd_drops_active on public.dkd_drops(is_active);
create index if not exists idx_dkd_drops_type on public.dkd_drops(type);
create unique index if not exists idx_dkd_drops_manual_code_unique on public.dkd_drops(manual_code) where manual_code is not null;

create trigger dkd_trg_drops_updated_at
before update on public.dkd_drops
for each row
execute function public.dkd_touch_updated_at();

create table if not exists public.dkd_user_drops (
  user_id uuid not null references auth.users(id) on delete cascade,
  drop_id uuid not null references public.dkd_drops(id) on delete cascade,
  last_opened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, drop_id)
);

create index if not exists idx_dkd_user_drops_last_opened_at on public.dkd_user_drops(last_opened_at desc);

create trigger dkd_trg_user_drops_updated_at
before update on public.dkd_user_drops
for each row
execute function public.dkd_touch_updated_at();

create table if not exists public.dkd_card_defs (
  id bigserial primary key,
  name text not null,
  series text not null,
  rarity text not null,
  theme text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_dkd_card_defs_unique_name_series on public.dkd_card_defs(lower(name), lower(series));
create index if not exists idx_dkd_card_defs_rarity on public.dkd_card_defs(rarity);
create index if not exists idx_dkd_card_defs_theme on public.dkd_card_defs(theme);
create index if not exists idx_dkd_card_defs_series on public.dkd_card_defs(series);

create trigger dkd_trg_card_defs_updated_at
before update on public.dkd_card_defs
for each row
execute function public.dkd_touch_updated_at();

create table if not exists public.dkd_loot_entries (
  id bigserial primary key,
  drop_type text not null,
  rarity text not null,
  weight integer not null default 100,
  card_def_id bigint not null references public.dkd_card_defs(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dkd_loot_entries_weight_positive check (weight > 0)
);

create unique index if not exists idx_dkd_loot_entries_unique on public.dkd_loot_entries(drop_type, rarity, card_def_id);
create index if not exists idx_dkd_loot_entries_lookup on public.dkd_loot_entries(drop_type, rarity, is_active);

create trigger dkd_trg_loot_entries_updated_at
before update on public.dkd_loot_entries
for each row
execute function public.dkd_touch_updated_at();

create table if not exists public.dkd_user_cards (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  card_def_id bigint not null references public.dkd_card_defs(id) on delete restrict,
  source text not null default 'chest',
  created_at timestamptz not null default now()
);

create index if not exists idx_dkd_user_cards_user on public.dkd_user_cards(user_id, created_at desc);
create index if not exists idx_dkd_user_cards_card_def on public.dkd_user_cards(card_def_id);

create table if not exists public.dkd_chest_history (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  drop_id uuid references public.dkd_drops(id) on delete set null,
  drop_type text not null default 'qr',
  gained_token integer not null default 0,
  card_def_id bigint references public.dkd_card_defs(id) on delete set null,
  token_mult numeric(6,2),
  created_at timestamptz not null default now(),
  constraint dkd_chest_history_token_nonneg check (gained_token >= 0)
);

create index if not exists idx_dkd_chest_history_user_created on public.dkd_chest_history(user_id, created_at desc);
create index if not exists idx_dkd_chest_history_drop on public.dkd_chest_history(drop_id);
create index if not exists idx_dkd_chest_history_drop_type on public.dkd_chest_history(drop_type);

create table if not exists public.dkd_market_listings (
  id bigserial primary key,
  seller_id uuid not null references auth.users(id) on delete cascade,
  user_card_id bigint not null unique references public.dkd_user_cards(id) on delete cascade,
  price_token integer not null,
  status text not null default 'active',
  buyer_id uuid references auth.users(id) on delete set null,
  fee_token integer not null default 0,
  sold_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dkd_market_listings_price_positive check (price_token > 0),
  constraint dkd_market_listings_fee_nonneg check (fee_token >= 0)
);

create index if not exists idx_dkd_market_listings_status_created on public.dkd_market_listings(status, created_at desc);
create index if not exists idx_dkd_market_listings_seller on public.dkd_market_listings(seller_id, created_at desc);

create trigger dkd_trg_market_listings_updated_at
before update on public.dkd_market_listings
for each row
execute function public.dkd_touch_updated_at();

create or replace view public.dkd_market_listings_view
with (security_invoker = true)
as
select
  ml.id,
  ml.seller_id,
  ml.user_card_id,
  ml.price_token,
  ml.status,
  ml.created_at,
  cd.name as card_name,
  cd.series as card_series,
  cd.rarity as card_rarity,
  cd.theme as card_theme
from public.dkd_market_listings ml
join public.dkd_user_cards uc on uc.id = ml.user_card_id
join public.dkd_card_defs cd on cd.id = uc.card_def_id;

create or replace view public.dkd_chest_logs
with (security_invoker = true)
as
select
  dkd_alias_h.id,
  dkd_alias_h.user_id,
  dkd_alias_h.drop_id,
  dkd_alias_h.drop_type,
  dkd_alias_h.gained_token,
  dkd_alias_h.card_def_id,
  dkd_alias_h.token_mult,
  dkd_alias_h.created_at
from public.dkd_chest_history dkd_alias_h;

grant select on public.dkd_market_listings_view to authenticated;
grant select on public.dkd_chest_logs to authenticated;

alter table public.dkd_admin_users enable row level security;
alter table public.dkd_profiles enable row level security;
alter table public.dkd_drops enable row level security;
alter table public.dkd_user_drops enable row level security;
alter table public.dkd_card_defs enable row level security;
alter table public.dkd_loot_entries enable row level security;
alter table public.dkd_user_cards enable row level security;
alter table public.dkd_chest_history enable row level security;
alter table public.dkd_market_listings enable row level security;

drop policy if exists dkd_admin_users_select_self on public.dkd_admin_users;
create policy dkd_admin_users_select_self
on public.dkd_admin_users
for select
using (auth.uid() = user_id or public.dkd_is_admin());

drop policy if exists dkd_profiles_select_own on public.dkd_profiles;
create policy dkd_profiles_select_own
on public.dkd_profiles
for select
using (auth.uid() = user_id or public.dkd_is_admin());

drop policy if exists dkd_profiles_insert_own on public.dkd_profiles;
create policy dkd_profiles_insert_own
on public.dkd_profiles
for insert
with check (auth.uid() = user_id or public.dkd_is_admin());

drop policy if exists dkd_profiles_update_own on public.dkd_profiles;
create policy dkd_profiles_update_own
on public.dkd_profiles
for update
using (auth.uid() = user_id or public.dkd_is_admin())
with check (auth.uid() = user_id or public.dkd_is_admin());

drop policy if exists dkd_drops_select_active_or_admin on public.dkd_drops;
create policy dkd_drops_select_active_or_admin
on public.dkd_drops
for select
using (is_active = true or public.dkd_is_admin());

drop policy if exists dkd_drops_insert_admin on public.dkd_drops;
create policy dkd_drops_insert_admin
on public.dkd_drops
for insert
with check (public.dkd_is_admin());

drop policy if exists dkd_drops_update_admin on public.dkd_drops;
create policy dkd_drops_update_admin
on public.dkd_drops
for update
using (public.dkd_is_admin())
with check (public.dkd_is_admin());

drop policy if exists dkd_drops_delete_admin on public.dkd_drops;
create policy dkd_drops_delete_admin
on public.dkd_drops
for delete
using (public.dkd_is_admin());

drop policy if exists dkd_user_drops_select_own on public.dkd_user_drops;
create policy dkd_user_drops_select_own
on public.dkd_user_drops
for select
using (auth.uid() = user_id or public.dkd_is_admin());

drop policy if exists dkd_user_drops_insert_own on public.dkd_user_drops;
create policy dkd_user_drops_insert_own
on public.dkd_user_drops
for insert
with check (auth.uid() = user_id or public.dkd_is_admin());

drop policy if exists dkd_user_drops_update_own on public.dkd_user_drops;
create policy dkd_user_drops_update_own
on public.dkd_user_drops
for update
using (auth.uid() = user_id or public.dkd_is_admin())
with check (auth.uid() = user_id or public.dkd_is_admin());

drop policy if exists dkd_card_defs_select_authenticated on public.dkd_card_defs;
create policy dkd_card_defs_select_authenticated
on public.dkd_card_defs
for select
using (auth.role() = 'authenticated');

drop policy if exists dkd_card_defs_write_admin on public.dkd_card_defs;
create policy dkd_card_defs_write_admin
on public.dkd_card_defs
for all
using (public.dkd_is_admin())
with check (public.dkd_is_admin());

drop policy if exists dkd_loot_entries_select_authenticated on public.dkd_loot_entries;
create policy dkd_loot_entries_select_authenticated
on public.dkd_loot_entries
for select
using (auth.role() = 'authenticated');

drop policy if exists dkd_loot_entries_write_admin on public.dkd_loot_entries;
create policy dkd_loot_entries_write_admin
on public.dkd_loot_entries
for all
using (public.dkd_is_admin())
with check (public.dkd_is_admin());

drop policy if exists dkd_user_cards_select_own_or_market on public.dkd_user_cards;
create policy dkd_user_cards_select_own_or_market
on public.dkd_user_cards
for select
using (
  auth.uid() = user_id
  or public.dkd_is_admin()
  or exists (
    select 1
    from public.dkd_market_listings ml
    where ml.user_card_id = dkd_user_cards.id
      and ml.status = 'active'
  )
);

drop policy if exists dkd_user_cards_insert_own on public.dkd_user_cards;
create policy dkd_user_cards_insert_own
on public.dkd_user_cards
for insert
with check (auth.uid() = user_id or public.dkd_is_admin());

drop policy if exists dkd_user_cards_update_own on public.dkd_user_cards;
create policy dkd_user_cards_update_own
on public.dkd_user_cards
for update
using (auth.uid() = user_id or public.dkd_is_admin())
with check (auth.uid() = user_id or public.dkd_is_admin());

drop policy if exists dkd_user_cards_delete_own on public.dkd_user_cards;
create policy dkd_user_cards_delete_own
on public.dkd_user_cards
for delete
using (auth.uid() = user_id or public.dkd_is_admin());

drop policy if exists dkd_chest_history_select_own on public.dkd_chest_history;
create policy dkd_chest_history_select_own
on public.dkd_chest_history
for select
using (auth.uid() = user_id or public.dkd_is_admin());

drop policy if exists dkd_chest_history_insert_own on public.dkd_chest_history;
create policy dkd_chest_history_insert_own
on public.dkd_chest_history
for insert
with check (auth.uid() = user_id or public.dkd_is_admin());

drop policy if exists dkd_market_listings_select_active_or_own on public.dkd_market_listings;
create policy dkd_market_listings_select_active_or_own
on public.dkd_market_listings
for select
using (
  status = 'active'
  or seller_id = auth.uid()
  or buyer_id = auth.uid()
  or public.dkd_is_admin()
);

drop policy if exists dkd_market_listings_insert_own on public.dkd_market_listings;
create policy dkd_market_listings_insert_own
on public.dkd_market_listings
for insert
with check (seller_id = auth.uid() or public.dkd_is_admin());

drop policy if exists dkd_market_listings_update_own on public.dkd_market_listings;
create policy dkd_market_listings_update_own
on public.dkd_market_listings
for update
using (seller_id = auth.uid() or public.dkd_is_admin())
with check (seller_id = auth.uid() or public.dkd_is_admin());

comment on table public.dkd_profiles is 'Lootonia oyuncu ana profil tablosu';
comment on table public.dkd_drops is 'Harita / QR / boss drop noktaları';
comment on table public.dkd_user_drops is 'Kullanıcı bazlı cooldown kaydı';
comment on table public.dkd_card_defs is 'Kart tanımları';
comment on table public.dkd_loot_entries is 'Drop türüne göre loot ağırlıkları';
comment on table public.dkd_user_cards is 'Kullanıcının sahip olduğu kartlar';
comment on table public.dkd_chest_history is 'Açılan sandık geçmişi';
comment on table public.dkd_market_listings is 'Pazar aktif / satılmış / iptal ilanları';

-- İlk admin ekleme örneği (Supabase SQL Editor'da elle çalıştır):
-- insert into public.dkd_admin_users (user_id) values ('AUTH_USER_UUID_HERE') on conflict do nothing;

-- ====================================================================
-- FILE: 002_cards_loot_chests_market_base.sql
-- ====================================================================

-- 002_cards_loot_chests_market_base.sql
-- Lootonia core content schema: cards, loot, chests, market base

create extension if not exists pgcrypto;

create table if not exists public.dkd_card_defs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  series text not null default 'GENERAL',
  rarity text not null default 'common',
  theme text not null default 'core',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.dkd_card_defs add column if not exists name text;
alter table public.dkd_card_defs add column if not exists series text not null default 'GENERAL';
alter table public.dkd_card_defs add column if not exists rarity text not null default 'common';
alter table public.dkd_card_defs add column if not exists theme text not null default 'core';
alter table public.dkd_card_defs add column if not exists is_active boolean not null default true;
alter table public.dkd_card_defs add column if not exists created_at timestamptz not null default now();

alter table public.dkd_card_defs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'dkd_card_defs'
      and policyname = 'dkd_card_defs_select_all'
  ) then
    create policy dkd_card_defs_select_all
    on public.dkd_card_defs
    for select
    to authenticated
    using (true);
  end if;
end $$;

create table if not exists public.dkd_loot_entries (
  id bigint generated by default as identity primary key,
  drop_type text not null default 'all',
  rarity text not null default 'common',
  weight numeric not null default 1,
  card_def_id uuid not null references public.dkd_card_defs(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.dkd_loot_entries add column if not exists drop_type text not null default 'all';
alter table public.dkd_loot_entries add column if not exists rarity text not null default 'common';
alter table public.dkd_loot_entries add column if not exists weight numeric not null default 1;
alter table public.dkd_loot_entries add column if not exists card_def_id uuid;
alter table public.dkd_loot_entries add column if not exists created_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.dkd_loot_entries'::regclass
      and conname = 'dkd_loot_entries_card_def_id_fkey'
  ) then
    alter table public.dkd_loot_entries
      add constraint dkd_loot_entries_card_def_id_fkey
      foreign key (card_def_id)
      references public.dkd_card_defs(id)
      on delete cascade;
  end if;
end $$;

alter table public.dkd_loot_entries enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'dkd_loot_entries'
      and policyname = 'dkd_loot_entries_select_all'
  ) then
    create policy dkd_loot_entries_select_all
    on public.dkd_loot_entries
    for select
    to authenticated
    using (true);
  end if;
end $$;

create table if not exists public.dkd_user_cards (
  id bigint generated by default as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  card_def_id uuid not null references public.dkd_card_defs(id) on delete restrict,
  source text not null default 'chest',
  created_at timestamptz not null default now()
);

alter table public.dkd_user_cards add column if not exists user_id uuid;
alter table public.dkd_user_cards add column if not exists card_def_id uuid;
alter table public.dkd_user_cards add column if not exists source text not null default 'chest';
alter table public.dkd_user_cards add column if not exists created_at timestamptz not null default now();

create index if not exists idx_dkd_user_cards_user_id on public.dkd_user_cards(user_id);
create index if not exists idx_dkd_user_cards_card_def_id on public.dkd_user_cards(card_def_id);

alter table public.dkd_user_cards enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'dkd_user_cards'
      and policyname = 'dkd_user_cards_select_own'
  ) then
    create policy dkd_user_cards_select_own
    on public.dkd_user_cards
    for select
    to authenticated
    using (auth.uid() = user_id or public.dkd_is_admin());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'dkd_user_cards'
      and policyname = 'dkd_user_cards_insert_own'
  ) then
    create policy dkd_user_cards_insert_own
    on public.dkd_user_cards
    for insert
    to authenticated
    with check (auth.uid() = user_id or public.dkd_is_admin());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'dkd_user_cards'
      and policyname = 'dkd_user_cards_update_own'
  ) then
    create policy dkd_user_cards_update_own
    on public.dkd_user_cards
    for update
    to authenticated
    using (auth.uid() = user_id or public.dkd_is_admin())
    with check (auth.uid() = user_id or public.dkd_is_admin());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'dkd_user_cards'
      and policyname = 'dkd_user_cards_delete_own'
  ) then
    create policy dkd_user_cards_delete_own
    on public.dkd_user_cards
    for delete
    to authenticated
    using (auth.uid() = user_id or public.dkd_is_admin());
  end if;
end $$;

create table if not exists public.dkd_chest_logs (
  id bigint generated by default as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  drop_id uuid null references public.dkd_drops(id) on delete set null,
  card_def_id uuid null references public.dkd_card_defs(id) on delete set null,
  gained_token integer not null default 0,
  gained_shards integer not null default 0,
  gained_energy integer not null default 0,
  gained_boss_tickets integer not null default 0,
  drop_type text not null default 'map',
  created_at timestamptz not null default now()
);

alter table public.dkd_chest_logs add column if not exists user_id uuid;
alter table public.dkd_chest_logs add column if not exists drop_id uuid;
alter table public.dkd_chest_logs add column if not exists card_def_id uuid;
alter table public.dkd_chest_logs add column if not exists gained_token integer not null default 0;
alter table public.dkd_chest_logs add column if not exists gained_shards integer not null default 0;
alter table public.dkd_chest_logs add column if not exists gained_energy integer not null default 0;
alter table public.dkd_chest_logs add column if not exists gained_boss_tickets integer not null default 0;
alter table public.dkd_chest_logs add column if not exists drop_type text not null default 'map';
alter table public.dkd_chest_logs add column if not exists created_at timestamptz not null default now();

create index if not exists idx_dkd_chest_logs_user_id on public.dkd_chest_logs(user_id);
create index if not exists idx_dkd_chest_logs_created_at on public.dkd_chest_logs(created_at);

alter table public.dkd_chest_logs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'dkd_chest_logs'
      and policyname = 'dkd_chest_logs_select_own'
  ) then
    create policy dkd_chest_logs_select_own
    on public.dkd_chest_logs
    for select
    to authenticated
    using (auth.uid() = user_id or public.dkd_is_admin());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'dkd_chest_logs'
      and policyname = 'dkd_chest_logs_insert_own'
  ) then
    create policy dkd_chest_logs_insert_own
    on public.dkd_chest_logs
    for insert
    to authenticated
    with check (auth.uid() = user_id or public.dkd_is_admin());
  end if;
end $$;

drop view if exists public.dkd_chest_history;
create view public.dkd_chest_history as
select
  dkd_alias_l.id,
  dkd_alias_l.user_id,
  dkd_alias_l.drop_id,
  dkd_alias_l.card_def_id,
  dkd_alias_l.gained_token,
  dkd_alias_l.gained_shards,
  dkd_alias_l.gained_energy,
  dkd_alias_l.gained_boss_tickets,
  dkd_alias_l.drop_type,
  dkd_alias_l.created_at
from public.dkd_chest_logs dkd_alias_l;

grant select on public.dkd_chest_history to authenticated;

create table if not exists public.dkd_market_listings (
  id bigint generated by default as identity primary key,
  seller_id uuid not null references auth.users(id) on delete cascade,
  user_card_id bigint not null references public.dkd_user_cards(id) on delete cascade,
  card_def_id uuid not null references public.dkd_card_defs(id) on delete restrict,
  price_token integer not null,
  status text not null default 'active',
  buyer_id uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dkd_market_listings add column if not exists seller_id uuid;
alter table public.dkd_market_listings add column if not exists user_card_id bigint;
alter table public.dkd_market_listings add column if not exists card_def_id uuid;
alter table public.dkd_market_listings add column if not exists price_token integer;
alter table public.dkd_market_listings add column if not exists status text not null default 'active';
alter table public.dkd_market_listings add column if not exists buyer_id uuid;
alter table public.dkd_market_listings add column if not exists created_at timestamptz not null default now();
alter table public.dkd_market_listings add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_dkd_market_listings_status on public.dkd_market_listings(status);
create index if not exists idx_dkd_market_listings_seller_id on public.dkd_market_listings(seller_id);
create unique index if not exists idx_dkd_market_active_user_card
on public.dkd_market_listings(user_card_id)
where status = 'active';

drop trigger if exists dkd_market_listings_touch_updated_at on public.dkd_market_listings;
create trigger dkd_market_listings_touch_updated_at
before update on public.dkd_market_listings
for each row
execute function public.dkd_touch_updated_at();

alter table public.dkd_market_listings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'dkd_market_listings'
      and policyname = 'dkd_market_listings_select_visible'
  ) then
    create policy dkd_market_listings_select_visible
    on public.dkd_market_listings
    for select
    to authenticated
    using (
      status = 'active'
      or auth.uid() = seller_id
      or auth.uid() = buyer_id
      or public.dkd_is_admin()
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'dkd_market_listings'
      and policyname = 'dkd_market_listings_insert_own'
  ) then
    create policy dkd_market_listings_insert_own
    on public.dkd_market_listings
    for insert
    to authenticated
    with check (auth.uid() = seller_id or public.dkd_is_admin());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'dkd_market_listings'
      and policyname = 'dkd_market_listings_update_own'
  ) then
    create policy dkd_market_listings_update_own
    on public.dkd_market_listings
    for update
    to authenticated
    using (auth.uid() = seller_id or public.dkd_is_admin())
    with check (auth.uid() = seller_id or public.dkd_is_admin());
  end if;
end $$;

drop view if exists public.dkd_market_listings_view;
create view public.dkd_market_listings_view as
select
  m.id,
  m.seller_id,
  m.user_card_id,
  m.card_def_id,
  m.price_token,
  m.status,
  m.buyer_id,
  m.created_at,
  dkd_alias_c.name as card_name,
  dkd_alias_c.series as card_series,
  dkd_alias_c.rarity as card_rarity,
  dkd_alias_c.theme as card_theme
from public.dkd_market_listings m
join public.dkd_card_defs dkd_alias_c on dkd_alias_c.id = m.card_def_id;

grant select on public.dkd_market_listings_view to authenticated;

create or replace function public.dkd_issue_drop_code(dkd_param_drop_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_code text;
  dkd_var_expires_at timestamptz;
begin
  if not public.dkd_is_admin() then
    raise exception 'admin_required';
  end if;

  dkd_var_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  dkd_var_expires_at := now() + interval '12 hours';

  update public.dkd_drops
  set
    current_code = dkd_var_code,
    current_code_expires_at = dkd_var_expires_at,
    updated_at = now()
  where id = dkd_param_drop_id;

  if not found then
    raise exception 'drop_not_found';
  end if;

  return jsonb_build_object(
    'ok', true,
    'drop_id', dkd_param_drop_id,
    'code', dkd_var_code,
    'expires_at', dkd_var_expires_at
  );
end;
$$;

revoke all on function public.dkd_issue_drop_code(uuid) from public;
grant execute on function public.dkd_issue_drop_code(uuid) to authenticated;

-- ====================================================================
-- FILE: 003_rpc_chests_and_market.sql
-- ====================================================================

-- 003_rpc_chests_and_market.sql
-- Lootonia sandik acma ve market RPC'leri

create or replace function public.dkd_distance_m(
  dkd_param_lat1 double precision,
  dkd_param_lng1 double precision,
  dkd_param_lat2 double precision,
  dkd_param_lng2 double precision
)
returns numeric
language sql
immutable
as $$
  select
    6371000 * 2 * asin(
      sqrt(
        power(sin(radians((dkd_param_lat2 - dkd_param_lat1) / 2)), 2) +
        cos(radians(dkd_param_lat1)) * cos(radians(dkd_param_lat2)) *
        power(sin(radians((dkd_param_lng2 - dkd_param_lng1) / 2)), 2)
      )
    )
$$;

create or replace function public.dkd_pick_card(
  dkd_param_drop_type text default 'all',
  dkd_param_prefer_rarity text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_id uuid;
  dkd_var_name text;
  dkd_var_series text;
  dkd_var_rarity text;
  dkd_var_theme text;
begin
  select
    dkd_alias_c.id,
    dkd_alias_c.name,
    dkd_alias_c.series,
    dkd_alias_c.rarity,
    dkd_alias_c.theme
  into
    dkd_var_id,
    dkd_var_name,
    dkd_var_series,
    dkd_var_rarity,
    dkd_var_theme
  from public.dkd_loot_entries le
  join public.dkd_card_defs dkd_alias_c
    on dkd_alias_c.id = le.card_def_id
  where coalesce(dkd_alias_c.is_active, true) = true
    and (
      lower(coalesce(le.drop_type, 'all')) = 'all'
      or lower(coalesce(le.drop_type, 'all')) = lower(coalesce(dkd_param_drop_type, 'all'))
    )
    and (
      dkd_param_prefer_rarity is null
      or lower(coalesce(dkd_alias_c.rarity, 'common')) = lower(dkd_param_prefer_rarity)
      or lower(coalesce(le.rarity, 'common')) = lower(dkd_param_prefer_rarity)
    )
  order by greatest(coalesce(le.weight, 1), 0.01) * (0.35 + random()) desc, random()
  limit 1;

  if dkd_var_id is null then
    select
      dkd_alias_c.id,
      dkd_alias_c.name,
      dkd_alias_c.series,
      dkd_alias_c.rarity,
      dkd_alias_c.theme
    into
      dkd_var_id,
      dkd_var_name,
      dkd_var_series,
      dkd_var_rarity,
      dkd_var_theme
    from public.dkd_card_defs dkd_alias_c
    where coalesce(dkd_alias_c.is_active, true) = true
      and (
        dkd_param_prefer_rarity is null
        or lower(coalesce(dkd_alias_c.rarity, 'common')) = lower(dkd_param_prefer_rarity)
      )
    order by random()
    limit 1;
  end if;

  return jsonb_build_object(
    'card_def_id', dkd_var_id,
    'name', dkd_var_name,
    'series', dkd_var_series,
    'rarity', dkd_var_rarity,
    'theme', dkd_var_theme
  );
end;
$$;

create or replace function public.dkd_open_chest_core(
  dkd_param_drop_id uuid,
  dkd_param_ignore_qr boolean default false,
  dkd_param_qr_secret text default null,
  dkd_param_lat double precision default null,
  dkd_param_lng double precision default null,
  dkd_param_prefer_rarity text default null,
  dkd_param_bonus_token integer default 0,
  dkd_param_bonus_energy integer default 0,
  dkd_param_token_mult numeric default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_user_id uuid;
  dkd_var_drop public.dkd_drops%rowtype;
  dkd_var_last_opened timestamptz;
  dkd_var_next_open_at timestamptz;
  dkd_var_distance numeric;
  dkd_var_pick jsonb;
  dkd_var_card_def_id uuid;
  dkd_var_token integer;
  dkd_var_energy_gain integer;
begin
  dkd_var_user_id := auth.uid();

  if dkd_var_user_id is null then
    raise exception 'auth_required';
  end if;

  select *
  into dkd_var_drop
  from public.dkd_drops
  where id = dkd_param_drop_id
    and is_active = true
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'drop_not_found');
  end if;

  if not dkd_param_ignore_qr
     and lower(coalesce(dkd_var_drop.type, 'map')) = 'qr'
     and coalesce(nullif(dkd_var_drop.qr_secret, ''), '') <> coalesce(nullif(dkd_param_qr_secret, ''), '')
  then
    return jsonb_build_object('ok', false, 'reason', 'invalid_qr');
  end if;

  if dkd_param_lat is not null and dkd_param_lng is not null and dkd_var_drop.lat is not null and dkd_var_drop.lng is not null then
    dkd_var_distance := public.dkd_distance_m(dkd_param_lat, dkd_param_lng, dkd_var_drop.lat, dkd_var_drop.lng);
    if dkd_var_distance > greatest(coalesce(dkd_var_drop.radius_m, 60), 1) then
      return jsonb_build_object(
        'ok', false,
        'reason', 'too_far',
        'distance_m', round(dkd_var_distance),
        'radius_m', dkd_var_drop.radius_m
      );
    end if;
  end if;

  select ud.last_opened_at
  into dkd_var_last_opened
  from public.dkd_user_drops ud
  where ud.user_id = dkd_var_user_id
    and ud.drop_id = dkd_var_drop.id
  limit 1;

  if dkd_var_last_opened is not null then
    dkd_var_next_open_at := dkd_var_last_opened + make_interval(secs => greatest(coalesce(dkd_var_drop.cooldown_seconds, 900), 0));
    if dkd_var_next_open_at > now() then
      return jsonb_build_object(
        'ok', false,
        'reason', 'cooldown',
        'next_open_at', dkd_var_next_open_at
      );
    end if;
  end if;

  insert into public.dkd_profiles (user_id)
  values (dkd_var_user_id)
  on conflict (user_id) do nothing;

  dkd_var_pick := public.dkd_pick_card(dkd_var_drop.type, dkd_param_prefer_rarity);
  dkd_var_card_def_id := nullif(dkd_var_pick->>'card_def_id', '')::uuid;

  dkd_var_token :=
    greatest(
      (
        case lower(coalesce(dkd_var_drop.type, 'map'))
          when 'qr' then 18 + floor(random() * 14)::int
          when 'boss' then 55 + floor(random() * 26)::int
          else 12 + floor(random() * 11)::int
        end
      ),
      1
    );

  dkd_var_token := greatest(((dkd_var_token * greatest(coalesce(dkd_param_token_mult, 1), 0.10))::numeric)::int + greatest(coalesce(dkd_param_bonus_token, 0), 0), 1);
  dkd_var_energy_gain := greatest(coalesce(dkd_param_bonus_energy, 0), 0);

  update public.dkd_profiles
  set
    token = coalesce(token, 0) + dkd_var_token,
    energy = least(coalesce(energy_max, 100), coalesce(energy, 0) + dkd_var_energy_gain),
    updated_at = now()
  where user_id = dkd_var_user_id;

  if dkd_var_card_def_id is not null then
    insert into public.dkd_user_cards (user_id, card_def_id, source)
    values (dkd_var_user_id, dkd_var_card_def_id, 'chest_' || lower(coalesce(dkd_var_drop.type, 'map')));
  end if;

  insert into public.dkd_user_drops (user_id, drop_id, last_opened_at)
  values (dkd_var_user_id, dkd_var_drop.id, now())
  on conflict (user_id, drop_id) do update
  set last_opened_at = excluded.last_opened_at;

  insert into public.dkd_chest_logs (
    user_id,
    drop_id,
    card_def_id,
    gained_token,
    gained_shards,
    gained_energy,
    gained_boss_tickets,
    drop_type
  )
  values (
    dkd_var_user_id,
    dkd_var_drop.id,
    dkd_var_card_def_id,
    dkd_var_token,
    0,
    dkd_var_energy_gain,
    0,
    lower(coalesce(dkd_var_drop.type, 'map'))
  );

  return jsonb_build_object(
    'ok', true,
    'drop_id', dkd_var_drop.id,
    'drop_type', lower(coalesce(dkd_var_drop.type, 'map')),
    'token', dkd_var_token,
    'token_mult', dkd_param_token_mult,
    'gained_energy', dkd_var_energy_gain,
    'card_def_id', dkd_var_card_def_id
  );
end;
$$;

create or replace function public.dkd_open_chest_secure(
  dkd_param_drop_id uuid,
  dkd_param_qr_secret text default null,
  dkd_param_lat double precision default null,
  dkd_param_lng double precision default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.dkd_open_chest_core(
    dkd_param_drop_id,
    false,
    dkd_param_qr_secret,
    dkd_param_lat,
    dkd_param_lng,
    null,
    0,
    0,
    1
  );
end;
$$;

revoke all on function public.dkd_open_chest_secure(uuid, text, double precision, double precision) from public;
grant execute on function public.dkd_open_chest_secure(uuid, text, double precision, double precision) to authenticated;

create or replace function public.dkd_open_chest_by_code(dkd_param_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_drop_id uuid;
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;

  select d.id
  into dkd_var_drop_id
  from public.dkd_drops d
  where upper(coalesce(d.current_code, '')) = upper(coalesce(trim(dkd_param_code), ''))
    and d.is_active = true
    and (d.current_code_expires_at is null or d.current_code_expires_at > now())
  limit 1;

  if dkd_var_drop_id is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_code');
  end if;

  return public.dkd_open_chest_core(
    dkd_var_drop_id,
    true,
    null,
    null,
    null,
    null,
    0,
    0,
    1
  );
end;
$$;

revoke all on function public.dkd_open_chest_by_code(text) from public;
grant execute on function public.dkd_open_chest_by_code(text) to authenticated;

create or replace function public.dkd_open_boss_chest_secure(
  dkd_param_drop_id uuid,
  dkd_param_tier integer default 1,
  dkd_param_correct integer default 0,
  dkd_param_total integer default 0,
  dkd_param_lat double precision default null,
  dkd_param_lng double precision default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_drop_type text;
  dkd_var_prefer_rarity text;
  dkd_var_mult numeric;
  dkd_var_bonus_token integer;
  dkd_var_bonus_energy integer;
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;

  select lower(coalesce(type, 'map'))
  into dkd_var_drop_type
  from public.dkd_drops
  where id = dkd_param_drop_id
    and is_active = true
  limit 1;

  if dkd_var_drop_type is null then
    return jsonb_build_object('ok', false, 'reason', 'drop_not_found');
  end if;

  if dkd_var_drop_type <> 'boss' then
    return jsonb_build_object('ok', false, 'reason', 'not_boss_drop');
  end if;

  dkd_var_prefer_rarity :=
    case
      when coalesce(dkd_param_tier, 1) >= 3 then 'legendary'
      when coalesce(dkd_param_tier, 1) = 2 then 'epic'
      else 'rare'
    end;

  dkd_var_mult :=
    case
      when coalesce(dkd_param_tier, 1) >= 3 then 3.2
      when coalesce(dkd_param_tier, 1) = 2 then 2.5
      else 1.9
    end;

  dkd_var_bonus_token := greatest(coalesce(dkd_param_correct, 0), 0) * 4;
  dkd_var_bonus_energy := least(greatest(coalesce(dkd_param_total, 0), 0), 12);

  return public.dkd_open_chest_core(
    dkd_param_drop_id,
    true,
    null,
    dkd_param_lat,
    dkd_param_lng,
    dkd_var_prefer_rarity,
    dkd_var_bonus_token,
    dkd_var_bonus_energy,
    dkd_var_mult
  );
end;
$$;

revoke all on function public.dkd_open_boss_chest_secure(uuid, integer, integer, integer, double precision, double precision) from public;
grant execute on function public.dkd_open_boss_chest_secure(uuid, integer, integer, integer, double precision, double precision) to authenticated;

create or replace function public.dkd_market_list_card(
  dkd_param_user_card_id bigint,
  dkd_param_price_token integer
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_user_id uuid;
  dkd_var_card_def_id uuid;
  dkd_var_listing_id bigint;
begin
  dkd_var_user_id := auth.uid();

  if dkd_var_user_id is null then
    raise exception 'auth_required';
  end if;

  if coalesce(dkd_param_price_token, 0) < 1 then
    raise exception 'invalid_price';
  end if;

  select uc.card_def_id
  into dkd_var_card_def_id
  from public.dkd_user_cards uc
  where uc.id = dkd_param_user_card_id
    and uc.user_id = dkd_var_user_id
  limit 1;

  if dkd_var_card_def_id is null then
    raise exception 'card_not_owned';
  end if;

  if exists (
    select 1
    from public.dkd_market_listings ml
    where ml.user_card_id = dkd_param_user_card_id
      and ml.status = 'active'
  ) then
    raise exception 'already_listed';
  end if;

  insert into public.dkd_market_listings
    (seller_id, user_card_id, card_def_id, price_token, status)
  values
    (dkd_var_user_id, dkd_param_user_card_id, dkd_var_card_def_id, dkd_param_price_token, 'active')
  returning id into dkd_var_listing_id;

  return dkd_var_listing_id;
end;
$$;

revoke all on function public.dkd_market_list_card(bigint, integer) from public;
grant execute on function public.dkd_market_list_card(bigint, integer) to authenticated;

create or replace function public.dkd_market_cancel(dkd_param_listing_id bigint)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_user_id uuid;
begin
  dkd_var_user_id := auth.uid();

  if dkd_var_user_id is null then
    raise exception 'auth_required';
  end if;

  update public.dkd_market_listings
  set
    status = 'cancelled',
    updated_at = now()
  where id = dkd_param_listing_id
    and status = 'active'
    and (
      seller_id = dkd_var_user_id
      or public.dkd_is_admin()
    );

  if not found then
    raise exception 'listing_not_found';
  end if;

  return dkd_param_listing_id;
end;
$$;

revoke all on function public.dkd_market_cancel(bigint) from public;
grant execute on function public.dkd_market_cancel(bigint) to authenticated;

create or replace function public.dkd_market_buy(dkd_param_listing_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_user_id uuid;
  dkd_var_seller_id uuid;
  dkd_var_user_card_id bigint;
  dkd_var_price integer;
  dkd_var_status text;
  dkd_var_fee integer;
  dkd_var_seller_gain integer;
  dkd_var_buyer_token integer;
begin
  dkd_var_user_id := auth.uid();

  if dkd_var_user_id is null then
    raise exception 'auth_required';
  end if;

  insert into public.dkd_profiles (user_id)
  values (dkd_var_user_id)
  on conflict (user_id) do nothing;

  select
    ml.seller_id,
    ml.user_card_id,
    ml.price_token,
    ml.status
  into
    dkd_var_seller_id,
    dkd_var_user_card_id,
    dkd_var_price,
    dkd_var_status
  from public.dkd_market_listings ml
  where ml.id = dkd_param_listing_id
  for update;

  if dkd_var_seller_id is null then
    return jsonb_build_object('ok', false, 'reason', 'listing_not_found');
  end if;

  if coalesce(dkd_var_status, '') <> 'active' then
    return jsonb_build_object('ok', false, 'reason', 'listing_not_active');
  end if;

  if dkd_var_seller_id = dkd_var_user_id then
    return jsonb_build_object('ok', false, 'reason', 'own_listing');
  end if;

  select coalesce(dkd_alias_p.token, 0)
  into dkd_var_buyer_token
  from public.dkd_profiles dkd_alias_p
  where dkd_alias_p.user_id = dkd_var_user_id
  limit 1;

  if coalesce(dkd_var_buyer_token, 0) < coalesce(dkd_var_price, 0) then
    return jsonb_build_object('ok', false, 'reason', 'insufficient_token');
  end if;

  dkd_var_fee := greatest(floor(coalesce(dkd_var_price, 0) * 0.10)::int, 1);
  dkd_var_seller_gain := greatest(coalesce(dkd_var_price, 0) - dkd_var_fee, 0);

  insert into public.dkd_profiles (user_id)
  values (dkd_var_seller_id)
  on conflict (user_id) do nothing;

  update public.dkd_profiles
  set
    token = coalesce(token, 0) - dkd_var_price,
    updated_at = now()
  where user_id = dkd_var_user_id;

  update public.dkd_profiles
  set
    token = coalesce(token, 0) + dkd_var_seller_gain,
    updated_at = now()
  where user_id = dkd_var_seller_id;

  update public.dkd_user_cards
  set
    user_id = dkd_var_user_id,
    source = 'market'
  where id = dkd_var_user_card_id;

  update public.dkd_market_listings
  set
    status = 'sold',
    buyer_id = dkd_var_user_id,
    updated_at = now()
  where id = dkd_param_listing_id;

  return jsonb_build_object(
    'ok', true,
    'price', dkd_var_price,
    'fee', dkd_var_fee,
    'seller_gain', dkd_var_seller_gain
  );
end;
$$;

revoke all on function public.dkd_market_buy(bigint) from public;
grant execute on function public.dkd_market_buy(bigint) to authenticated;

-- ====================================================================
-- FILE: 004_rpc_shards_and_crafting.sql
-- ====================================================================

-- 004_rpc_shards_and_crafting.sql
-- Lootonia shard, craft, upgrade ve boss ticket RPC'leri

create or replace function public.dkd_shard_value(dkd_param_rarity text)
returns integer
language sql
immutable
as $$
  select case lower(coalesce(dkd_param_rarity, 'common'))
    when 'common' then 5
    when 'uncommon' then 8
    when 'rare' then 12
    when 'epic' then 25
    when 'legendary' then 60
    when 'mythic' then 120
    else 5
  end
$$;

create or replace function public.dkd_recycle_duplicates_all()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_user_id uuid;
  dkd_var_recycled_cards integer := 0;
  dkd_var_gained_shards integer := 0;
begin
  dkd_var_user_id := auth.uid();
  if dkd_var_user_id is null then
    raise exception 'auth_required';
  end if;

  insert into public.dkd_profiles (user_id)
  values (dkd_var_user_id)
  on conflict (user_id) do nothing;

  with ranked as (
    select
      uc.id,
      uc.card_def_id,
      row_number() over (
        partition by uc.card_def_id
        order by uc.created_at asc, uc.id asc
      ) as rn
    from public.dkd_user_cards uc
    where uc.user_id = dkd_var_user_id
  ),
  dupes as (
    select
      dkd_alias_r.id,
      public.dkd_shard_value(dkd_alias_c.rarity) as shard_gain
    from ranked dkd_alias_r
    left join public.dkd_card_defs dkd_alias_c
      on dkd_alias_c.id = dkd_alias_r.card_def_id
    where dkd_alias_r.rn > 1
  )
  select
    coalesce(count(*), 0)::int,
    coalesce(sum(shard_gain), 0)::int
  into
    dkd_var_recycled_cards,
    dkd_var_gained_shards
  from dupes;

  if coalesce(dkd_var_recycled_cards, 0) <= 0 then
    return jsonb_build_object(
      'ok', false,
      'reason', 'duplicate_not_found'
    );
  end if;

  delete from public.dkd_user_cards
  where id in (
    with ranked as (
      select
        uc.id,
        row_number() over (
          partition by uc.card_def_id
          order by uc.created_at asc, uc.id asc
        ) as rn
      from public.dkd_user_cards uc
      where uc.user_id = dkd_var_user_id
    )
    select id
    from ranked
    where rn > 1
  );

  update public.dkd_profiles
  set
    shards = coalesce(shards, 0) + dkd_var_gained_shards,
    updated_at = now()
  where user_id = dkd_var_user_id;

  return jsonb_build_object(
    'ok', true,
    'recycled_cards', dkd_var_recycled_cards,
    'gained_shards', dkd_var_gained_shards
  );
end;
$$;

revoke all on function public.dkd_recycle_duplicates_all() from public;
grant execute on function public.dkd_recycle_duplicates_all() to authenticated;

create or replace function public.dkd_shard_exchange(dkd_param_kind text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_user_id uuid;
  dkd_var_kind text;
  dkd_var_cost integer := 0;
  dkd_var_reward_token integer := 0;
  dkd_var_reward_energy integer := 0;
  dkd_var_shards integer := 0;
  dkd_var_energy integer := 0;
  dkd_var_energy_max integer := 0;
begin
  dkd_var_user_id := auth.uid();
  if dkd_var_user_id is null then
    raise exception 'auth_required';
  end if;

  dkd_var_kind := lower(coalesce(trim(dkd_param_kind), ''));

  if dkd_var_kind = 'token_100' then
    dkd_var_cost := 40;
    dkd_var_reward_token := 100;
  elsif dkd_var_kind = 'energy_1' then
    dkd_var_cost := 30;
    dkd_var_reward_energy := 1;
  else
    return jsonb_build_object('ok', false, 'reason', 'invalid_kind');
  end if;

  insert into public.dkd_profiles (user_id)
  values (dkd_var_user_id)
  on conflict (user_id) do nothing;

  select
    coalesce(shards, 0),
    coalesce(energy, 0),
    coalesce(energy_max, 100)
  into
    dkd_var_shards,
    dkd_var_energy,
    dkd_var_energy_max
  from public.dkd_profiles
  where user_id = dkd_var_user_id
  for update;

  if dkd_var_shards < dkd_var_cost then
    return jsonb_build_object('ok', false, 'reason', 'not_enough_shards');
  end if;

  if dkd_var_reward_energy > 0 and dkd_var_energy >= dkd_var_energy_max then
    return jsonb_build_object('ok', false, 'reason', 'energy_full');
  end if;

  update public.dkd_profiles
  set
    shards = coalesce(shards, 0) - dkd_var_cost,
    token = coalesce(token, 0) + dkd_var_reward_token,
    energy = least(coalesce(energy_max, 100), coalesce(energy, 0) + dkd_var_reward_energy),
    updated_at = now()
  where user_id = dkd_var_user_id;

  return jsonb_build_object(
    'ok', true,
    'kind', dkd_var_kind,
    'spent_shards', dkd_var_cost,
    'reward_token', dkd_var_reward_token,
    'reward_energy', dkd_var_reward_energy
  );
end;
$$;

revoke all on function public.dkd_shard_exchange(text) from public;
grant execute on function public.dkd_shard_exchange(text) to authenticated;

create or replace function public.dkd_shard_craft(dkd_param_rarity text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_user_id uuid;
  dkd_var_rarity text;
  dkd_var_cost integer := 0;
  dkd_var_card_id uuid;
  dkd_var_card_name text;
  dkd_var_shards integer := 0;
begin
  dkd_var_user_id := auth.uid();
  if dkd_var_user_id is null then
    raise exception 'auth_required';
  end if;

  dkd_var_rarity := lower(coalesce(trim(dkd_param_rarity), ''));

  if dkd_var_rarity = 'common' then
    dkd_var_cost := 45;
  elsif dkd_var_rarity = 'rare' then
    dkd_var_cost := 110;
  elsif dkd_var_rarity = 'epic' then
    dkd_var_cost := 260;
  elsif dkd_var_rarity = 'legendary' then
    dkd_var_cost := 620;
  else
    return jsonb_build_object('ok', false, 'reason', 'invalid_rarity');
  end if;

  insert into public.dkd_profiles (user_id)
  values (dkd_var_user_id)
  on conflict (user_id) do nothing;

  select coalesce(shards, 0)
  into dkd_var_shards
  from public.dkd_profiles
  where user_id = dkd_var_user_id
  for update;

  if dkd_var_shards < dkd_var_cost then
    return jsonb_build_object('ok', false, 'reason', 'not_enough_shards');
  end if;

  select
    dkd_alias_c.id,
    dkd_alias_c.name
  into
    dkd_var_card_id,
    dkd_var_card_name
  from public.dkd_card_defs dkd_alias_c
  where coalesce(dkd_alias_c.is_active, true) = true
    and lower(coalesce(dkd_alias_c.rarity, 'common')) = dkd_var_rarity
  order by random()
  limit 1;

  if dkd_var_card_id is null then
    return jsonb_build_object('ok', false, 'reason', 'card_pool_empty');
  end if;

  update public.dkd_profiles
  set
    shards = coalesce(shards, 0) - dkd_var_cost,
    updated_at = now()
  where user_id = dkd_var_user_id;

  insert into public.dkd_user_cards (user_id, card_def_id, source)
  values (dkd_var_user_id, dkd_var_card_id, 'shard_craft');

  return jsonb_build_object(
    'ok', true,
    'spent_shards', dkd_var_cost,
    'card_def_id', dkd_var_card_id,
    'card_name', dkd_var_card_name,
    'rarity', dkd_var_rarity
  );
end;
$$;

revoke all on function public.dkd_shard_craft(text) from public;
grant execute on function public.dkd_shard_craft(text) to authenticated;

create or replace function public.dkd_shard_upgrade_random(dkd_param_from_rarity text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_user_id uuid;
  dkd_var_from text;
  dkd_var_to text;
  dkd_var_cost integer := 0;
  dkd_var_shards integer := 0;
  dkd_var_source_card_row_id bigint;
  dkd_var_burned_card_name text;
  dkd_var_new_card_id uuid;
  dkd_var_new_card_name text;
begin
  dkd_var_user_id := auth.uid();
  if dkd_var_user_id is null then
    raise exception 'auth_required';
  end if;

  dkd_var_from := lower(coalesce(trim(dkd_param_from_rarity), ''));

  if dkd_var_from = 'common' then
    dkd_var_to := 'rare';
    dkd_var_cost := 50;
  elsif dkd_var_from = 'rare' then
    dkd_var_to := 'epic';
    dkd_var_cost := 140;
  elsif dkd_var_from = 'epic' then
    dkd_var_to := 'legendary';
    dkd_var_cost := 320;
  elsif dkd_var_from = 'legendary' then
    dkd_var_to := 'mythic';
    dkd_var_cost := 800;
  else
    return jsonb_build_object('ok', false, 'reason', 'invalid_from_rarity');
  end if;

  insert into public.dkd_profiles (user_id)
  values (dkd_var_user_id)
  on conflict (user_id) do nothing;

  select coalesce(shards, 0)
  into dkd_var_shards
  from public.dkd_profiles
  where user_id = dkd_var_user_id
  for update;

  if dkd_var_shards < dkd_var_cost then
    return jsonb_build_object('ok', false, 'reason', 'not_enough_shards');
  end if;

  select
    uc.id,
    dkd_alias_c.name
  into
    dkd_var_source_card_row_id,
    dkd_var_burned_card_name
  from public.dkd_user_cards uc
  join public.dkd_card_defs dkd_alias_c
    on dkd_alias_c.id = uc.card_def_id
  where uc.user_id = dkd_var_user_id
    and lower(coalesce(dkd_alias_c.rarity, 'common')) = dkd_var_from
  order by uc.created_at asc, uc.id asc
  limit 1;

  if dkd_var_source_card_row_id is null then
    return jsonb_build_object('ok', false, 'reason', 'no_source_card');
  end if;

  select
    dkd_alias_c.id,
    dkd_alias_c.name
  into
    dkd_var_new_card_id,
    dkd_var_new_card_name
  from public.dkd_card_defs dkd_alias_c
  where coalesce(dkd_alias_c.is_active, true) = true
    and lower(coalesce(dkd_alias_c.rarity, 'common')) = dkd_var_to
  order by random()
  limit 1;

  if dkd_var_new_card_id is null then
    return jsonb_build_object('ok', false, 'reason', 'target_pool_empty');
  end if;

  delete from public.dkd_user_cards
  where id = dkd_var_source_card_row_id;

  update public.dkd_profiles
  set
    shards = coalesce(shards, 0) - dkd_var_cost,
    updated_at = now()
  where user_id = dkd_var_user_id;

  insert into public.dkd_user_cards (user_id, card_def_id, source)
  values (dkd_var_user_id, dkd_var_new_card_id, 'shard_upgrade');

  return jsonb_build_object(
    'ok', true,
    'spent_shards', dkd_var_cost,
    'burned_card_name', dkd_var_burned_card_name,
    'card_def_id', dkd_var_new_card_id,
    'card_name', dkd_var_new_card_name,
    'to_rarity', dkd_var_to
  );
end;
$$;

revoke all on function public.dkd_shard_upgrade_random(text) from public;
grant execute on function public.dkd_shard_upgrade_random(text) to authenticated;

create or replace function public.dkd_craft_boss_ticket()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_user_id uuid;
  dkd_var_cost integer := 90;
  dkd_var_shards integer := 0;
  dkd_var_boss_tickets integer := 0;
begin
  dkd_var_user_id := auth.uid();
  if dkd_var_user_id is null then
    raise exception 'auth_required';
  end if;

  insert into public.dkd_profiles (user_id)
  values (dkd_var_user_id)
  on conflict (user_id) do nothing;

  select
    coalesce(shards, 0),
    coalesce(boss_tickets, 0)
  into
    dkd_var_shards,
    dkd_var_boss_tickets
  from public.dkd_profiles
  where user_id = dkd_var_user_id
  for update;

  if dkd_var_shards < dkd_var_cost then
    return jsonb_build_object('ok', false, 'reason', 'not_enough_shards');
  end if;

  update public.dkd_profiles
  set
    shards = coalesce(shards, 0) - dkd_var_cost,
    boss_tickets = coalesce(boss_tickets, 0) + 1,
    updated_at = now()
  where user_id = dkd_var_user_id
  returning coalesce(boss_tickets, 0)
  into dkd_var_boss_tickets;

  return jsonb_build_object(
    'ok', true,
    'spent_shards', dkd_var_cost,
    'gained_tickets', 1,
    'boss_tickets', dkd_var_boss_tickets
  );
end;
$$;

revoke all on function public.dkd_craft_boss_ticket() from public;
grant execute on function public.dkd_craft_boss_ticket() to authenticated;

-- ====================================================================
-- FILE: 005_rpc_tasks_and_leaderboard.sql
-- ====================================================================

-- 005_rpc_tasks_and_leaderboard.sql
-- Lootonia gorev, haftalik gorev ve leaderboard RPC'leri

create or replace function public.dkd_calc_week_start(dkd_param_week_offset integer default 0)
returns date
language sql
stable
as $$
  select (
    ((now() at time zone 'Europe/Istanbul')::date)
    - ((extract(isodow from (now() at time zone 'Europe/Istanbul'))::int) - 1)
    + (coalesce(dkd_param_week_offset, 0) * 7)
  )::date
$$;

create table if not exists public.dkd_weekly_leaderboard_cache (
  metric text not null,
  week_start date not null,
  closed boolean not null default false,
  rows jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (metric, week_start)
);

alter table public.dkd_weekly_leaderboard_cache add column if not exists metric text;
alter table public.dkd_weekly_leaderboard_cache add column if not exists week_start date;
alter table public.dkd_weekly_leaderboard_cache add column if not exists closed boolean not null default false;
alter table public.dkd_weekly_leaderboard_cache add column if not exists rows jsonb not null default '[]'::jsonb;
alter table public.dkd_weekly_leaderboard_cache add column if not exists created_at timestamptz not null default now();
alter table public.dkd_weekly_leaderboard_cache add column if not exists updated_at timestamptz not null default now();

create table if not exists public.dkd_weekly_top_reward_claims (
  user_id uuid not null references auth.users(id) on delete cascade,
  metric text not null,
  week_start date not null,
  rank integer not null,
  reward_token integer not null default 0,
  reward_energy integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (user_id, metric, week_start)
);

create or replace function public.dkd_build_weekly_rows(
  dkd_param_metric text,
  dkd_param_week_start date,
  dkd_param_limit integer default 25
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_metric text := lower(coalesce(trim(dkd_param_metric), 'token'));
  dkd_var_rows jsonb;
begin
  with ranked as (
    select
      dkd_alias_l.user_id,
      coalesce(nullif(dkd_alias_p.nickname, ''), 'Player-' || left(dkd_alias_l.user_id::text, 8)) as label,
      case
        when dkd_var_metric = 'boss' then count(*) filter (where lower(coalesce(dkd_alias_l.drop_type, '')) = 'boss')::integer
        else coalesce(sum(coalesce(dkd_alias_l.gained_token, 0)), 0)::integer
      end as value
    from public.dkd_chest_logs dkd_alias_l
    left join public.dkd_profiles dkd_alias_p
      on dkd_alias_p.user_id = dkd_alias_l.user_id
    where dkd_alias_l.created_at >= dkd_param_week_start::timestamp
      and dkd_alias_l.created_at < (dkd_param_week_start::timestamp + interval '7 day')
    group by dkd_alias_l.user_id, dkd_alias_p.nickname
  ),
  filtered as (
    select
      dkd_alias_r.user_id,
      dkd_alias_r.label,
      dkd_alias_r.value,
      row_number() over (order by dkd_alias_r.value desc, dkd_alias_r.label asc, dkd_alias_r.user_id asc) as rank
    from ranked dkd_alias_r
    where coalesce(dkd_alias_r.value, 0) > 0
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'user_id', dkd_alias_f.user_id,
        'label', dkd_alias_f.label,
        'value', dkd_alias_f.value,
        'rank', dkd_alias_f.rank
      )
      order by dkd_alias_f.rank
    ),
    '[]'::jsonb
  )
  into dkd_var_rows
  from (
    select *
    from filtered
    order by rank
    limit greatest(coalesce(dkd_param_limit, 25), 1)
  ) dkd_alias_f;

  return coalesce(dkd_var_rows, '[]'::jsonb);
end;
$$;

create or replace function public.dkd_task_claim(
  dkd_param_task_key text,
  dkd_param_mult numeric default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_user_id uuid;
  dkd_var_profile public.dkd_profiles%rowtype;
  dkd_var_today text := ((now() at time zone 'Europe/Istanbul')::date)::text;
  dkd_var_task_key text := lower(coalesce(trim(dkd_param_task_key), ''));
  dkd_var_state jsonb;
  dkd_var_claims jsonb;
  dkd_var_token_reward integer := 0;
  dkd_var_energy_reward integer := 0;
  dkd_var_mult numeric := greatest(coalesce(dkd_param_mult, 1), 0.1);
  dkd_var_complete boolean := false;
begin
  dkd_var_user_id := auth.uid();
  if dkd_var_user_id is null then
    raise exception 'auth_required';
  end if;

  insert into public.dkd_profiles (user_id)
  values (dkd_var_user_id)
  on conflict (user_id) do nothing;

  select *
  into dkd_var_profile
  from public.dkd_profiles
  where user_id = dkd_var_user_id
  for update;

  dkd_var_state := coalesce(dkd_var_profile.task_state, '{}'::jsonb);

  if coalesce(dkd_var_state->>'day', '') <> dkd_var_today then
    dkd_var_state := jsonb_build_object(
      'day', dkd_var_today,
      'chests_opened', 0,
      'boss_solved', false,
      'claims', jsonb_build_object(
        'chest_1', false,
        'chest_3', false,
        'boss_1', false,
        'bonus', false
      )
    );
  end if;

  dkd_var_claims := coalesce(dkd_var_state->'claims', '{}'::jsonb);

  if coalesce((dkd_var_claims->>dkd_var_task_key)::boolean, false) then
    return jsonb_build_object('ok', false, 'reason', 'already_claimed', 'task_state', dkd_var_state);
  end if;

  if dkd_var_task_key = 'chest_1' then
    dkd_var_complete := coalesce((dkd_var_state->>'chests_opened')::integer, 0) >= 1;
    dkd_var_token_reward := 15;
    dkd_var_energy_reward := 0;
  elsif dkd_var_task_key = 'chest_3' then
    dkd_var_complete := coalesce((dkd_var_state->>'chests_opened')::integer, 0) >= 3;
    dkd_var_token_reward := 35;
    dkd_var_energy_reward := 0;
  elsif dkd_var_task_key = 'boss_1' then
    dkd_var_complete := coalesce((dkd_var_state->>'boss_solved')::boolean, false);
    dkd_var_token_reward := greatest(round(40 * dkd_var_mult)::integer, 40);
    dkd_var_energy_reward := 10;
  elsif dkd_var_task_key = 'bonus' then
    dkd_var_complete :=
      coalesce((dkd_var_claims->>'chest_1')::boolean, false)
      and coalesce((dkd_var_claims->>'chest_3')::boolean, false)
      and coalesce((dkd_var_claims->>'boss_1')::boolean, false);
    dkd_var_token_reward := 25;
    dkd_var_energy_reward := 0;
  else
    return jsonb_build_object('ok', false, 'reason', 'invalid_task_key');
  end if;

  if not dkd_var_complete then
    return jsonb_build_object('ok', false, 'reason', 'task_not_complete', 'task_state', dkd_var_state);
  end if;

  dkd_var_state := jsonb_set(dkd_var_state, array['claims', dkd_var_task_key], 'true'::jsonb, true);

  update public.dkd_profiles
  set
    token = coalesce(token, 0) + dkd_var_token_reward,
    energy = least(coalesce(energy_max, 100), coalesce(energy, 0) + dkd_var_energy_reward),
    task_state = dkd_var_state,
    updated_at = now()
  where user_id = dkd_var_user_id
  returning *
  into dkd_var_profile;

  return jsonb_build_object(
    'ok', true,
    'token', dkd_var_profile.token,
    'energy', dkd_var_profile.energy,
    'energy_max', dkd_var_profile.energy_max,
    'task_state', dkd_var_state,
    'reward_token', dkd_var_token_reward,
    'reward_energy', dkd_var_energy_reward
  );
end;
$$;

revoke all on function public.dkd_task_claim(text, numeric) from public;
grant execute on function public.dkd_task_claim(text, numeric) to authenticated;

create or replace function public.dkd_weekly_task_claim(
  dkd_param_task_key text,
  dkd_param_mult numeric default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_user_id uuid;
  dkd_var_profile public.dkd_profiles%rowtype;
  dkd_var_week text := public.dkd_calc_week_start(0)::text;
  dkd_var_task_key text := lower(coalesce(trim(dkd_param_task_key), ''));
  dkd_var_state jsonb;
  dkd_var_claims jsonb;
  dkd_var_token_reward integer := 0;
  dkd_var_energy_reward integer := 0;
  dkd_var_mult numeric := greatest(coalesce(dkd_param_mult, 1), 0.1);
  dkd_var_complete boolean := false;
begin
  dkd_var_user_id := auth.uid();
  if dkd_var_user_id is null then
    raise exception 'auth_required';
  end if;

  insert into public.dkd_profiles (user_id)
  values (dkd_var_user_id)
  on conflict (user_id) do nothing;

  select *
  into dkd_var_profile
  from public.dkd_profiles
  where user_id = dkd_var_user_id
  for update;

  dkd_var_state := coalesce(dkd_var_profile.weekly_task_state, '{}'::jsonb);

  if coalesce(dkd_var_state->>'week', '') <> dkd_var_week then
    dkd_var_state := jsonb_build_object(
      'week', dkd_var_week,
      'chests_opened', 0,
      'boss_opened', 0,
      'unique_drops', 0,
      'claims', jsonb_build_object(
        'w_chest_10', false,
        'w_boss_3', false,
        'w_unique_5', false,
        'w_bonus', false
      )
    );
  end if;

  dkd_var_claims := coalesce(dkd_var_state->'claims', '{}'::jsonb);

  if coalesce((dkd_var_claims->>dkd_var_task_key)::boolean, false) then
    return jsonb_build_object('ok', false, 'reason', 'already_claimed', 'weekly_task_state', dkd_var_state);
  end if;

  if dkd_var_task_key = 'w_chest_10' then
    dkd_var_complete := coalesce((dkd_var_state->>'chests_opened')::integer, 0) >= 10;
    dkd_var_token_reward := 120;
    dkd_var_energy_reward := 10;
  elsif dkd_var_task_key = 'w_boss_3' then
    dkd_var_complete := coalesce((dkd_var_state->>'boss_opened')::integer, 0) >= 3;
    dkd_var_token_reward := greatest(round(200 * dkd_var_mult)::integer, 200);
    dkd_var_energy_reward := 20;
  elsif dkd_var_task_key = 'w_unique_5' then
    dkd_var_complete := coalesce((dkd_var_state->>'unique_drops')::integer, 0) >= 5;
    dkd_var_token_reward := 150;
    dkd_var_energy_reward := 0;
  elsif dkd_var_task_key = 'w_bonus' then
    dkd_var_complete :=
      coalesce((dkd_var_claims->>'w_chest_10')::boolean, false)
      and coalesce((dkd_var_claims->>'w_boss_3')::boolean, false)
      and coalesce((dkd_var_claims->>'w_unique_5')::boolean, false);
    dkd_var_token_reward := 250;
    dkd_var_energy_reward := 30;
  else
    return jsonb_build_object('ok', false, 'reason', 'invalid_task_key');
  end if;

  if not dkd_var_complete then
    return jsonb_build_object('ok', false, 'reason', 'task_not_complete', 'weekly_task_state', dkd_var_state);
  end if;

  dkd_var_state := jsonb_set(dkd_var_state, array['claims', dkd_var_task_key], 'true'::jsonb, true);

  update public.dkd_profiles
  set
    token = coalesce(token, 0) + dkd_var_token_reward,
    energy = least(coalesce(energy_max, 100), coalesce(energy, 0) + dkd_var_energy_reward),
    weekly_task_state = dkd_var_state,
    updated_at = now()
  where user_id = dkd_var_user_id
  returning *
  into dkd_var_profile;

  return jsonb_build_object(
    'ok', true,
    'token', dkd_var_profile.token,
    'energy', dkd_var_profile.energy,
    'energy_max', dkd_var_profile.energy_max,
    'weekly_task_state', dkd_var_state,
    'reward_token', dkd_var_token_reward,
    'reward_energy', dkd_var_energy_reward
  );
end;
$$;

revoke all on function public.dkd_weekly_task_claim(text, numeric) from public;
grant execute on function public.dkd_weekly_task_claim(text, numeric) to authenticated;

create or replace function public.dkd_get_weekly_leaderboard2(
  dkd_param_metric text default 'token',
  dkd_param_limit integer default 25,
  dkd_param_week_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_metric text := lower(coalesce(trim(dkd_param_metric), 'token'));
  dkd_var_week_start date := public.dkd_calc_week_start(coalesce(dkd_param_week_offset, 0));
  dkd_var_rows jsonb;
  dkd_var_closed boolean := false;
begin
  if dkd_var_metric not in ('token', 'boss') then
    dkd_var_metric := 'token';
  end if;

  select closed, rows
  into dkd_var_closed, dkd_var_rows
  from public.dkd_weekly_leaderboard_cache
  where metric = dkd_var_metric
    and week_start = dkd_var_week_start
  limit 1;

  if dkd_var_rows is null or coalesce(dkd_var_closed, false) = false then
    dkd_var_rows := public.dkd_build_weekly_rows(dkd_var_metric, dkd_var_week_start, greatest(coalesce(dkd_param_limit, 25), 1));
  else
    dkd_var_rows := coalesce(
      (
        select jsonb_agg(dkd_alias_x.obj order by (dkd_alias_x.obj->>'rank')::integer)
        from (
          select obj
          from jsonb_array_elements(dkd_var_rows) obj
          order by (obj->>'rank')::integer
          limit greatest(coalesce(dkd_param_limit, 25), 1)
        ) x
      ),
      '[]'::jsonb
    );
  end if;

  return jsonb_build_object(
    'week_start', dkd_var_week_start,
    'closed', coalesce(dkd_var_closed, false),
    'rows', coalesce(dkd_var_rows, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.dkd_get_weekly_leaderboard2(text, integer, integer) from public;
grant execute on function public.dkd_get_weekly_leaderboard2(text, integer, integer) to authenticated;

create or replace function public.dkd_admin_close_week(
  dkd_param_week_offset integer default -1,
  dkd_param_limit integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_week_start date := public.dkd_calc_week_start(coalesce(dkd_param_week_offset, -1));
  dkd_var_token_rows jsonb;
  dkd_var_boss_rows jsonb;
  dkd_var_already_closed boolean := false;
begin
  if not public.dkd_is_admin() then
    raise exception 'not_admin';
  end if;

  select coalesce(bool_and(closed), false)
  into dkd_var_already_closed
  from public.dkd_weekly_leaderboard_cache
  where week_start = dkd_var_week_start
    and metric in ('token', 'boss');

  dkd_var_token_rows := public.dkd_build_weekly_rows('token', dkd_var_week_start, greatest(coalesce(dkd_param_limit, 50), 1));
  dkd_var_boss_rows := public.dkd_build_weekly_rows('boss', dkd_var_week_start, greatest(coalesce(dkd_param_limit, 50), 1));

  insert into public.dkd_weekly_leaderboard_cache (metric, week_start, closed, rows, updated_at)
  values ('token', dkd_var_week_start, true, coalesce(dkd_var_token_rows, '[]'::jsonb), now())
  on conflict (metric, week_start) do update
  set
    closed = true,
    rows = excluded.rows,
    updated_at = now();

  insert into public.dkd_weekly_leaderboard_cache (metric, week_start, closed, rows, updated_at)
  values ('boss', dkd_var_week_start, true, coalesce(dkd_var_boss_rows, '[]'::jsonb), now())
  on conflict (metric, week_start) do update
  set
    closed = true,
    rows = excluded.rows,
    updated_at = now();

  return jsonb_build_object(
    'ok', true,
    'already_closed', coalesce(dkd_var_already_closed, false),
    'week_start', dkd_var_week_start
  );
end;
$$;

revoke all on function public.dkd_admin_close_week(integer, integer) from public;
grant execute on function public.dkd_admin_close_week(integer, integer) to authenticated;

create or replace function public.dkd_claim_weekly_top_reward(
  dkd_param_metric text default 'token'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_user_id uuid;
  dkd_var_metric text := lower(coalesce(trim(dkd_param_metric), 'token'));
  dkd_var_week_start date := public.dkd_calc_week_start(-1);
  dkd_var_rows jsonb;
  dkd_var_rank integer;
  dkd_var_reward_token integer := 0;
  dkd_var_reward_energy integer := 0;
  dkd_var_had_activity boolean := false;
begin
  dkd_var_user_id := auth.uid();
  if dkd_var_user_id is null then
    raise exception 'auth_required';
  end if;

  if dkd_var_metric not in ('token', 'boss') then
    dkd_var_metric := 'token';
  end if;

  insert into public.dkd_profiles (user_id)
  values (dkd_var_user_id)
  on conflict (user_id) do nothing;

  if exists (
    select 1
    from public.dkd_weekly_top_reward_claims
    where user_id = dkd_var_user_id
      and metric = dkd_var_metric
      and week_start = dkd_var_week_start
  ) then
    return jsonb_build_object('ok', false, 'reason', 'already_claimed');
  end if;

  select rows
  into dkd_var_rows
  from public.dkd_weekly_leaderboard_cache
  where metric = dkd_var_metric
    and week_start = dkd_var_week_start
    and closed = true
  limit 1;

  if dkd_var_rows is null then
    dkd_var_rows := public.dkd_build_weekly_rows(dkd_var_metric, dkd_var_week_start, 100);
  end if;

  select exists(
    select 1
    from public.dkd_chest_logs dkd_alias_l
    where dkd_alias_l.user_id = dkd_var_user_id
      and dkd_alias_l.created_at >= dkd_var_week_start::timestamp
      and dkd_alias_l.created_at < (dkd_var_week_start::timestamp + interval '7 day')
  )
  into dkd_var_had_activity;

  select (obj->>'rank')::integer
  into dkd_var_rank
  from jsonb_array_elements(coalesce(dkd_var_rows, '[]'::jsonb)) obj
  where obj->>'user_id' = dkd_var_user_id::text
  limit 1;

  if dkd_var_rank is null then
    return jsonb_build_object(
      'ok', false,
      'reason', case when dkd_var_had_activity then 'not_in_top10' else 'no_activity' end
    );
  end if;

  if dkd_var_rank > 10 then
    return jsonb_build_object(
      'ok', false,
      'reason', 'not_in_top10',
      'rank', dkd_var_rank
    );
  end if;

  if dkd_var_rank = 1 then
    dkd_var_reward_token := 500;
    dkd_var_reward_energy := 20;
  elsif dkd_var_rank = 2 then
    dkd_var_reward_token := 350;
    dkd_var_reward_energy := 15;
  elsif dkd_var_rank = 3 then
    dkd_var_reward_token := 250;
    dkd_var_reward_energy := 10;
  else
    dkd_var_reward_token := 100;
    dkd_var_reward_energy := 5;
  end if;

  update public.dkd_profiles
  set
    token = coalesce(token, 0) + dkd_var_reward_token,
    energy = least(coalesce(energy_max, 100), coalesce(energy, 0) + dkd_var_reward_energy),
    updated_at = now()
  where user_id = dkd_var_user_id;

  insert into public.dkd_weekly_top_reward_claims (
    user_id,
    metric,
    week_start,
    rank,
    reward_token,
    reward_energy
  )
  values (
    dkd_var_user_id,
    dkd_var_metric,
    dkd_var_week_start,
    dkd_var_rank,
    dkd_var_reward_token,
    dkd_var_reward_energy
  );

  return jsonb_build_object(
    'ok', true,
    'metric', dkd_var_metric,
    'week_start', dkd_var_week_start,
    'rank', dkd_var_rank,
    'reward_token', dkd_var_reward_token,
    'reward_energy', dkd_var_reward_energy
  );
end;
$$;

revoke all on function public.dkd_claim_weekly_top_reward(text) from public;
grant execute on function public.dkd_claim_weekly_top_reward(text) to authenticated;

-- ====================================================================
-- FILE: 006_rpc_admin_and_courier.sql
-- ====================================================================

-- 006_rpc_admin_and_courier.sql
-- Lootonia admin kullanici ve kurye gorev RPC'leri

create table if not exists public.dkd_courier_jobs (
  id bigint generated by default as identity primary key,
  title text,
  pickup text,
  dropoff text,
  reward_score integer not null default 12,
  distance_km numeric not null default 1.0,
  eta_min integer not null default 15,
  job_type text not null default 'food',
  is_active boolean not null default true,
  status text not null default 'open',
  assigned_user_id uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dkd_courier_jobs add column if not exists title text;
alter table public.dkd_courier_jobs add column if not exists pickup text;
alter table public.dkd_courier_jobs add column if not exists dropoff text;
alter table public.dkd_courier_jobs add column if not exists reward_score integer not null default 12;
alter table public.dkd_courier_jobs add column if not exists distance_km numeric not null default 1.0;
alter table public.dkd_courier_jobs add column if not exists eta_min integer not null default 15;
alter table public.dkd_courier_jobs add column if not exists job_type text not null default 'food';
alter table public.dkd_courier_jobs add column if not exists is_active boolean not null default true;
alter table public.dkd_courier_jobs add column if not exists status text not null default 'open';
alter table public.dkd_courier_jobs add column if not exists assigned_user_id uuid references auth.users(id) on delete set null;
alter table public.dkd_courier_jobs add column if not exists accepted_at timestamptz;
alter table public.dkd_courier_jobs add column if not exists completed_at timestamptz;
alter table public.dkd_courier_jobs add column if not exists created_at timestamptz not null default now();
alter table public.dkd_courier_jobs add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_dkd_courier_jobs_status on public.dkd_courier_jobs(status);
create index if not exists idx_dkd_courier_jobs_active on public.dkd_courier_jobs(is_active);
create index if not exists idx_dkd_courier_jobs_assigned_user on public.dkd_courier_jobs(assigned_user_id);

drop trigger if exists dkd_courier_jobs_touch_updated_at on public.dkd_courier_jobs;
create trigger dkd_courier_jobs_touch_updated_at
before update on public.dkd_courier_jobs
for each row
execute function public.dkd_touch_updated_at();

create or replace function public.dkd_admin_profiles_list(
  dkd_param_query text default '',
  dkd_param_limit integer default 60
)
returns table (
  user_id uuid,
  email text,
  nickname text,
  avatar_emoji text,
  token integer,
  shards integer,
  boss_tickets integer,
  energy integer,
  energy_max integer,
  xp integer,
  level integer,
  rank_key text,
  courier_status text,
  courier_score integer,
  courier_completed_jobs integer,
  task_state jsonb,
  boss_state jsonb,
  weekly_task_state jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  dkd_var_query text := lower(coalesce(trim(dkd_param_query), ''));
  dkd_var_limit integer := greatest(1, least(coalesce(dkd_param_limit, 60), 200));
begin
  if not public.dkd_is_admin() then
    raise exception 'admin_required';
  end if;

  return query
  select
    dkd_alias_u.id as user_id,
    dkd_alias_u.email::text as email,
    coalesce(dkd_alias_p.nickname, '') as nickname,
    coalesce(dkd_alias_p.avatar_emoji, '⚡') as avatar_emoji,
    coalesce(dkd_alias_p.token, 0) as token,
    coalesce(dkd_alias_p.shards, 0) as shards,
    coalesce(dkd_alias_p.boss_tickets, 0) as boss_tickets,
    coalesce(dkd_alias_p.energy, 100) as energy,
    coalesce(dkd_alias_p.energy_max, 100) as energy_max,
    coalesce(dkd_alias_p.xp, 0) as xp,
    coalesce(dkd_alias_p.level, 1) as level,
    coalesce(dkd_alias_p.rank_key, 'rookie') as rank_key,
    coalesce(dkd_alias_p.courier_status, 'none') as courier_status,
    coalesce(dkd_alias_p.courier_score, 0) as courier_score,
    coalesce(dkd_alias_p.courier_completed_jobs, 0) as courier_completed_jobs,
    coalesce(dkd_alias_p.task_state, '{}'::jsonb) as task_state,
    coalesce(dkd_alias_p.boss_state, '{}'::jsonb) as boss_state,
    coalesce(dkd_alias_p.weekly_task_state, '{}'::jsonb) as weekly_task_state,
    coalesce(dkd_alias_p.created_at, dkd_alias_u.created_at) as created_at,
    coalesce(dkd_alias_p.updated_at, dkd_alias_u.updated_at) as updated_at
  from auth.users dkd_alias_u
  left join public.dkd_profiles dkd_alias_p
    on dkd_alias_p.user_id = dkd_alias_u.id
  where
    dkd_var_query = ''
    or lower(coalesce(dkd_alias_u.email::text, '')) like '%' || dkd_var_query || '%'
    or lower(coalesce(dkd_alias_p.nickname, '')) like '%' || dkd_var_query || '%'
    or dkd_alias_u.id::text like '%' || dkd_var_query || '%'
  order by coalesce(dkd_alias_p.updated_at, dkd_alias_u.updated_at) desc nulls last, dkd_alias_u.created_at desc
  limit dkd_var_limit;
end;
$$;

revoke all on function public.dkd_admin_profiles_list(text, integer) from public;
grant execute on function public.dkd_admin_profiles_list(text, integer) to authenticated;

create or replace function public.dkd_admin_profile_update(
  dkd_param_user_id uuid,
  dkd_param_nickname text default null,
  dkd_param_avatar_emoji text default null,
  dkd_param_token integer default null,
  dkd_param_shards integer default null,
  dkd_param_boss_tickets integer default null,
  dkd_param_energy integer default null,
  dkd_param_energy_max integer default null,
  dkd_param_xp integer default null,
  dkd_param_level integer default null,
  dkd_param_rank_key text default null,
  dkd_param_courier_status text default null,
  dkd_param_courier_score integer default null,
  dkd_param_courier_completed_jobs integer default null,
  dkd_param_task_state jsonb default null,
  dkd_param_boss_state jsonb default null,
  dkd_param_weekly_task_state jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  dkd_var_exists boolean := false;
  dkd_var_row public.dkd_profiles%rowtype;
begin
  if not public.dkd_is_admin() then
    raise exception 'admin_required';
  end if;

  if dkd_param_user_id is null then
    raise exception 'user_required';
  end if;

  select exists(select 1 from auth.users where id = dkd_param_user_id)
  into dkd_var_exists;

  if not dkd_var_exists then
    raise exception 'user_not_found';
  end if;

  insert into public.dkd_profiles (user_id)
  values (dkd_param_user_id)
  on conflict (user_id) do nothing;

  update public.dkd_profiles
  set
    nickname = coalesce(dkd_param_nickname, nickname),
    avatar_emoji = coalesce(nullif(trim(coalesce(dkd_param_avatar_emoji, '')), ''), avatar_emoji),
    token = coalesce(dkd_param_token, token),
    shards = coalesce(dkd_param_shards, shards),
    boss_tickets = coalesce(dkd_param_boss_tickets, boss_tickets),
    energy = least(
      coalesce(dkd_param_energy_max, energy_max),
      greatest(coalesce(dkd_param_energy, energy), 0)
    ),
    energy_max = greatest(coalesce(dkd_param_energy_max, energy_max), 1),
    xp = greatest(coalesce(dkd_param_xp, xp), 0),
    level = greatest(coalesce(dkd_param_level, level), 1),
    rank_key = coalesce(nullif(trim(coalesce(dkd_param_rank_key, '')), ''), rank_key),
    courier_status = coalesce(nullif(trim(coalesce(dkd_param_courier_status, '')), ''), courier_status),
    courier_score = greatest(coalesce(dkd_param_courier_score, courier_score), 0),
    courier_completed_jobs = greatest(coalesce(dkd_param_courier_completed_jobs, courier_completed_jobs), 0),
    task_state = coalesce(dkd_param_task_state, task_state),
    boss_state = coalesce(dkd_param_boss_state, boss_state),
    weekly_task_state = coalesce(dkd_param_weekly_task_state, weekly_task_state),
    updated_at = now()
  where user_id = dkd_param_user_id
  returning *
  into dkd_var_row;

  return jsonb_build_object(
    'ok', true,
    'user_id', dkd_var_row.user_id,
    'level', dkd_var_row.level,
    'xp', dkd_var_row.xp,
    'rank_key', dkd_var_row.rank_key,
    'courier_status', dkd_var_row.courier_status,
    'courier_score', dkd_var_row.courier_score,
    'courier_completed_jobs', dkd_var_row.courier_completed_jobs
  );
end;
$$;

revoke all on function public.dkd_admin_profile_update(uuid, text, text, integer, integer, integer, integer, integer, integer, integer, text, text, integer, integer, jsonb, jsonb, jsonb) from public;
grant execute on function public.dkd_admin_profile_update(uuid, text, text, integer, integer, integer, integer, integer, integer, integer, text, text, integer, integer, jsonb, jsonb, jsonb) to authenticated;

create or replace function public.dkd_admin_courier_jobs_list()
returns table (
  id bigint,
  title text,
  pickup text,
  dropoff text,
  reward_score integer,
  distance_km numeric,
  eta_min integer,
  job_type text,
  is_active boolean,
  status text,
  assigned_user_id uuid,
  accepted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.dkd_is_admin() then
    raise exception 'admin_required';
  end if;

  return query
  select
    j.id,
    j.title,
    j.pickup,
    j.dropoff,
    coalesce(j.reward_score, 0),
    coalesce(j.distance_km, 0),
    coalesce(j.eta_min, 0),
    coalesce(j.job_type, 'food'),
    coalesce(j.is_active, true),
    coalesce(j.status, 'open'),
    j.assigned_user_id,
    j.accepted_at,
    j.completed_at,
    j.created_at,
    j.updated_at
  from public.dkd_courier_jobs j
  order by j.id desc;
end;
$$;

revoke all on function public.dkd_admin_courier_jobs_list() from public;
grant execute on function public.dkd_admin_courier_jobs_list() to authenticated;

create or replace function public.dkd_admin_courier_job_upsert(
  dkd_param_id bigint default null,
  dkd_param_title text default null,
  dkd_param_pickup text default null,
  dkd_param_dropoff text default null,
  dkd_param_reward_score integer default null,
  dkd_param_distance_km numeric default null,
  dkd_param_eta_min integer default null,
  dkd_param_job_type text default null,
  dkd_param_is_active boolean default true
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_id bigint;
begin
  if not public.dkd_is_admin() then
    raise exception 'admin_required';
  end if;

  if coalesce(nullif(trim(coalesce(dkd_param_title, '')), ''), '') = '' then
    raise exception 'title_required';
  end if;

  if dkd_param_id is null then
    insert into public.dkd_courier_jobs (
      title,
      pickup,
      dropoff,
      reward_score,
      distance_km,
      eta_min,
      job_type,
      is_active,
      status
    )
    values (
      trim(dkd_param_title),
      nullif(trim(coalesce(dkd_param_pickup, '')), ''),
      nullif(trim(coalesce(dkd_param_dropoff, '')), ''),
      greatest(coalesce(dkd_param_reward_score, 12), 0),
      greatest(coalesce(dkd_param_distance_km, 1), 0),
      greatest(coalesce(dkd_param_eta_min, 15), 0),
      coalesce(nullif(trim(coalesce(dkd_param_job_type, '')), ''), 'food'),
      coalesce(dkd_param_is_active, true),
      'open'
    )
    returning id into dkd_var_id;
  else
    update public.dkd_courier_jobs
    set
      title = trim(dkd_param_title),
      pickup = nullif(trim(coalesce(dkd_param_pickup, '')), ''),
      dropoff = nullif(trim(coalesce(dkd_param_dropoff, '')), ''),
      reward_score = greatest(coalesce(dkd_param_reward_score, reward_score), 0),
      distance_km = greatest(coalesce(dkd_param_distance_km, distance_km), 0),
      eta_min = greatest(coalesce(dkd_param_eta_min, eta_min), 0),
      job_type = coalesce(nullif(trim(coalesce(dkd_param_job_type, '')), ''), job_type),
      is_active = coalesce(dkd_param_is_active, is_active),
      updated_at = now()
    where id = dkd_param_id
    returning id into dkd_var_id;

    if dkd_var_id is null then
      raise exception 'job_not_found';
    end if;
  end if;

  return dkd_var_id;
end;
$$;

revoke all on function public.dkd_admin_courier_job_upsert(bigint, text, text, text, integer, numeric, integer, text, boolean) from public;
grant execute on function public.dkd_admin_courier_job_upsert(bigint, text, text, text, integer, numeric, integer, text, boolean) to authenticated;

create or replace function public.dkd_admin_courier_job_delete(dkd_param_job_id bigint)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.dkd_is_admin() then
    raise exception 'admin_required';
  end if;

  delete from public.dkd_courier_jobs
  where id = dkd_param_job_id;

  if not found then
    raise exception 'job_not_found';
  end if;

  return dkd_param_job_id;
end;
$$;

revoke all on function public.dkd_admin_courier_job_delete(bigint) from public;
grant execute on function public.dkd_admin_courier_job_delete(bigint) to authenticated;

create or replace function public.dkd_courier_jobs_for_me()
returns table (
  id bigint,
  title text,
  pickup text,
  dropoff text,
  reward_score integer,
  distance_km numeric,
  eta_min integer,
  job_type text,
  is_active boolean,
  status text,
  assigned_user_id uuid,
  accepted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_user_id uuid;
  dkd_var_courier_status text;
begin
  dkd_var_user_id := auth.uid();
  if dkd_var_user_id is null then
    raise exception 'auth_required';
  end if;

  select coalesce(courier_status, 'none')
  into dkd_var_courier_status
  from public.dkd_profiles
  where user_id = dkd_var_user_id
  limit 1;

  if coalesce(dkd_var_courier_status, 'none') <> 'approved' then
    return;
  end if;

  return query
  select
    j.id,
    j.title,
    j.pickup,
    j.dropoff,
    coalesce(j.reward_score, 0),
    coalesce(j.distance_km, 0),
    coalesce(j.eta_min, 0),
    coalesce(j.job_type, 'food'),
    coalesce(j.is_active, true),
    coalesce(j.status, 'open'),
    j.assigned_user_id,
    j.accepted_at,
    j.completed_at,
    j.created_at,
    j.updated_at
  from public.dkd_courier_jobs j
  where coalesce(j.is_active, true) = true
    and (
      coalesce(j.status, 'open') = 'open'
      or j.assigned_user_id = dkd_var_user_id
    )
  order by
    case
      when j.assigned_user_id = dkd_var_user_id and coalesce(j.status, 'open') = 'accepted' then 0
      when coalesce(j.status, 'open') = 'open' then 1
      when j.assigned_user_id = dkd_var_user_id and coalesce(j.status, 'open') = 'completed' then 2
      else 3
    end,
    j.created_at desc;
end;
$$;

revoke all on function public.dkd_courier_jobs_for_me() from public;
grant execute on function public.dkd_courier_jobs_for_me() to authenticated;

create or replace function public.dkd_courier_job_accept(dkd_param_job_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_user_id uuid;
  dkd_var_courier_status text;
  dkd_var_status text;
  dkd_var_assigned_user_id uuid;
begin
  dkd_var_user_id := auth.uid();
  if dkd_var_user_id is null then
    raise exception 'auth_required';
  end if;

  select coalesce(courier_status, 'none')
  into dkd_var_courier_status
  from public.dkd_profiles
  where user_id = dkd_var_user_id
  limit 1;

  if coalesce(dkd_var_courier_status, 'none') <> 'approved' then
    raise exception 'courier_not_approved';
  end if;

  select status, assigned_user_id
  into dkd_var_status, dkd_var_assigned_user_id
  from public.dkd_courier_jobs
  where id = dkd_param_job_id
    and coalesce(is_active, true) = true
  for update;

  if dkd_var_status is null then
    raise exception 'job_not_found';
  end if;

  if dkd_var_status = 'completed' then
    raise exception 'job_completed';
  end if;

  if dkd_var_status = 'accepted' and dkd_var_assigned_user_id = dkd_var_user_id then
    return jsonb_build_object('ok', true, 'status', 'accepted', 'job_id', dkd_param_job_id);
  end if;

  if dkd_var_status = 'accepted' and dkd_var_assigned_user_id is distinct from dkd_var_user_id then
    raise exception 'job_already_taken';
  end if;

  update public.dkd_courier_jobs
  set
    status = 'accepted',
    assigned_user_id = dkd_var_user_id,
    accepted_at = now(),
    updated_at = now()
  where id = dkd_param_job_id;

  return jsonb_build_object('ok', true, 'status', 'accepted', 'job_id', dkd_param_job_id);
end;
$$;

revoke all on function public.dkd_courier_job_accept(bigint) from public;
grant execute on function public.dkd_courier_job_accept(bigint) to authenticated;

create or replace function public.dkd_courier_job_complete(dkd_param_job_id bigint)
returns table (
  courier_score integer,
  courier_completed_jobs integer,
  token integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_user_id uuid;
  dkd_var_reward_score integer;
  dkd_var_status text;
  dkd_var_assigned_user_id uuid;
  dkd_var_token_reward integer;
begin
  dkd_var_user_id := auth.uid();
  if dkd_var_user_id is null then
    raise exception 'auth_required';
  end if;

  insert into public.dkd_profiles (user_id)
  values (dkd_var_user_id)
  on conflict (user_id) do nothing;

  select
    coalesce(reward_score, 0),
    coalesce(status, 'open'),
    assigned_user_id
  into
    dkd_var_reward_score,
    dkd_var_status,
    dkd_var_assigned_user_id
  from public.dkd_courier_jobs
  where id = dkd_param_job_id
    and coalesce(is_active, true) = true
  for update;

  if dkd_var_assigned_user_id is null then
    raise exception 'job_not_found';
  end if;

  if dkd_var_assigned_user_id <> dkd_var_user_id then
    raise exception 'job_not_owned';
  end if;

  if dkd_var_status = 'completed' then
    return query
    select
      coalesce(dkd_alias_p.courier_score, 0),
      coalesce(dkd_alias_p.courier_completed_jobs, 0),
      coalesce(dkd_alias_p.token, 0)
    from public.dkd_profiles dkd_alias_p
    where dkd_alias_p.user_id = dkd_var_user_id
    limit 1;
    return;
  end if;

  if dkd_var_status <> 'accepted' then
    raise exception 'job_not_accepted';
  end if;

  dkd_var_token_reward := greatest(dkd_var_reward_score * 4, 10);

  update public.dkd_courier_jobs
  set
    status = 'completed',
    completed_at = now(),
    updated_at = now()
  where id = dkd_param_job_id;

  update public.dkd_profiles
  set
    courier_score = coalesce(courier_score, 0) + dkd_var_reward_score,
    courier_completed_jobs = coalesce(courier_completed_jobs, 0) + 1,
    token = coalesce(token, 0) + dkd_var_token_reward,
    updated_at = now()
  where user_id = dkd_var_user_id;

  return query
  select
    coalesce(dkd_alias_p.courier_score, 0),
    coalesce(dkd_alias_p.courier_completed_jobs, 0),
    coalesce(dkd_alias_p.token, 0)
  from public.dkd_profiles dkd_alias_p
  where dkd_alias_p.user_id = dkd_var_user_id
  limit 1;
end;
$$;

revoke all on function public.dkd_courier_job_complete(bigint) from public;
grant execute on function public.dkd_courier_job_complete(bigint) to authenticated;

-- ====================================================================
-- FILE: 007_seed_minimal.sql
-- ====================================================================

-- 007_seed_minimal.sql
-- Lootonia baslangic seed verileri

insert into public.dkd_card_defs (name, series, rarity, theme, is_active)
select *
from (
  values
    ('Eryaman Gate', 'GENERAL', 'common', 'city', true),
    ('Metro Pulse', 'GENERAL', 'common', 'neon', true),
    ('Parkline Echo', 'GENERAL', 'common', 'urban', true),
    ('Sky District', 'SKYLINE', 'rare', 'city', true),
    ('Loot Bazaar', 'NEON', 'rare', 'market', true),
    ('Orbit Steps', 'ORBIT', 'rare', 'futuristic', true),
    ('Apex Terrace', 'APEX', 'epic', 'tower', true),
    ('Signal Tower', 'SKYLINE', 'epic', 'tower', true),
    ('Myth Gate', 'APEX', 'legendary', 'boss', true),
    ('Prime Core', 'ORBIT', 'mythic', 'boss', true)
) as seed(name, series, rarity, theme, is_active)
where not exists (
  select 1 from public.dkd_card_defs
);

insert into public.dkd_loot_entries (drop_type, rarity, weight, card_def_id)
select
  case
    when lower(dkd_alias_c.rarity) in ('legendary', 'mythic') then 'boss'
    else 'all'
  end as drop_type,
  lower(dkd_alias_c.rarity) as rarity,
  case
    when lower(dkd_alias_c.rarity) = 'common' then 1.00
    when lower(dkd_alias_c.rarity) = 'rare' then 0.65
    when lower(dkd_alias_c.rarity) = 'epic' then 0.35
    when lower(dkd_alias_c.rarity) = 'legendary' then 0.12
    when lower(dkd_alias_c.rarity) = 'mythic' then 0.06
    else 1.00
  end as weight,
  dkd_alias_c.id
from public.dkd_card_defs dkd_alias_c
where not exists (
  select 1 from public.dkd_loot_entries
);

insert into public.dkd_drops (
  name,
  type,
  lat,
  lng,
  radius_m,
  cooldown_seconds,
  is_active,
  qr_secret
)
select *
from (
  values
    ('Lootonia Eryaman Hub', 'map', 39.9719, 32.6355, 80, 900, true, 'ERYAMAN-HUB'),
    ('Lootonia Metro Loot', 'qr', 39.9690, 32.6220, 60, 900, true, 'METRO-QR'),
    ('Lootonia Boss Point', 'boss', 39.9752, 32.6414, 90, 3600, true, 'BOSS-POINT')
) as seed(name, type, lat, lng, radius_m, cooldown_seconds, is_active, qr_secret)
where not exists (
  select 1 from public.dkd_drops
);

insert into public.dkd_courier_jobs (
  title,
  pickup,
  dropoff,
  reward_score,
  distance_km,
  eta_min,
  job_type,
  is_active,
  status
)
select *
from (
  values
    ('Hizli Paket • Eryaman', 'Eryaman Metro', 'Goksu Park Girisi', 12, 1.4, 16, 'food', true, 'open'),
    ('Loot Teslim • Merkez', 'Batikent AVM', 'Demetevler Meydan', 18, 2.6, 24, 'loot', true, 'open'),
    ('VIP Evrak • Kule Hatti', 'Koru Metro', 'Umitkoy Plaza', 25, 4.1, 32, 'express', true, 'open')
) as seed(title, pickup, dropoff, reward_score, distance_km, eta_min, job_type, is_active, status)
where not exists (
  select 1 from public.dkd_courier_jobs
);

-- ====================================================================
-- FILE: 008_profile_helpers.sql
-- ====================================================================

-- 008_profile_helpers.sql
create or replace function public.dkd_is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce((select dkd_alias_p.is_admin from public.dkd_profiles dkd_alias_p where dkd_alias_p.user_id = auth.uid()), false);
$$;

revoke all on function public.dkd_is_admin() from public;
grant execute on function public.dkd_is_admin() to authenticated;

create or replace function public.dkd_set_profile(
  dkd_param_nickname text default null,
  dkd_param_avatar_emoji text default null
)
returns public.dkd_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_uid uuid := auth.uid();
  dkd_var_row public.dkd_profiles;
begin
  if dkd_var_uid is null then
    raise exception 'auth_required';
  end if;

  insert into public.dkd_profiles (user_id, nickname, avatar_emoji)
  values (dkd_var_uid, nullif(trim(dkd_param_nickname), ''), coalesce(nullif(trim(dkd_param_avatar_emoji), ''), '🦅'))
  on conflict (user_id) do update
    set nickname = coalesce(nullif(trim(dkd_param_nickname), ''), public.dkd_profiles.nickname),
        avatar_emoji = coalesce(nullif(trim(dkd_param_avatar_emoji), ''), public.dkd_profiles.avatar_emoji),
        updated_at = now()
  returning * into dkd_var_row;

  return dkd_var_row;
end;
$$;

revoke all on function public.dkd_set_profile(text, text) from public;
grant execute on function public.dkd_set_profile(text, text) to authenticated;

-- ====================================================================
-- FILE: 009_drop_chest_core.sql
-- ====================================================================

-- 009_drop_chest_core.sql
-- Buradaki fonksiyonlar iskelet niteliğindedir. Gerçek ekonomi / uzaklık / anti-abuse kuralları bu dosyada tamamlanmalıdır.

create or replace function public.dkd_issue_drop_code(dkd_param_drop_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_code text;
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;

  dkd_var_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  update public.dkd_drops
  set code_last_issued = dkd_var_code,
      code_expires_at = now() + interval '10 minutes',
      updated_at = now()
  where id = dkd_param_drop_id;

  if not found then
    raise exception 'drop_not_found';
  end if;

  return dkd_var_code;
end;
$$;

-- TODO: uzaklık doğrulama, cooldown kontrolü, loot roll, transaction
create or replace function public.dkd_open_chest_secure(
  dkd_param_drop_id uuid,
  dkd_param_qr_secret text default null,
  dkd_param_lat numeric default null,
  dkd_param_lng numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object('ok', false, 'reason', 'todo_open_chest_secure');
end;
$$;

create or replace function public.dkd_open_chest_by_code(dkd_param_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object('ok', false, 'reason', 'todo_open_chest_by_code');
end;
$$;

create or replace function public.dkd_open_boss_chest_secure(
  dkd_param_drop_id uuid,
  dkd_param_tier integer,
  dkd_param_correct integer,
  dkd_param_total integer,
  dkd_param_lat numeric default null,
  dkd_param_lng numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object('ok', false, 'reason', 'todo_open_boss_chest_secure');
end;
$$;

-- ====================================================================
-- FILE: 010_admin_loot_system.sql
-- ====================================================================

-- 010_admin_loot_system.sql
create or replace function public.dkd_admin_loot_add(
  dkd_param_drop_type text,
  dkd_param_rarity text,
  dkd_param_weight integer,
  dkd_param_card_def_id bigint
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_id bigint;
begin
  if not public.dkd_is_admin() then
    raise exception 'admin_required';
  end if;

  insert into public.dkd_loot_entries(drop_type, rarity, weight, card_def_id)
  values (lower(coalesce(dkd_param_drop_type, 'map')), lower(coalesce(dkd_param_rarity, 'common')), greatest(coalesce(dkd_param_weight, 1), 1), dkd_param_card_def_id)
  returning id into dkd_var_id;

  return dkd_var_id;
end;
$$;

create or replace function public.dkd_admin_loot_delete(dkd_param_entry_id bigint)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.dkd_is_admin() then
    raise exception 'admin_required';
  end if;

  delete from public.dkd_loot_entries where id = dkd_param_entry_id;
  if not found then
    raise exception 'loot_entry_not_found';
  end if;

  return dkd_param_entry_id;
end;
$$;

-- ====================================================================
-- FILE: 011_market_system.sql
-- ====================================================================

-- 011_market_system.sql
-- TODO: duplicate listing koruması, burned/sold card koruması, transaction bazlı token transferi.

create or replace function public.dkd_market_list_card(
  dkd_param_user_card_id bigint,
  dkd_param_price_token integer
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_id bigint;
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;

  insert into public.dkd_market_listings(seller_id, user_card_id, price_token, fee_token, status)
  values (auth.uid(), dkd_param_user_card_id, greatest(coalesce(dkd_param_price_token, 0), 1), greatest(floor(coalesce(dkd_param_price_token, 0) * 0.10), 0), 'active')
  returning id into dkd_var_id;

  return dkd_var_id;
end;
$$;

create or replace function public.dkd_market_cancel(dkd_param_listing_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.dkd_market_listings
  set status = 'cancelled', canceled_at = now()
  where id = dkd_param_listing_id and seller_id = auth.uid() and status = 'active';

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'listing_not_found_or_forbidden');
  end if;

  return jsonb_build_object('ok', true, 'listing_id', dkd_param_listing_id);
end;
$$;

create or replace function public.dkd_market_buy(dkd_param_listing_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object('ok', false, 'reason', 'todo_market_buy');
end;
$$;

-- ====================================================================
-- FILE: 012_shard_system.sql
-- ====================================================================

-- 012_shard_system.sql
-- TODO: rarity / shard economy kuralları finalize edilmeli.

create or replace function public.dkd_recycle_duplicates_all()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object('ok', false, 'reason', 'todo_recycle_duplicates_all');
end;
$$;

create or replace function public.dkd_shard_exchange(dkd_param_kind text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object('ok', false, 'reason', 'todo_shard_exchange');
end;
$$;

create or replace function public.dkd_shard_craft(dkd_param_rarity text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object('ok', false, 'reason', 'todo_shard_craft');
end;
$$;

create or replace function public.dkd_shard_upgrade_random(dkd_param_from_rarity text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object('ok', false, 'reason', 'todo_shard_upgrade_random');
end;
$$;

create or replace function public.dkd_craft_boss_ticket()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object('ok', false, 'reason', 'todo_craft_boss_ticket');
end;
$$;

-- ====================================================================
-- FILE: 013_secure_chest_manual_code.sql
-- ====================================================================

-- Lootonia DB Patch V13
-- Amaç:
-- 1) QR güvenli sandık açma RPC'si
-- 2) Manuel tek kullanımlık kod üretme / kullanma RPC'leri
-- 3) Boss secure chest RPC'si
-- 4) Cooldown + enerji + log + history uyumluluk katmanı
--
-- Önemli not:
-- Bu patch, public.dkd_profiles / public.dkd_drops / public.dkd_card_defs
-- ve tercihen public.dkd_loot_entries tablolarının zaten var olduğunu varsayar.
-- Gerçek 001 base schema hâlâ eksik olduğu için bu dosya bir "uyumluluk patch"idir.

create table if not exists public.dkd_user_drops (
  user_id uuid not null,
  drop_id uuid not null,
  last_opened_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, drop_id),
  constraint dkd_user_drops_drop_fk foreign key (drop_id) references public.dkd_drops(id) on delete cascade,
  constraint dkd_user_drops_profile_fk foreign key (user_id) references public.dkd_profiles(user_id) on delete cascade
);

alter table if exists public.dkd_user_drops
  add column if not exists last_opened_at timestamptz null;
alter table if exists public.dkd_user_drops
  add column if not exists created_at timestamptz not null default now();
alter table if exists public.dkd_user_drops
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_dkd_user_drops_last_opened_at on public.dkd_user_drops(last_opened_at desc);

create table if not exists public.dkd_drop_codes (
  code text primary key,
  user_id uuid not null,
  drop_id uuid not null,
  expires_at timestamptz not null,
  consumed_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint dkd_drop_codes_profile_fk foreign key (user_id) references public.dkd_profiles(user_id) on delete cascade,
  constraint dkd_drop_codes_drop_fk foreign key (drop_id) references public.dkd_drops(id) on delete cascade
);

create index if not exists idx_dkd_drop_codes_user on public.dkd_drop_codes(user_id, created_at desc);
create index if not exists idx_dkd_drop_codes_drop on public.dkd_drop_codes(drop_id, created_at desc);
create index if not exists idx_dkd_drop_codes_expires on public.dkd_drop_codes(expires_at);

create table if not exists public.dkd_chest_logs (
  id bigserial primary key,
  user_id uuid not null,
  drop_id uuid null,
  card_def_id integer null,
  gained_token integer not null default 0,
  drop_type text not null default 'map',
  source text not null default 'secure_open',
  created_at timestamptz not null default now(),
  constraint dkd_chest_logs_profile_fk foreign key (user_id) references public.dkd_profiles(user_id) on delete cascade,
  constraint dkd_chest_logs_drop_fk foreign key (drop_id) references public.dkd_drops(id) on delete set null,
  constraint dkd_chest_logs_card_fk foreign key (card_def_id) references public.dkd_card_defs(id) on delete set null
);

alter table if exists public.dkd_chest_logs
  add column if not exists user_id uuid null;
alter table if exists public.dkd_chest_logs
  add column if not exists drop_id uuid null;
alter table if exists public.dkd_chest_logs
  add column if not exists card_def_id integer null;
alter table if exists public.dkd_chest_logs
  add column if not exists gained_token integer not null default 0;
alter table if exists public.dkd_chest_logs
  add column if not exists drop_type text not null default 'map';
alter table if exists public.dkd_chest_logs
  add column if not exists source text not null default 'secure_open';
alter table if exists public.dkd_chest_logs
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_dkd_chest_logs_user_created on public.dkd_chest_logs(user_id, created_at desc);
create index if not exists idx_dkd_chest_logs_drop_created on public.dkd_chest_logs(drop_id, created_at desc);

create table if not exists public.dkd_chest_history (
  id bigserial primary key,
  user_id uuid not null,
  drop_id uuid null,
  drop_type text not null default 'map',
  card_def_id integer null,
  gained_token integer not null default 0,
  created_at timestamptz not null default now(),
  constraint dkd_chest_history_profile_fk foreign key (user_id) references public.dkd_profiles(user_id) on delete cascade,
  constraint dkd_chest_history_drop_fk foreign key (drop_id) references public.dkd_drops(id) on delete set null,
  constraint dkd_chest_history_card_fk foreign key (card_def_id) references public.dkd_card_defs(id) on delete set null
);

alter table if exists public.dkd_chest_history
  add column if not exists user_id uuid null;
alter table if exists public.dkd_chest_history
  add column if not exists drop_id uuid null;
alter table if exists public.dkd_chest_history
  add column if not exists drop_type text not null default 'map';
alter table if exists public.dkd_chest_history
  add column if not exists card_def_id integer null;
alter table if exists public.dkd_chest_history
  add column if not exists gained_token integer not null default 0;
alter table if exists public.dkd_chest_history
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_dkd_chest_history_user_created on public.dkd_chest_history(user_id, created_at desc);
create index if not exists idx_dkd_chest_history_user_drop_created on public.dkd_chest_history(user_id, drop_id, created_at desc);

create or replace function public.dkd__effective_energy(
  dkd_param_energy integer,
  dkd_param_energy_max integer,
  dkd_param_energy_updated_at timestamptz
)
returns integer
language sql
stable
set search_path = public
as $$
  select least(
    greatest(coalesce(dkd_param_energy_max, 0), 0),
    greatest(coalesce(dkd_param_energy, 0), 0)
    + floor(greatest(extract(epoch from (now() - coalesce(dkd_param_energy_updated_at, now()))), 0) / 60.0)::integer
  );
$$;

create or replace function public.dkd__distance_meters(
  dkd_param_user_lat double precision,
  dkd_param_user_lng double precision,
  dkd_param_drop_lat double precision,
  dkd_param_drop_lng double precision
)
returns double precision
language sql
immutable
set search_path = public
as $$
  select case
    when dkd_param_user_lat is null or dkd_param_user_lng is null or dkd_param_drop_lat is null or dkd_param_drop_lng is null then null
    else (
      6371000.0 * 2.0 * asin(
        sqrt(
          power(sin(radians((dkd_param_drop_lat - dkd_param_user_lat) / 2.0)), 2)
          + cos(radians(dkd_param_user_lat)) * cos(radians(dkd_param_drop_lat))
          * power(sin(radians((dkd_param_drop_lng - dkd_param_user_lng) / 2.0)), 2)
        )
      )
    )
  end;
$$;

create or replace function public.dkd__pick_card_def(
  dkd_param_drop_type text,
  dkd_param_boss_tier integer default 1
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_card_def_id integer;
  dkd_var_drop_type text := lower(coalesce(trim(dkd_param_drop_type), 'map'));
begin
  if to_regclass('public.dkd_loot_entries') is not null then
    if dkd_var_drop_type = 'boss' then
      select le.card_def_id
      into dkd_var_card_def_id
      from public.dkd_loot_entries le
      where le.card_def_id is not null
        and lower(coalesce(le.drop_type, '')) = 'boss'
        and (
          dkd_param_boss_tier <= 1 and lower(coalesce(le.rarity, 'common')) in ('common', 'rare', 'epic')
          or dkd_param_boss_tier = 2 and lower(coalesce(le.rarity, 'rare')) in ('rare', 'epic', 'legendary')
          or dkd_param_boss_tier >= 3 and lower(coalesce(le.rarity, 'epic')) in ('epic', 'legendary', 'mythic')
        )
      order by -ln(greatest(random(), 0.000001)) / greatest(le.weight, 0.000001)
      limit 1;
    else
      select le.card_def_id
      into dkd_var_card_def_id
      from public.dkd_loot_entries le
      where le.card_def_id is not null
        and lower(coalesce(le.drop_type, '')) in (dkd_var_drop_type, 'map', 'qr')
      order by
        case when lower(coalesce(le.drop_type, '')) = dkd_var_drop_type then 0 else 1 end,
        -ln(greatest(random(), 0.000001)) / greatest(le.weight, 0.000001)
      limit 1;
    end if;
  end if;

  if dkd_var_card_def_id is null and to_regclass('public.dkd_card_defs') is not null then
    if dkd_var_drop_type = 'boss' then
      select dkd_alias_c.id
      into dkd_var_card_def_id
      from public.dkd_card_defs dkd_alias_c
      where (
        dkd_param_boss_tier <= 1 and lower(coalesce(dkd_alias_c.rarity, 'common')) in ('common', 'rare', 'epic')
      ) or (
        dkd_param_boss_tier = 2 and lower(coalesce(dkd_alias_c.rarity, 'rare')) in ('rare', 'epic', 'legendary')
      ) or (
        dkd_param_boss_tier >= 3 and lower(coalesce(dkd_alias_c.rarity, 'epic')) in ('epic', 'legendary', 'mythic')
      )
      order by random()
      limit 1;
    else
      select dkd_alias_c.id
      into dkd_var_card_def_id
      from public.dkd_card_defs dkd_alias_c
      order by random()
      limit 1;
    end if;
  end if;

  return dkd_var_card_def_id;
end;
$$;

create or replace function public.dkd__log_chest_reward(
  dkd_param_user_id uuid,
  dkd_param_drop_id uuid,
  dkd_param_drop_type text,
  dkd_param_card_def_id integer,
  dkd_param_gained_token integer,
  dkd_param_source text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.dkd_chest_logs (
    user_id, drop_id, card_def_id, gained_token, drop_type, source, created_at
  )
  values (
    dkd_param_user_id,
    dkd_param_drop_id,
    dkd_param_card_def_id,
    greatest(coalesce(dkd_param_gained_token, 0), 0),
    lower(coalesce(dkd_param_drop_type, 'map')),
    lower(coalesce(dkd_param_source, 'secure_open')),
    now()
  );

  insert into public.dkd_chest_history (
    user_id, drop_id, drop_type, card_def_id, gained_token, created_at
  )
  values (
    dkd_param_user_id,
    dkd_param_drop_id,
    lower(coalesce(dkd_param_drop_type, 'map')),
    dkd_param_card_def_id,
    greatest(coalesce(dkd_param_gained_token, 0), 0),
    now()
  );
end;
$$;

create or replace function public.dkd_issue_drop_code(
  dkd_param_drop_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_user_id uuid;
  dkd_var_is_active boolean;
  dkd_var_code text;
  dkd_var_expires_at timestamptz;
begin
  dkd_var_user_id := auth.uid();

  if dkd_var_user_id is null then
    raise exception 'auth_required';
  end if;

  select d.is_active
  into dkd_var_is_active
  from public.dkd_drops d
  where d.id = dkd_param_drop_id;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'drop_not_found');
  end if;

  if not coalesce(dkd_var_is_active, false) then
    return jsonb_build_object('ok', false, 'reason', 'drop_inactive');
  end if;

  dkd_var_code := upper(substr(md5(random()::text || clock_timestamp()::text || dkd_param_drop_id::text || dkd_var_user_id::text), 1, 8));
  dkd_var_expires_at := now() + interval '5 minutes';

  insert into public.dkd_drop_codes (code, user_id, drop_id, expires_at)
  values (dkd_var_code, dkd_var_user_id, dkd_param_drop_id, dkd_var_expires_at)
  on conflict (code) do update
  set expires_at = excluded.expires_at,
      consumed_at = null,
      created_at = now();

  return jsonb_build_object(
    'ok', true,
    'code', dkd_var_code,
    'drop_id', dkd_param_drop_id,
    'expires_at', dkd_var_expires_at
  );
end;
$$;

create or replace function public.dkd_open_chest_secure(
  dkd_param_drop_id uuid,
  dkd_param_qr_secret text default null,
  dkd_param_lat double precision default null,
  dkd_param_lng double precision default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_user_id uuid;
  dkd_var_token integer;
  dkd_var_energy integer;
  dkd_var_energy_max integer;
  dkd_var_energy_updated_at timestamptz;
  dkd_var_effective_energy integer;
  dkd_var_drop record;
  dkd_var_last_opened_at timestamptz;
  dkd_var_next_open_at timestamptz;
  dkd_var_distance_m double precision;
  dkd_var_card_def_id integer;
  dkd_var_token_gain integer;
begin
  dkd_var_user_id := auth.uid();
  if dkd_var_user_id is null then
    raise exception 'auth_required';
  end if;

  select
    coalesce(token, 0),
    greatest(coalesce(energy, 0), 0),
    greatest(coalesce(energy_max, 0), 0),
    coalesce(energy_updated_at, now())
  into dkd_var_token, dkd_var_energy, dkd_var_energy_max, dkd_var_energy_updated_at
  from public.dkd_profiles
  where user_id = dkd_var_user_id
  for update;

  if not found then
    raise exception 'profile_not_found';
  end if;

  select *
  into dkd_var_drop
  from public.dkd_drops d
  where d.id = dkd_param_drop_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'drop_not_found');
  end if;

  if not coalesce(dkd_var_drop.is_active, false) then
    return jsonb_build_object('ok', false, 'reason', 'drop_inactive');
  end if;

  if lower(coalesce(dkd_var_drop.type, 'map')) = 'qr' then
    if nullif(trim(coalesce(dkd_param_qr_secret, '')), '') is null then
      return jsonb_build_object('ok', false, 'reason', 'qr_secret_required');
    end if;
    if coalesce(dkd_var_drop.qr_secret, '') <> trim(dkd_param_qr_secret) then
      return jsonb_build_object('ok', false, 'reason', 'qr_secret_invalid');
    end if;
  end if;

  dkd_var_distance_m := public.dkd__distance_meters(dkd_param_lat, dkd_param_lng, dkd_var_drop.lat, dkd_var_drop.lng);
  if dkd_var_distance_m is not null and dkd_var_drop.radius_m is not null and dkd_var_distance_m > (dkd_var_drop.radius_m + 8) then
    return jsonb_build_object(
      'ok', false,
      'reason', 'too_far',
      'distance_m', round(dkd_var_distance_m),
      'radius_m', dkd_var_drop.radius_m
    );
  end if;

  select ud.last_opened_at
  into dkd_var_last_opened_at
  from public.dkd_user_drops ud
  where ud.user_id = dkd_var_user_id
    and ud.drop_id = dkd_param_drop_id
  for update;

  if dkd_var_last_opened_at is not null and coalesce(dkd_var_drop.cooldown_seconds, 0) > 0 then
    dkd_var_next_open_at := dkd_var_last_opened_at + make_interval(secs => greatest(coalesce(dkd_var_drop.cooldown_seconds, 0), 0));
    if dkd_var_next_open_at > now() then
      return jsonb_build_object(
        'ok', false,
        'reason', 'cooldown',
        'next_open_at', dkd_var_next_open_at
      );
    end if;
  end if;

  dkd_var_effective_energy := public.dkd__effective_energy(dkd_var_energy, dkd_var_energy_max, dkd_var_energy_updated_at);
  if dkd_var_effective_energy < 1 then
    return jsonb_build_object(
      'ok', false,
      'reason', 'energy_empty',
      'energy', dkd_var_effective_energy,
      'energy_max', dkd_var_energy_max
    );
  end if;

  dkd_var_card_def_id := public.dkd__pick_card_def(lower(coalesce(dkd_var_drop.type, 'map')), 1);
  dkd_var_token_gain := case lower(coalesce(dkd_var_drop.type, 'map'))
    when 'qr' then 18 + floor(random() * 10)::integer
    when 'cafe' then 14 + floor(random() * 8)::integer
    when 'restaurant' then 16 + floor(random() * 10)::integer
    when 'metro' then 12 + floor(random() * 8)::integer
    when 'park' then 12 + floor(random() * 7)::integer
    when 'mall' then 15 + floor(random() * 9)::integer
    else 10 + floor(random() * 9)::integer
  end;

  update public.dkd_profiles
  set
    token = coalesce(token, 0) + dkd_var_token_gain,
    energy = greatest(dkd_var_effective_energy - 1, 0),
    energy_updated_at = now()
  where user_id = dkd_var_user_id;

  insert into public.dkd_user_cards (user_id, card_def_id, source)
  select dkd_var_user_id, dkd_var_card_def_id, 'secure_open'
  where dkd_var_card_def_id is not null;

  insert into public.dkd_user_drops (user_id, drop_id, last_opened_at, updated_at)
  values (dkd_var_user_id, dkd_param_drop_id, now(), now())
  on conflict (user_id, drop_id) do update
  set last_opened_at = excluded.last_opened_at,
      updated_at = now();

  perform public.dkd__log_chest_reward(
    dkd_var_user_id,
    dkd_param_drop_id,
    lower(coalesce(dkd_var_drop.type, 'map')),
    dkd_var_card_def_id,
    dkd_var_token_gain,
    'secure_open'
  );

  return jsonb_build_object(
    'ok', true,
    'drop_type', lower(coalesce(dkd_var_drop.type, 'map')),
    'token', dkd_var_token_gain,
    'token_mult', 1,
    'card_def_id', dkd_var_card_def_id
  );
end;
$$;

create or replace function public.dkd_open_chest_by_code(
  dkd_param_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_user_id uuid;
  dkd_var_row record;
  dkd_var_token integer;
  dkd_var_energy integer;
  dkd_var_energy_max integer;
  dkd_var_energy_updated_at timestamptz;
  dkd_var_effective_energy integer;
  dkd_var_drop record;
  dkd_var_last_opened_at timestamptz;
  dkd_var_next_open_at timestamptz;
  dkd_var_card_def_id integer;
  dkd_var_token_gain integer;
begin
  dkd_var_user_id := auth.uid();
  if dkd_var_user_id is null then
    raise exception 'auth_required';
  end if;

  select *
  into dkd_var_row
  from public.dkd_drop_codes dkd_alias_c
  where dkd_alias_c.code = upper(trim(coalesce(dkd_param_code, '')))
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'code_not_found');
  end if;

  if dkd_var_row.user_id <> dkd_var_user_id then
    return jsonb_build_object('ok', false, 'reason', 'code_user_mismatch');
  end if;

  if dkd_var_row.consumed_at is not null then
    return jsonb_build_object('ok', false, 'reason', 'code_already_used');
  end if;

  if dkd_var_row.expires_at <= now() then
    return jsonb_build_object('ok', false, 'reason', 'code_expired');
  end if;

  select
    coalesce(token, 0),
    greatest(coalesce(energy, 0), 0),
    greatest(coalesce(energy_max, 0), 0),
    coalesce(energy_updated_at, now())
  into dkd_var_token, dkd_var_energy, dkd_var_energy_max, dkd_var_energy_updated_at
  from public.dkd_profiles
  where user_id = dkd_var_user_id
  for update;

  if not found then
    raise exception 'profile_not_found';
  end if;

  select *
  into dkd_var_drop
  from public.dkd_drops d
  where d.id = dkd_var_row.drop_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'drop_not_found');
  end if;

  if not coalesce(dkd_var_drop.is_active, false) then
    return jsonb_build_object('ok', false, 'reason', 'drop_inactive');
  end if;

  select ud.last_opened_at
  into dkd_var_last_opened_at
  from public.dkd_user_drops ud
  where ud.user_id = dkd_var_user_id
    and ud.drop_id = dkd_var_row.drop_id
  for update;

  if dkd_var_last_opened_at is not null and coalesce(dkd_var_drop.cooldown_seconds, 0) > 0 then
    dkd_var_next_open_at := dkd_var_last_opened_at + make_interval(secs => greatest(coalesce(dkd_var_drop.cooldown_seconds, 0), 0));
    if dkd_var_next_open_at > now() then
      return jsonb_build_object(
        'ok', false,
        'reason', 'cooldown',
        'next_open_at', dkd_var_next_open_at
      );
    end if;
  end if;

  dkd_var_effective_energy := public.dkd__effective_energy(dkd_var_energy, dkd_var_energy_max, dkd_var_energy_updated_at);
  if dkd_var_effective_energy < 1 then
    return jsonb_build_object(
      'ok', false,
      'reason', 'energy_empty',
      'energy', dkd_var_effective_energy,
      'energy_max', dkd_var_energy_max
    );
  end if;

  dkd_var_card_def_id := public.dkd__pick_card_def(lower(coalesce(dkd_var_drop.type, 'map')), 1);
  dkd_var_token_gain := case lower(coalesce(dkd_var_drop.type, 'map'))
    when 'qr' then 18 + floor(random() * 10)::integer
    when 'cafe' then 14 + floor(random() * 8)::integer
    when 'restaurant' then 16 + floor(random() * 10)::integer
    when 'metro' then 12 + floor(random() * 8)::integer
    when 'park' then 12 + floor(random() * 7)::integer
    when 'mall' then 15 + floor(random() * 9)::integer
    else 10 + floor(random() * 9)::integer
  end;

  update public.dkd_profiles
  set
    token = coalesce(token, 0) + dkd_var_token_gain,
    energy = greatest(dkd_var_effective_energy - 1, 0),
    energy_updated_at = now()
  where user_id = dkd_var_user_id;

  insert into public.dkd_user_cards (user_id, card_def_id, source)
  select dkd_var_user_id, dkd_var_card_def_id, 'code_open'
  where dkd_var_card_def_id is not null;

  insert into public.dkd_user_drops (user_id, drop_id, last_opened_at, updated_at)
  values (dkd_var_user_id, dkd_var_row.drop_id, now(), now())
  on conflict (user_id, drop_id) do update
  set last_opened_at = excluded.last_opened_at,
      updated_at = now();

  update public.dkd_drop_codes
  set consumed_at = now()
  where code = dkd_var_row.code;

  perform public.dkd__log_chest_reward(
    dkd_var_user_id,
    dkd_var_row.drop_id,
    lower(coalesce(dkd_var_drop.type, 'map')),
    dkd_var_card_def_id,
    dkd_var_token_gain,
    'code_open'
  );

  return jsonb_build_object(
    'ok', true,
    'drop_type', lower(coalesce(dkd_var_drop.type, 'map')),
    'token', dkd_var_token_gain,
    'token_mult', 1,
    'card_def_id', dkd_var_card_def_id
  );
end;
$$;

create or replace function public.dkd_open_boss_chest_secure(
  dkd_param_drop_id uuid,
  dkd_param_tier integer default 1,
  dkd_param_correct integer default 0,
  dkd_param_total integer default 0,
  dkd_param_lat double precision default null,
  dkd_param_lng double precision default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_user_id uuid;
  dkd_var_token integer;
  dkd_var_energy integer;
  dkd_var_energy_max integer;
  dkd_var_energy_updated_at timestamptz;
  dkd_var_effective_energy integer;
  dkd_var_drop record;
  dkd_var_last_opened_at timestamptz;
  dkd_var_next_open_at timestamptz;
  dkd_var_distance_m double precision;
  dkd_var_card_def_id integer;
  dkd_var_token_gain integer;
  dkd_var_mult integer;
  dkd_var_tier integer := greatest(coalesce(dkd_param_tier, 1), 1);
  dkd_var_correct integer := greatest(coalesce(dkd_param_correct, 0), 0);
  dkd_var_total integer := greatest(coalesce(dkd_param_total, 0), 0);
begin
  dkd_var_user_id := auth.uid();
  if dkd_var_user_id is null then
    raise exception 'auth_required';
  end if;

  select
    coalesce(token, 0),
    greatest(coalesce(energy, 0), 0),
    greatest(coalesce(energy_max, 0), 0),
    coalesce(energy_updated_at, now())
  into dkd_var_token, dkd_var_energy, dkd_var_energy_max, dkd_var_energy_updated_at
  from public.dkd_profiles
  where user_id = dkd_var_user_id
  for update;

  if not found then
    raise exception 'profile_not_found';
  end if;

  select *
  into dkd_var_drop
  from public.dkd_drops d
  where d.id = dkd_param_drop_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'drop_not_found');
  end if;

  if not coalesce(dkd_var_drop.is_active, false) then
    return jsonb_build_object('ok', false, 'reason', 'drop_inactive');
  end if;

  dkd_var_distance_m := public.dkd__distance_meters(dkd_param_lat, dkd_param_lng, dkd_var_drop.lat, dkd_var_drop.lng);
  if dkd_var_distance_m is not null and dkd_var_drop.radius_m is not null and dkd_var_distance_m > (dkd_var_drop.radius_m + 10) then
    return jsonb_build_object(
      'ok', false,
      'reason', 'too_far',
      'distance_m', round(dkd_var_distance_m),
      'radius_m', dkd_var_drop.radius_m
    );
  end if;

  select ud.last_opened_at
  into dkd_var_last_opened_at
  from public.dkd_user_drops ud
  where ud.user_id = dkd_var_user_id
    and ud.drop_id = dkd_param_drop_id
  for update;

  if dkd_var_last_opened_at is not null and coalesce(dkd_var_drop.cooldown_seconds, 0) > 0 then
    dkd_var_next_open_at := dkd_var_last_opened_at + make_interval(secs => greatest(coalesce(dkd_var_drop.cooldown_seconds, 0), 0));
    if dkd_var_next_open_at > now() then
      return jsonb_build_object(
        'ok', false,
        'reason', 'cooldown',
        'next_open_at', dkd_var_next_open_at
      );
    end if;
  end if;

  dkd_var_effective_energy := public.dkd__effective_energy(dkd_var_energy, dkd_var_energy_max, dkd_var_energy_updated_at);
  if dkd_var_effective_energy < 1 then
    return jsonb_build_object(
      'ok', false,
      'reason', 'energy_empty',
      'energy', dkd_var_effective_energy,
      'energy_max', dkd_var_energy_max
    );
  end if;

  dkd_var_mult := case
    when dkd_var_total > 0 and dkd_var_correct >= dkd_var_total then 3
    when dkd_var_correct >= greatest(dkd_var_total - 1, 1) then 2
    else 1
  end;

  dkd_var_card_def_id := public.dkd__pick_card_def('boss', dkd_var_tier);
  dkd_var_token_gain := (30 + (dkd_var_tier * 10) + floor(random() * 16)::integer) * dkd_var_mult;

  update public.dkd_profiles
  set
    token = coalesce(token, 0) + dkd_var_token_gain,
    energy = greatest(dkd_var_effective_energy - 1, 0),
    energy_updated_at = now()
  where user_id = dkd_var_user_id;

  insert into public.dkd_user_cards (user_id, card_def_id, source)
  select dkd_var_user_id, dkd_var_card_def_id, 'boss_open'
  where dkd_var_card_def_id is not null;

  insert into public.dkd_user_drops (user_id, drop_id, last_opened_at, updated_at)
  values (dkd_var_user_id, dkd_param_drop_id, now(), now())
  on conflict (user_id, drop_id) do update
  set last_opened_at = excluded.last_opened_at,
      updated_at = now();

  perform public.dkd__log_chest_reward(
    dkd_var_user_id,
    dkd_param_drop_id,
    'boss',
    dkd_var_card_def_id,
    dkd_var_token_gain,
    'boss_open'
  );

  return jsonb_build_object(
    'ok', true,
    'drop_type', 'boss',
    'token', dkd_var_token_gain,
    'token_mult', dkd_var_mult,
    'card_def_id', dkd_var_card_def_id,
    'tier', dkd_var_tier,
    'correct', dkd_var_correct,
    'total', dkd_var_total
  );
end;
$$;

revoke all on function public.dkd__effective_energy(integer, integer, timestamptz) from public;
revoke all on function public.dkd__distance_meters(double precision, double precision, double precision, double precision) from public;
revoke all on function public.dkd__pick_card_def(text, integer) from public;
revoke all on function public.dkd__log_chest_reward(uuid, uuid, text, integer, integer, text) from public;

revoke all on function public.dkd_issue_drop_code(uuid) from public;
grant execute on function public.dkd_issue_drop_code(uuid) to authenticated;

revoke all on function public.dkd_open_chest_secure(uuid, text, double precision, double precision) from public;
grant execute on function public.dkd_open_chest_secure(uuid, text, double precision, double precision) to authenticated;

revoke all on function public.dkd_open_chest_by_code(text) from public;
grant execute on function public.dkd_open_chest_by_code(text) to authenticated;

revoke all on function public.dkd_open_boss_chest_secure(uuid, integer, integer, integer, double precision, double precision) from public;
grant execute on function public.dkd_open_boss_chest_secure(uuid, integer, integer, integer, double precision, double precision) to authenticated;

-- ====================================================================
-- FILE: 014_task_claim_system.sql
-- ====================================================================

-- 013_task_claim_system.sql
-- TODO: frontend sabitleri ile DB görev ödülleri birebir eşleştirilmeli.

create or replace function public.dkd_task_claim(
  dkd_param_task_key text,
  dkd_param_mult numeric default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object('ok', false, 'reason', 'todo_task_claim');
end;
$$;

create or replace function public.dkd_weekly_task_claim(
  dkd_param_task_key text,
  dkd_param_mult numeric default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object('ok', false, 'reason', 'todo_weekly_task_claim');
end;
$$;

-- ====================================================================
-- FILE: 015_leaderboard_system.sql
-- ====================================================================

-- 014_leaderboard_system.sql
-- TODO: metric hesap formülü, weekly close snapshot ve reward dağıtımı tamamlanmalı.

create or replace function public.dkd_get_weekly_leaderboard2(
  dkd_param_metric text default 'token',
  dkd_param_limit integer default 25,
  dkd_param_week_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object('week_start', null, 'closed', false, 'rows', '[]'::jsonb);
end;
$$;

create or replace function public.dkd_admin_close_week(
  dkd_param_week_offset integer default -1,
  dkd_param_limit integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.dkd_is_admin() then
    raise exception 'not_admin';
  end if;
  return jsonb_build_object('ok', false, 'reason', 'todo_admin_close_week');
end;
$$;

create or replace function public.dkd_claim_weekly_top_reward(dkd_param_metric text default 'token')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object('ok', false, 'reason', 'todo_claim_weekly_top_reward');
end;
$$;

-- ====================================================================
-- FILE: 016_history_compat.sql
-- ====================================================================

-- 015_history_compat.sql
create or replace view public.dkd_chest_logs as
select
  ch.id,
  ch.user_id,
  ch.drop_id,
  ch.card_def_id,
  ch.drop_type,
  ch.gained_token,
  ch.gained_shards,
  ch.token_mult,
  ch.source,
  ch.created_at
from public.dkd_chest_history ch;

-- ====================================================================
-- FILE: 017_admin_broadcast_foundation.sql
-- ====================================================================

begin;

create table if not exists public.dkd_announcements (
  id bigint generated by default as identity primary key,
  title text not null,
  body text not null,
  sender_label text not null default 'DrabornEagle',
  starts_at timestamptz not null default now(),
  expires_at timestamptz null,
  is_active boolean not null default true,
  created_by uuid null,
  created_at timestamptz not null default now()
);

create index if not exists idx_dkd_announcements_active
  on public.dkd_announcements (is_active, starts_at desc);

create index if not exists idx_dkd_announcements_expires
  on public.dkd_announcements (expires_at);

create or replace function public.dkd_admin_broadcast_create(
  dkd_param_title text,
  dkd_param_body text,
  dkd_param_sender_label text default 'DrabornEagle',
  dkd_param_minutes integer default 120
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_user_id uuid;
  dkd_var_id bigint;
  dkd_var_minutes integer;
begin
  dkd_var_user_id := auth.uid();
  if dkd_var_user_id is null then
    raise exception 'auth_required';
  end if;

  if coalesce(public.dkd_is_admin(), false) is not true then
    raise exception 'admin_required';
  end if;

  if char_length(trim(coalesce(dkd_param_title, ''))) < 3 then
    raise exception 'title_too_short';
  end if;

  if char_length(trim(coalesce(dkd_param_body, ''))) < 6 then
    raise exception 'body_too_short';
  end if;

  dkd_var_minutes := greatest(5, least(coalesce(dkd_param_minutes, 120), 10080));

  insert into public.dkd_announcements (
    title,
    body,
    sender_label,
    starts_at,
    expires_at,
    is_active,
    created_by,
    created_at
  ) values (
    trim(dkd_param_title),
    trim(dkd_param_body),
    coalesce(nullif(trim(dkd_param_sender_label), ''), 'DrabornEagle'),
    now(),
    now() + make_interval(mins => dkd_var_minutes),
    true,
    dkd_var_user_id,
    now()
  )
  returning id into dkd_var_id;

  return dkd_var_id;
end;
$$;

revoke all on function public.dkd_admin_broadcast_create(text, text, text, integer) from public;
grant execute on function public.dkd_admin_broadcast_create(text, text, text, integer) to authenticated;

create or replace function public.dkd_get_active_announcements(
  dkd_param_limit integer default 5
)
returns table (
  id bigint,
  title text,
  body text,
  sender_label text,
  created_at timestamptz,
  starts_at timestamptz,
  expires_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select dkd_alias_a.id,
         dkd_alias_a.title,
         dkd_alias_a.body,
         dkd_alias_a.sender_label,
         dkd_alias_a.created_at,
         dkd_alias_a.starts_at,
         dkd_alias_a.expires_at
  from public.dkd_announcements dkd_alias_a
  where dkd_alias_a.is_active = true
    and dkd_alias_a.starts_at <= now()
    and (dkd_alias_a.expires_at is null or dkd_alias_a.expires_at > now())
  order by dkd_alias_a.id desc
  limit greatest(1, least(coalesce(dkd_param_limit, 5), 50));
$$;

revoke all on function public.dkd_get_active_announcements(integer) from public;
grant execute on function public.dkd_get_active_announcements(integer) to authenticated;

commit;

-- ====================================================================
-- FILE: 018_push_broadcast_foundation.sql
-- ====================================================================

create extension if not exists pgcrypto;

create table if not exists public.dkd_push_tokens (
  id bigint generated by default as identity primary key,
  user_id uuid not null,
  expo_push_token text not null unique,
  platform text,
  app_mode text,
  device_name text,
  is_active boolean not null default true,
  last_seen_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists dkd_push_tokens_user_idx on public.dkd_push_tokens(user_id);
create index if not exists dkd_push_tokens_active_idx on public.dkd_push_tokens(is_active);

alter table public.dkd_push_tokens enable row level security;

do $$ begin
  create policy "own push tokens select" on public.dkd_push_tokens
    for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "own push tokens insert" on public.dkd_push_tokens
    for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "own push tokens update" on public.dkd_push_tokens
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "own push tokens delete" on public.dkd_push_tokens
    for delete using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

create table if not exists public.dkd_admin_broadcasts (
  id bigint generated by default as identity primary key,
  sender_name text not null default 'DrabornEagle',
  title text not null,
  body text not null,
  sent_by uuid not null,
  delivery_mode text not null default 'expo_push',
  status text not null default 'pending',
  total_targets integer not null default 0,
  total_sent integer not null default 0,
  total_failed integer not null default 0,
  last_error text,
  created_at timestamptz not null default timezone('utc', now()),
  sent_at timestamptz
);

alter table public.dkd_admin_broadcasts enable row level security;

do $$ begin
  create policy "admin broadcast deny direct" on public.dkd_admin_broadcasts
    for all using (false) with check (false);
exception when duplicate_object then null; end $$;

create or replace function public.dkd_upsert_push_token(
  dkd_param_token text,
  dkd_param_platform text default null,
  dkd_param_app_mode text default null,
  dkd_param_device_name text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_uid uuid := auth.uid();
  dkd_var_token text := nullif(trim(coalesce(dkd_param_token, '')), '');
begin
  if dkd_var_uid is null then
    raise exception 'auth_required';
  end if;
  if dkd_var_token is null then
    raise exception 'token_required';
  end if;

  insert into public.dkd_push_tokens (user_id, expo_push_token, platform, app_mode, device_name, is_active, last_seen_at, updated_at)
  values (dkd_var_uid, dkd_var_token, nullif(trim(coalesce(dkd_param_platform, '')), ''), nullif(trim(coalesce(dkd_param_app_mode, '')), ''), nullif(trim(coalesce(dkd_param_device_name, '')), ''), true, timezone('utc', now()), timezone('utc', now()))
  on conflict (expo_push_token)
  do update set
    user_id = excluded.user_id,
    platform = excluded.platform,
    app_mode = excluded.app_mode,
    device_name = excluded.device_name,
    is_active = true,
    last_seen_at = timezone('utc', now()),
    updated_at = timezone('utc', now());
end;
$$;

grant execute on function public.dkd_upsert_push_token(text, text, text, text) to authenticated;

create or replace function public.dkd_disable_push_token(dkd_param_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_uid uuid := auth.uid();
begin
  if dkd_var_uid is null then
    raise exception 'auth_required';
  end if;

  update public.dkd_push_tokens
     set is_active = false,
         updated_at = timezone('utc', now())
   where user_id = dkd_var_uid
     and expo_push_token = trim(coalesce(dkd_param_token, ''));
end;
$$;

grant execute on function public.dkd_disable_push_token(text) to authenticated;

create or replace function public.dkd_admin_queue_broadcast(
  dkd_param_title text,
  dkd_param_body text,
  dkd_param_sender_name text default 'DrabornEagle'
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_uid uuid := auth.uid();
  dkd_var_id bigint;
begin
  if dkd_var_uid is null then
    raise exception 'auth_required';
  end if;
  if not coalesce(public.dkd_is_admin(), false) then
    raise exception 'admin_required';
  end if;
  if nullif(trim(coalesce(dkd_param_title, '')), '') is null then
    raise exception 'title_required';
  end if;
  if nullif(trim(coalesce(dkd_param_body, '')), '') is null then
    raise exception 'body_required';
  end if;

  insert into public.dkd_admin_broadcasts(sender_name, title, body, sent_by)
  values (
    coalesce(nullif(trim(coalesce(dkd_param_sender_name, '')), ''), 'DrabornEagle'),
    trim(dkd_param_title),
    trim(dkd_param_body),
    dkd_var_uid
  )
  returning id into dkd_var_id;

  return dkd_var_id;
end;
$$;

grant execute on function public.dkd_admin_queue_broadcast(text, text, text) to authenticated;

create or replace function public.dkd_admin_list_active_push_tokens()
returns table(expo_push_token text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;
  if not coalesce(public.dkd_is_admin(), false) then
    raise exception 'admin_required';
  end if;

  return query
  select dkd_alias_t.expo_push_token
    from public.dkd_push_tokens dkd_alias_t
   where dkd_alias_t.is_active = true
     and dkd_alias_t.expo_push_token is not null
   order by dkd_alias_t.id desc;
end;
$$;

grant execute on function public.dkd_admin_list_active_push_tokens() to authenticated;

create or replace function public.dkd_admin_complete_broadcast(
  dkd_param_broadcast_id bigint,
  dkd_param_total_targets integer,
  dkd_param_total_sent integer,
  dkd_param_total_failed integer,
  dkd_param_last_error text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;
  if not coalesce(public.dkd_is_admin(), false) then
    raise exception 'admin_required';
  end if;

  update public.dkd_admin_broadcasts
     set total_targets = greatest(0, coalesce(dkd_param_total_targets, 0)),
         total_sent = greatest(0, coalesce(dkd_param_total_sent, 0)),
         total_failed = greatest(0, coalesce(dkd_param_total_failed, 0)),
         status = case when coalesce(dkd_param_total_failed, 0) > 0 then 'partial' else 'sent' end,
         sent_at = timezone('utc', now()),
         last_error = nullif(trim(coalesce(dkd_param_last_error, '')), '')
   where id = dkd_param_broadcast_id;
end;
$$;

grant execute on function public.dkd_admin_complete_broadcast(bigint, integer, integer, integer, text) to authenticated;

-- ====================================================================
-- FILE: 019_push_deeplink_segment_hotfix.sql
-- ====================================================================

alter table public.dkd_admin_broadcasts
  add column if not exists audience text not null default 'everyone',
  add column if not exists target_screen text not null default 'map';

create or replace function public.dkd_admin_queue_broadcast(
  dkd_param_title text,
  dkd_param_body text,
  dkd_param_sender_name text default 'DrabornEagle',
  dkd_param_audience text default 'everyone',
  dkd_param_target_screen text default 'map'
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_uid uuid := auth.uid();
  dkd_var_id bigint;
  dkd_var_audience text := lower(coalesce(nullif(trim(coalesce(dkd_param_audience, '')), ''), 'everyone'));
  dkd_var_target_screen text := lower(coalesce(nullif(trim(coalesce(dkd_param_target_screen, '')), ''), 'map'));
begin
  if dkd_var_uid is null then
    raise exception 'auth_required';
  end if;
  if not coalesce(public.dkd_is_admin(), false) then
    raise exception 'admin_required';
  end if;
  if nullif(trim(coalesce(dkd_param_title, '')), '') is null then
    raise exception 'title_required';
  end if;
  if nullif(trim(coalesce(dkd_param_body, '')), '') is null then
    raise exception 'body_required';
  end if;

  if dkd_var_audience not in ('everyone', 'new', 'courier', 'admin') then
    dkd_var_audience := 'everyone';
  end if;

  if dkd_var_target_screen not in ('map', 'tasks', 'leader', 'market', 'collection', 'courier', 'admin', 'scanner') then
    dkd_var_target_screen := 'map';
  end if;

  insert into public.dkd_admin_broadcasts(sender_name, title, body, sent_by, audience, target_screen)
  values (
    coalesce(nullif(trim(coalesce(dkd_param_sender_name, '')), ''), 'DrabornEagle'),
    trim(dkd_param_title),
    trim(dkd_param_body),
    dkd_var_uid,
    dkd_var_audience,
    dkd_var_target_screen
  )
  returning id into dkd_var_id;

  return dkd_var_id;
end;
$$;

grant execute on function public.dkd_admin_queue_broadcast(text, text, text, text, text) to authenticated;

create or replace function public.dkd_admin_list_active_push_tokens(dkd_param_audience text default 'everyone')
returns table(expo_push_token text)
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_audience text := lower(coalesce(nullif(trim(coalesce(dkd_param_audience, '')), ''), 'everyone'));
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;
  if not coalesce(public.dkd_is_admin(), false) then
    raise exception 'admin_required';
  end if;

  if dkd_var_audience = 'new' then
    return query
    select dkd_alias_t.expo_push_token
      from public.dkd_push_tokens dkd_alias_t
      join public.dkd_profiles dkd_alias_p on dkd_alias_p.user_id = dkd_alias_t.user_id
     where dkd_alias_t.is_active = true
       and dkd_alias_t.expo_push_token is not null
       and greatest(coalesce(dkd_alias_p.level, 1), 1) <= 2
     order by dkd_alias_t.id desc;
    return;
  end if;

  if dkd_var_audience = 'courier' then
    return query
    select dkd_alias_t.expo_push_token
      from public.dkd_push_tokens dkd_alias_t
      join public.dkd_profiles dkd_alias_p on dkd_alias_p.user_id = dkd_alias_t.user_id
     where dkd_alias_t.is_active = true
       and dkd_alias_t.expo_push_token is not null
       and coalesce(dkd_alias_p.courier_status, 'none') in ('approved', 'active')
     order by dkd_alias_t.id desc;
    return;
  end if;

  if dkd_var_audience = 'admin' then
    return query
    select dkd_alias_t.expo_push_token
      from public.dkd_push_tokens dkd_alias_t
      join auth.users dkd_alias_u on dkd_alias_u.id = dkd_alias_t.user_id
     where dkd_alias_t.is_active = true
       and dkd_alias_t.expo_push_token is not null
       and (
         coalesce(dkd_alias_u.raw_app_meta_data ->> 'role', '') = 'admin'
         or coalesce(dkd_alias_u.raw_user_meta_data ->> 'role', '') = 'admin'
         or coalesce(dkd_alias_u.raw_app_meta_data ->> 'is_admin', '') = 'true'
         or coalesce(dkd_alias_u.raw_user_meta_data ->> 'is_admin', '') = 'true'
       )
     order by dkd_alias_t.id desc;
    return;
  end if;

  return query
  select dkd_alias_t.expo_push_token
    from public.dkd_push_tokens dkd_alias_t
   where dkd_alias_t.is_active = true
     and dkd_alias_t.expo_push_token is not null
   order by dkd_alias_t.id desc;
end;
$$;

grant execute on function public.dkd_admin_list_active_push_tokens(text) to authenticated;
