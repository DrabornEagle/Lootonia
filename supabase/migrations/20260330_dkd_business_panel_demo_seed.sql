begin;

insert into public.dkd_businesses (
  business_key,
  name,
  slug,
  category,
  address_text,
  lat,
  lng,
  radius_m,
  is_active,
  sponsor_enabled,
  opens_at,
  closes_at,
  stock_alert_threshold
)
select
  'lootonia-demo-ankara',
  'Lootonia Demo Ankara',
  'lootonia-demo-ankara',
  'cafe',
  'Kavaklıdere / Ankara',
  39.92077,
  32.85411,
  90,
  true,
  true,
  '09:00'::time,
  '23:00'::time,
  8
where not exists (
  select 1 from public.dkd_businesses where business_key = 'lootonia-demo-ankara'
);

insert into public.dkd_business_campaigns (
  business_id,
  campaign_key,
  title,
  subtitle,
  task_key,
  source_kind,
  starts_at,
  closes_at,
  stock_total,
  stock_left,
  coupon_reward_label,
  coupon_code_prefix,
  is_active,
  auto_close_on_stock_zero
)
select
  dkd_business.id,
  'lootonia-demo-ankara-aksam-burst',
  'Akşam Burst Kampanyası',
  '18:00 sonrası QR okut, ücretsiz ürün kuponu kazan.',
  'sponsor_burst',
  'sponsor',
  now(),
  '22:00'::time,
  50,
  50,
  '1 içecek',
  'YL',
  true,
  true
from public.dkd_businesses dkd_business
where dkd_business.business_key = 'lootonia-demo-ankara'
  and not exists (
    select 1
    from public.dkd_business_campaigns dkd_campaign
    where dkd_campaign.campaign_key = 'lootonia-demo-ankara-aksam-burst'
  );

commit;
