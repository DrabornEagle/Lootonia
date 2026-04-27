begin;

insert into public.dkd_businesses (slug, name, category, city, address_text, sponsor_name, is_active)
select
  'skyline-burger-demo',
  'Skyline Burger Demo',
  'food',
  'Ankara',
  'Kızılay Demo Noktası',
  'Skyline Foods',
  true
where not exists (
  select 1 from public.dkd_businesses where slug = 'skyline-burger-demo'
);

with demo_business as (
  select id from public.dkd_businesses where slug = 'skyline-burger-demo' limit 1
),
candidate_drops as (
  select id, row_number() over (order by created_at asc nulls last, id asc) as rn
  from public.dkd_drops
  where coalesce(is_active, true) = true
  limit 3
)
insert into public.dkd_business_drop_links (business_id, drop_id, is_primary)
select
  dkd_alias_b.id,
  d.id,
  (d.rn = 1)
from demo_business dkd_alias_b
join candidate_drops d on true
where not exists (
  select 1
  from public.dkd_business_drop_links dkd_alias_x
  where dkd_alias_x.drop_id = d.id
);

insert into public.dkd_business_campaigns (
  business_id,
  title,
  sponsor_name,
  stock_limit,
  redeemed_count,
  starts_at,
  ends_at,
  closes_at,
  is_active
)
select
  dkd_alias_b.id,
  'Öğle Yoğunluğu Demo Kampanyası',
  'Skyline Foods',
  50,
  0,
  now(),
  now() + interval '1 day',
  date_trunc('day', now()) + interval '23 hours',
  true
from public.dkd_businesses dkd_alias_b
where dkd_alias_b.slug = 'skyline-burger-demo'
and not exists (
  select 1
  from public.dkd_business_campaigns dkd_alias_c
  where dkd_alias_c.business_id = dkd_alias_b.id
    and dkd_alias_c.title = 'Öğle Yoğunluğu Demo Kampanyası'
);

commit;
