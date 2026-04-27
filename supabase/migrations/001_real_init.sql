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

create trigger trg_dkd_profiles_updated_at
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

create trigger trg_dkd_drops_updated_at
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

create trigger trg_dkd_user_drops_updated_at
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

create trigger trg_dkd_card_defs_updated_at
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

create trigger trg_dkd_loot_entries_updated_at
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

create trigger trg_dkd_market_listings_updated_at
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
