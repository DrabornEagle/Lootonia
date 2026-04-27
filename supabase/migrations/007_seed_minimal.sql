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
